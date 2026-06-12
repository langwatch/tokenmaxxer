import { config } from "../config.js";
import { MAX_INSTRUCTIONS } from "../persona.js";
import { TOOL_SCHEMAS } from "../tools/schemas.js";

/**
 * The gateway owns the session: model, persona, tools, voice and STT are
 * forced server-side. Clients may only choose how turns are detected —
 * the console wants semantic VAD, scenario tests drive manual turns with
 * `turn_detection: null`.
 */

const DEFAULT_TURN_DETECTION = {
  type: "semantic_vad",
  eagerness: "medium",
  create_response: true,
  interrupt_response: true,
};

export interface ClientSessionRequest {
  audio?: {
    input?: { turn_detection?: unknown };
  };
  [key: string]: unknown;
}

export function buildSessionConfig(
  client: ClientSessionRequest | null = null,
  modelOverride?: string,
): Record<string, unknown> {
  const turnDetection =
    client?.audio?.input && "turn_detection" in client.audio.input
      ? client.audio.input.turn_detection
      : DEFAULT_TURN_DETECTION;

  return {
    type: "realtime",
    model: modelOverride ?? config.inworldModel,
    instructions: MAX_INSTRUCTIONS,
    output_modalities: ["audio"],
    tools: TOOL_SCHEMAS,
    audio: {
      input: {
        transcription: { model: "assemblyai/u3-rt-pro" },
        turn_detection: turnDetection,
      },
      output: { model: "inworld-tts-2", voice: config.inworldVoice },
    },
    providerData: { stt: { voice_profile: false } },
  };
}
