import { config } from "../config.js";
import { log } from "../log.js";
import { wavFromPcm16 } from "../audio.js";

/**
 * Inworld protocol gap: with `turn_detection: null` (manual turns — what
 * the scenario voice adapter uses), committed input audio is NOT
 * transcribed upstream; the model receives an empty user turn. This shim
 * transcribes the buffered audio with whisper and the gateway injects it
 * as a text item instead, so manual-turn clients get the full pipeline.
 */
export async function transcribePcm(pcm: Buffer): Promise<string> {
  if (pcm.length < 4800) return ""; // <100ms — nothing to hear
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(wavFromPcm16(pcm))], { type: "audio/wav" }),
    "turn.wav",
  );
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    log("stt-shim", `whisper failed: HTTP ${res.status}`);
    return "";
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}
