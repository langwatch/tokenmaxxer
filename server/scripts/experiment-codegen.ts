/**
 * Codegen speed-vs-quality experiment: which model should be first in the
 * write_page chain? Compares chatjimmy (~17k tok/s quantized Llama 3.1 8B),
 * gemini-2.5-flash, gpt-4.1-mini, and Inworld's gemma-4 driven through a
 * text-only realtime session (could the voice model do the codegen itself?).
 *
 * Logs latency, validity and judge-scored quality per item per target to
 * LangWatch, and prints the summary the chain order decision is based on.
 *
 * Run: npx tsx scripts/experiment-codegen.ts
 */
import "dotenv/config";
import { LangWatch } from "langwatch";
import WebSocket from "ws";
import { PAGE_SYSTEM_PROMPT, wrapBody, writePagePrompt } from "../src/jimmy/prompts.js";
import { extractJsxBody, validatePage } from "../src/jimmy/validate.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const INWORLD_API_KEY = process.env.INWORLD_API_KEY!;

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

interface GenResult {
  code: string;
  raw: string;
  latencyMs: number;
}

async function openaiCompatible(
  url: string,
  model: string,
  apiKey: string | undefined,
  brief: { slug: string; brief: string },
  extraBody: Record<string, unknown> = {},
): Promise<GenResult> {
  const t0 = Date.now();
  const res = await fetch(`${url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: PAGE_SYSTEM_PROMPT },
        { role: "user", content: writePagePrompt(brief.slug, brief.brief) },
      ],
      max_tokens: 6000,
      temperature: 0.2,
      ...extraBody,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const raw = data.choices[0]?.message?.content ?? "";
  return { raw, code: wrapBody(extractJsxBody(raw)), latencyMs: Date.now() - t0 };
}

/** gemma-4 through a text-only Inworld realtime session. */
async function inworldGemma(brief: { slug: string; brief: string }): Promise<GenResult> {
  const t0 = Date.now();
  return new Promise<GenResult>((resolve, reject) => {
    const ws = new WebSocket(
      `wss://api.inworld.ai/api/v1/realtime/session?key=exp-${Date.now()}&protocol=realtime`,
      { headers: { Authorization: `Basic ${INWORLD_API_KEY}` } },
    );
    const send = (obj: unknown) => ws.send(JSON.stringify(obj));
    let text = "";
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("inworld codegen timeout"));
    }, 60_000);
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    ws.on("message", (rawMsg) => {
      const evt = JSON.parse(rawMsg.toString());
      if (evt.type === "session.created") {
        send({
          type: "session.update",
          session: {
            type: "realtime",
            model: "inworld/models/gemma-4-26b-a4b-it",
            instructions: PAGE_SYSTEM_PROMPT,
            output_modalities: ["text"],
          },
        });
      }
      if (evt.type === "session.updated") {
        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: writePagePrompt(brief.slug, brief.brief) },
            ],
          },
        });
        send({ type: "response.create" });
      }
      if (evt.type === "response.output_text.delta") text += evt.delta ?? "";
      if (evt.type === "response.output_text.done" && evt.text) text = String(evt.text);
      if (evt.type === "response.done") {
        clearTimeout(timer);
        ws.close();
        resolve({ raw: text, code: wrapBody(extractJsxBody(text)), latencyMs: Date.now() - t0 });
      }
      if (evt.type === "error") {
        clearTimeout(timer);
        ws.close();
        reject(new Error(String(evt.error?.message ?? "inworld error")));
      }
    });
  });
}

const TARGETS: Record<string, (b: { slug: string; brief: string }) => Promise<GenResult>> = {
  jimmy: (b) => openaiCompatible("http://localhost:4100/v1", "llama3.1-8B", undefined, b),
  "gemini-2.5-flash": (b) =>
    openaiCompatible(
      "https://generativelanguage.googleapis.com/v1beta/openai",
      "gemini-2.5-flash",
      GEMINI_API_KEY,
      b,
      { reasoning_effort: "none" },
    ),
  "gpt-4.1-mini": (b) =>
    openaiCompatible("https://api.openai.com/v1", "gpt-4.1-mini", OPENAI_API_KEY, b),
  "inworld-gemma-4": inworldGemma,
};

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
  for (const [target, gen] of Object.entries(TARGETS)) {
    summary[target] ??= { latencies: [], valid: 0, total: 0, quality: [] };
    const s = summary[target];
    s.total++;
    try {
      const result = await gen(item);
      const valid = (await validatePage(result.code)).ok;
      if (valid) s.valid++;
      s.latencies.push(result.latencyMs);
      evaluation.log(`${target}/latency_ms`, {
        index,
        score: result.latencyMs,
        data: { slug: item.slug },
      });
      evaluation.log(`${target}/valid`, { index, passed: valid });
      if (valid) {
        const quality = await judgeQuality(item.brief, result.code);
        s.quality.push(quality);
        evaluation.log(`${target}/quality`, {
          index,
          score: quality,
          data: { code: result.code.slice(0, 2000) },
        });
      }
      console.log(
        `${item.slug} × ${target}: ${result.latencyMs}ms valid=${valid}` +
          (s.quality.length ? ` q=${s.quality[s.quality.length - 1]?.toFixed(2)}` : ""),
      );
    } catch (err) {
      console.log(`${item.slug} × ${target}: FAILED ${(err as Error).message}`);
      evaluation.log(`${target}/valid`, { index, passed: false });
    }
  }
});

console.log("\n=== SUMMARY (the chain-order decision) ===");
for (const [target, s] of Object.entries(summary)) {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  const p50 = (xs: number[]) =>
    xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN;
  console.log(
    `${target.padEnd(18)} p50=${String(p50(s.latencies)).padStart(6)}ms ` +
      `valid=${s.valid}/${s.total} quality=${avg(s.quality).toFixed(2)}`,
  );
}
