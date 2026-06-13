import "dotenv/config";
import os from "node:os";

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

  /** Whisper transcription for manual-turn (scenario) clients — see stt-shim. */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  /** Model alias passed to `kanban launch --model` for the room's agents. */
  agentModel: process.env.TOKENMAXXER_AGENT_MODEL ?? "sonnet",

  /** Parent dir for any scratch workspace a room needs (when not a real repo). */
  workspacesDir:
    process.env.TOKENMAXXER_WORKSPACES_DIR ??
    os.homedir() + "/Projects/tokenmaxxer-workspaces",

  /** Prefix for kanban slugs so room agents are recognizable and filterable. */
  fleetPrefix: "tmx-",

  /** When set, rooms create channels and track agents but never launch real
   * tmux sessions — used by routing/unit tests to assert behavior headlessly. */
  fleetDryRun: process.env.TOKENMAXXER_FLEET_DRYRUN === "1",
};
