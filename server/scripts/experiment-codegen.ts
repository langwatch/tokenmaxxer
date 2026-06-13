/**
 * Codegen speed-vs-quality benchmark across the full page-model registry
 * (chatjimmy, gemini-flash, haiku, inworld-gemma, gpt-4.1-mini). Logs
 * latency, validity and judge-scored quality per item per model to
 * LangWatch, and prints the summary that justifies the default chain order.
 *
 * Run: npx tsx scripts/experiment-codegen.ts
 */
import "dotenv/config";
import { LangWatch } from "langwatch";
import { PAGE_MODELS, systemMessage, type PageModelId } from "../src/jimmy/models.js";
import { wrapBody, writePagePrompt } from "../src/jimmy/prompts.js";
import { extractJsxBody, validatePage } from "../src/jimmy/validate.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// Realistic Max-style write_page briefs — what the voice agent actually
// produces in meetings (see recordings + QA transcripts).
const DATASET = [
  { slug: "purrbnb-landing", brief: "A high-energy landing page for PurrBnB, an airbnb for cat sitters. Hero with a bold claim, three-step how-it-works, featured sitters grid with ratings, final call to action." },
  { slug: "pricing", brief: "A pricing page with three tiers: Kitten $9/mo, Cat Parent $29/mo (highlighted, most popular), Feline King $99/mo. Feature lists per tier and a call-to-action button each." },
  { slug: "waitlist", brief: "A waitlist signup page for a stealth AI startup. Mysterious vibe, one-line value prop, email input with a join button, social proof row of fake counts." },
  { slug: "dashboard", brief: "A SaaS analytics dashboard mock: top stat cards (revenue, users, churn), a fake line chart area made of div bars, a recent activity list." },
  { slug: "team", brief: "An about/team page for a robotics startup: mission statement hero, grid of six team members with emoji avatars and quirky titles, values section." },
  { slug: "product-tour", brief: "A product tour page for a meeting-room AI that ships work while you talk: three alternating feature sections with punchy copy, each with an emoji illustration block." },
  { slug: "careers", brief: "A careers page: short manifesto hero, open roles list with apply buttons (4 roles), perks grid with emoji icons." },
  { slug: "launch", brief: "A product launch announcement page: big date countdown feel (static), what's new list, testimonial quotes, subscribe call to action." },
];

const MODELS: PageModelId[] = [
  "jimmy",
  "gemini-flash",
  "haiku",
  "inworld-gemma",
  "gpt-4.1-mini",
];

/** 0-1 quality judge: fidelity to brief, richness, aesthetic discipline. */
async function judgeQuality(brief: string, code: string): Promise<number> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You judge a generated React+Tailwind page against its brief. " +
            'Return JSON {"fidelity":0-10,"richness":0-10,"aesthetic":0-10}. ' +
            "fidelity: does it contain what the brief asked. richness: is it " +
            "a full real page (sections, real copy) vs a stub. aesthetic: " +
            "consistent modern dark tailwind styling, plausible layout.",
        },
        { role: "user", content: `BRIEF:\n${brief}\n\nCODE:\n${code.slice(0, 12_000)}` },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`judge HTTP ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const scores = JSON.parse(data.choices[0].message.content) as Record<string, number>;
  return (scores.fidelity + scores.richness + scores.aesthetic) / 30;
}

const langwatch = new LangWatch();
const evaluation = await langwatch.experiments.init("tokenmaxxer-codegen-chain");

const summary: Record<string, { latencies: number[]; valid: number; total: number; quality: number[] }> = {};

await evaluation.run(DATASET, async ({ item, index }) => {
  for (const id of MODELS) {
    const model = PAGE_MODELS[id];
    if (!model.available()) continue;
    summary[id] ??= { latencies: [], valid: 0, total: 0, quality: [] };
    const s = summary[id];
    s.total++;
    const t0 = Date.now();
    try {
      const raw = await model.generate(
        [systemMessage(), { role: "user", content: writePagePrompt(item.slug, item.brief) }],
        model.timeoutMs * 2,
      );
      const latencyMs = Date.now() - t0;
      const code = wrapBody(extractJsxBody(raw));
      const valid = (await validatePage(code)).ok;
      if (valid) s.valid++;
      s.latencies.push(latencyMs);
      evaluation.log(`${id}/latency_ms`, { index, score: latencyMs, data: { slug: item.slug } });
      evaluation.log(`${id}/valid`, { index, passed: valid });
      if (valid) {
        const quality = await judgeQuality(item.brief, code);
        s.quality.push(quality);
        evaluation.log(`${id}/quality`, { index, score: quality, data: { code: code.slice(0, 2000) } });
      }
      console.log(`${item.slug} × ${id}: ${latencyMs}ms valid=${valid}`);
    } catch (err) {
      console.log(`${item.slug} × ${id}: FAILED ${(err as Error).message}`);
      evaluation.log(`${id}/valid`, { index, passed: false });
    }
  }
});

console.log("\n=== SUMMARY (the chain-order decision) ===");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const p50 = (xs: number[]) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN;
for (const [id, s] of Object.entries(summary)) {
  console.log(
    `${id.padEnd(16)} p50=${String(p50(s.latencies)).padStart(6)}ms ` +
      `valid=${s.valid}/${s.total} quality=${avg(s.quality).toFixed(2)}`,
  );
}
