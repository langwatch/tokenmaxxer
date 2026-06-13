import { log } from "../log.js";
import { tracer } from "../observability.js";
import { settings } from "../settings.js";
import {
  PAGE_MODELS,
  systemMessage,
  type ChatMessage,
  type PageModel,
  type PageModelId,
} from "./models.js";
import { editPagePrompt, retryPrompt, wrapBody, writePagePrompt } from "./prompts.js";
import { extractJsxBody, validatePage } from "./validate.js";

/**
 * The chain: the room's selected model first, then smart fallbacks for its
 * misses. The selected model defaults to ChatJimmy (17-40x faster than the
 * rest; see scripts/experiment-codegen.ts), but the room can switch to a
 * smarter one by voice. inworld-gemma is selectable but never an automatic
 * fallback (a websocket per page); gemini-flash then gpt-4.1-mini cover the
 * primary's misses.
 */
export function speedChain(): PageModel[] {
  const primary = PAGE_MODELS[settings.pageModel];
  const fallbackOrder: PageModelId[] = ["gemini-flash", "gpt-4.1-mini"];
  const chain = [primary];
  for (const id of fallbackOrder) {
    const m = PAGE_MODELS[id];
    if (m.id !== primary.id && m.available()) chain.push(m);
  }
  return chain.filter((m) => m.available());
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
    const messages: ChatMessage[] = [systemMessage(), { role: "user", content: userPrompt }];
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = overallDeadlineMs - (Date.now() - t0);
      if (remaining < 2_000) {
        throw new Error(
          `codegen deadline exceeded after ${attempts} attempts: ${errors.join(" | ")}`,
        );
      }
      attempts++;
      try {
        const raw = await m.generate(messages, Math.min(m.timeoutMs, remaining));
        const body = extractJsxBody(raw);
        const code = wrapBody(body);
        const valid = await validatePage(code);
        if (valid.ok) {
          const elapsedMs = Date.now() - t0;
          log("jimmy", `codegen ok via ${m.id} in ${elapsedMs}ms (attempt ${attempts})`);
          return { code, model: m.id, elapsedMs, attempts };
        }
        log("jimmy", `${m.id} invalid output: ${valid.error} :: ${body.slice(0, 120)}`);
        errors.push(`${m.id}: ${valid.error}`);
        messages.push(
          { role: "assistant", content: raw },
          { role: "user", content: retryPrompt(valid.error ?? "unknown") },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log("jimmy", `${m.id} failed: ${message}`);
        errors.push(`${m.id}: ${message}`);
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
