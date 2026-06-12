import { config } from "../config.js";
import { log } from "../log.js";
import { tracer } from "../observability.js";
import {
  PAGE_SYSTEM_PROMPT,
  editPagePrompt,
  retryPrompt,
  wrapBody,
  writePagePrompt,
} from "./prompts.js";
import { extractJsxBody, validatePage } from "./validate.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface SpeedModel {
  name: string;
  url: string;
  model: string;
  apiKey?: string;
  /** Per-attempt transport timeout. */
  timeoutMs: number;
  extraBody?: Record<string, unknown>;
}

/**
 * The speed chain: fastest first, smarter fallbacks after. Order grounded
 * in scripts/experiment-codegen.ts (LangWatch experiment
 * "tokenmaxxer-codegen-chain", 8 page briefs × 4 models):
 *
 *   jimmy             p50=525ms   valid 7/8  quality 0.66
 *   gemini-2.5-flash  p50=9294ms  valid 8/8  quality 0.92
 *   gpt-4.1-mini      p50=20956ms valid 8/8  quality 0.92
 *   inworld-gemma-4   p50=9142ms  valid 8/8  quality 0.92
 *
 * jimmy is 17-40x faster — the only one that makes a page appear as the
 * sentence ends; its quality gap is the product thesis (instant draft,
 * fleet deepens). gemini covers the misses at equal quality to models 2x
 * slower; gemma-4-via-realtime matches gemini but adds WS complexity, so
 * it stays out of the chain.
 */
export function speedChain(): SpeedModel[] {
  const chain: SpeedModel[] = [
    {
      name: "jimmy",
      url: config.jimmyProxyUrl,
      model: "llama3.1-8B",
      timeoutMs: 15_000,
    },
  ];
  if (config.geminiApiKey) {
    chain.push({
      name: "gemini-flash",
      url: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.5-flash",
      apiKey: config.geminiApiKey,
      timeoutMs: 25_000,
      // Thinking costs ~15s on a page; speed is the whole point here.
      extraBody: { reasoning_effort: "none" },
    });
  }
  if (config.openaiApiKey) {
    chain.push({
      name: "gpt-4.1-mini",
      url: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: config.openaiApiKey,
      timeoutMs: 30_000,
    });
  }
  return chain;
}

async function chat(
  m: SpeedModel,
  messages: ChatMessage[],
  timeoutMs: number,
): Promise<string> {
  const res = await fetch(`${m.url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(m.apiKey ? { Authorization: `Bearer ${m.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: m.model,
      messages,
      max_tokens: 6000,
      temperature: 0.2,
      ...m.extraBody,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`${m.name} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "";
}

export interface CodegenResult {
  code: string;
  model: string;
  elapsedMs: number;
  attempts: number;
}

/**
 * Generate a complete page file through the speed chain. Models output a
 * JSX body; the file skeleton is applied here. Each model gets one shot
 * plus one retry-with-compiler-error, all under one overall deadline so a
 * voice tool call can never hang the conversation.
 */
export async function generatePageCode(
  userPrompt: string,
  overallDeadlineMs = 45_000,
): Promise<CodegenResult> {
  return tracer.withActiveSpan("speedchain.codegen", async (span) => {
    span.setType("llm");
    span.setInput(userPrompt);
    const result = await runChain(userPrompt, overallDeadlineMs);
    span.setResponseModel(result.model);
    span.setOutput(result.code);
    span.setMetrics({});
    span.setAttribute("tokenmaxxer.elapsed_ms", result.elapsedMs);
    span.setAttribute("tokenmaxxer.attempts", result.attempts);
    return result;
  });
}

async function runChain(
  userPrompt: string,
  overallDeadlineMs: number,
): Promise<CodegenResult> {
  const t0 = Date.now();
  let attempts = 0;
  const errors: string[] = [];

  for (const m of speedChain()) {
    const messages: ChatMessage[] = [
      { role: "system", content: PAGE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = overallDeadlineMs - (Date.now() - t0);
      if (remaining < 2_000) {
        throw new Error(
          `codegen deadline exceeded after ${attempts} attempts: ${errors.join(" | ")}`,
        );
      }
      attempts++;
      try {
        const raw = await chat(m, messages, Math.min(m.timeoutMs, remaining));
        const body = extractJsxBody(raw);
        const code = wrapBody(body);
        const valid = await validatePage(code);
        if (valid.ok) {
          const elapsedMs = Date.now() - t0;
          log("jimmy", `codegen ok via ${m.name} in ${elapsedMs}ms (attempt ${attempts})`);
          return { code, model: m.name, elapsedMs, attempts };
        }
        log("jimmy", `${m.name} invalid output: ${valid.error} :: ${body.slice(0, 120)}`);
        errors.push(`${m.name}: ${valid.error}`);
        messages.push(
          { role: "assistant", content: raw },
          { role: "user", content: retryPrompt(valid.error ?? "unknown") },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log("jimmy", `${m.name} failed: ${message}`);
        errors.push(`${m.name}: ${message}`);
        break; // transport error — skip retry, next model
      }
    }
  }
  throw new Error(`all speed models failed: ${errors.join(" | ")}`);
}

export function writePageRequest(slug: string, description: string): string {
  return writePagePrompt(slug, description);
}

export function editPageRequest(
  slug: string,
  instructions: string,
  currentFileContent: string,
): string {
  return editPagePrompt(slug, instructions, extractJsxBody(currentFileContent));
}
