import "dotenv/config";
import os from "node:os";
import path from "node:path";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing — add it to .env`);
  return v;
}

export const config = {
  port: Number(process.env.TOKENMAXXER_PORT ?? 4870),

  inworldApiKey: required("INWORLD_API_KEY"),
  inworldUrl: () =>
    `wss://api.inworld.ai/api/v1/realtime/session?key=voice-${Date.now()}&protocol=realtime`,
  inworldModel:
    process.env.INWORLD_MODEL ?? "inworld/models/gemma-4-26b-a4b-it",
  /** Used when the primary model reports capacity exhaustion repeatedly. */
  inworldFallbackModel:
    process.env.INWORLD_FALLBACK_MODEL ?? "google-ai-studio/gemini-2.5-flash",
  inworldVoice: process.env.INWORLD_VOICE ?? "Jason",

  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  /** Routing is simple structured output — haiku is fast and sufficient
   * (verified by the orchestrator brain tests). */
  brainModel: process.env.TOKENMAXXER_BRAIN_MODEL ?? "claude-haiku-4-5",

  /** Model alias passed to `kanban launch --model` for worker agents. */
  agentModel: process.env.TOKENMAXXER_AGENT_MODEL ?? "sonnet",

  jimmyProxyUrl: process.env.JIMMY_PROXY_URL ?? "http://localhost:4100/v1",
  defaultPageModel: process.env.TOKENMAXXER_PAGE_MODEL ?? "jimmy",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  playgroundDir:
    process.env.TOKENMAXXER_PLAYGROUND_DIR ??
    path.resolve(import.meta.dirname, "../../playground"),
  playgroundUrl: process.env.TOKENMAXXER_PLAYGROUND_URL ?? "http://localhost:5171",

  workspacesDir:
    process.env.TOKENMAXXER_WORKSPACES_DIR ??
    path.join(os.homedir(), "Projects", "tokenmaxxer-workspaces"),

  /** Prefix for kanban slugs so fleet agents are recognizable and filterable. */
  fleetPrefix: "tmx-",

  /** When set, the fleet routes and tracks but never launches real agents —
   * used by routing tests to assert tool choice without spawning tmux. */
  fleetDryRun: process.env.TOKENMAXXER_FLEET_DRYRUN === "1",
};
