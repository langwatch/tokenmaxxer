import Anthropic from "@anthropic-ai/sdk";
import WebSocket from "ws";
import { config } from "../config.js";
import { PAGE_SYSTEM_PROMPT } from "./prompts.js";

/**
 * The page-codegen model registry. ChatJimmy is the blazing default; the
 * others are smarter and switchable at runtime. Speeds and quality are
 * grounded in scripts/experiment-codegen.ts (LangWatch experiment
 * "tokenmaxxer-codegen-chain"):
 *
 *   jimmy             p50 ~0.8s   valid 5/8  quality 0.65  (Llama 3.1 8B @ ~17k tok/s)
 *   inworld-gemma     p50 ~8s     valid 8/8  quality 0.92  (gemma-4 via realtime text)
 *   gemini-flash      p50 ~8.6s   valid 8/8  quality 0.92
 *   haiku             p50 ~13s    valid 8/8  quality 0.93  (Claude Haiku 4.5 — smartest)
 *   gpt-4.1-mini      p50 ~16s    valid 8/8  quality 0.90
 */
export type PageModelId =
  | "jimmy"
  | "gemini-flash"
  | "haiku"
  | "inworld-gemma"
  | "gpt-4.1-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PageModel {
  id: PageModelId;
  label: string;
  /** Per-attempt transport timeout. */
  timeoutMs: number;
  available(): boolean;
  /** Generate raw text (the JSX body, pre-normalization) from the messages. */
  generate(messages: ChatMessage[], timeoutMs: number): Promise<string>;
}

/** OpenAI-compatible chat completion (jimmy, gemini, gpt). */
async function openaiChat(
  url: string,
  model: string,
  apiKey: string | undefined,
  messages: ChatMessage[],
  timeoutMs: number,
  extraBody: Record<string, unknown> = {},
): Promise<string> {
  const res = await fetch(`${url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 6000,
      temperature: 0.2,
      ...extraBody,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "";
}

let anthropicClient: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return anthropicClient;
}

/** Claude Haiku via the Anthropic Messages API. */
async function haikuChat(
  messages: ChatMessage[],
  timeoutMs: number,
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  const res = await anthropic().messages.create(
    {
      model: "claude-haiku-4-5",
      max_tokens: 6000,
      system,
      messages: turns,
    },
    { timeout: timeoutMs },
  );
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** gemma-4 driven through a text-only Inworld realtime session. */
async function inworldGemmaChat(
  messages: ChatMessage[],
  timeoutMs: number,
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const user = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");
  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(
      `wss://api.inworld.ai/api/v1/realtime/session?key=codegen-${Date.now()}&protocol=realtime`,
      { headers: { Authorization: `Basic ${config.inworldApiKey}` } },
    );
    const send = (obj: unknown) => ws.send(JSON.stringify(obj));
    let text = "";
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("inworld-gemma timeout"));
    }, timeoutMs);
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    ws.on("message", (raw) => {
      const evt = JSON.parse(raw.toString());
      if (evt.type === "session.created") {
        send({
          type: "session.update",
          session: {
            type: "realtime",
            model: "inworld/models/gemma-4-26b-a4b-it",
            instructions: system,
            output_modalities: ["text"],
          },
        });
      } else if (evt.type === "session.updated") {
        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: user }],
          },
        });
        send({ type: "response.create" });
      } else if (evt.type === "response.output_text.delta") {
        text += evt.delta ?? "";
      } else if (evt.type === "response.output_text.done" && evt.text) {
        text = String(evt.text);
      } else if (evt.type === "response.done") {
        clearTimeout(timer);
        ws.close();
        resolve(text);
      } else if (evt.type === "error") {
        clearTimeout(timer);
        ws.close();
        reject(new Error(String(evt.error?.message ?? "inworld error")));
      }
    });
  });
}

export const PAGE_MODELS: Record<PageModelId, PageModel> = {
  jimmy: {
    id: "jimmy",
    label: "ChatJimmy (fastest)",
    timeoutMs: 15_000,
    available: () => true,
    generate: (messages, timeoutMs) =>
      openaiChat(config.jimmyProxyUrl, "llama3.1-8B", undefined, messages, timeoutMs),
  },
  "gemini-flash": {
    id: "gemini-flash",
    label: "Gemini 2.5 Flash (smart, fast)",
    timeoutMs: 25_000,
    available: () => Boolean(config.geminiApiKey),
    generate: (messages, timeoutMs) =>
      openaiChat(
        "https://generativelanguage.googleapis.com/v1beta/openai",
        "gemini-2.5-flash",
        config.geminiApiKey,
        messages,
        timeoutMs,
        { reasoning_effort: "none" },
      ),
  },
  haiku: {
    id: "haiku",
    label: "Claude Haiku 4.5 (smartest)",
    timeoutMs: 25_000,
    available: () => Boolean(config.anthropicApiKey),
    generate: haikuChat,
  },
  "inworld-gemma": {
    id: "inworld-gemma",
    label: "Inworld gemma-4 (the voice model)",
    timeoutMs: 25_000,
    available: () => Boolean(config.inworldApiKey),
    generate: inworldGemmaChat,
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    timeoutMs: 30_000,
    available: () => Boolean(config.openaiApiKey),
    generate: (messages, timeoutMs) =>
      openaiChat("https://api.openai.com/v1", "gpt-4.1-mini", config.openaiApiKey, messages, timeoutMs),
  },
};

export const PAGE_MODEL_IDS = Object.keys(PAGE_MODELS) as PageModelId[];

/** The system prompt is the same regardless of model. */
export function systemMessage(): ChatMessage {
  return { role: "system", content: PAGE_SYSTEM_PROMPT };
}
