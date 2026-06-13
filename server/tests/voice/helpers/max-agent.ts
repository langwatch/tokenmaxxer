import { voice, AgentRole } from "@langwatch/scenario";
import type { AgentInput, AgentReturnTypes } from "@langwatch/scenario";

/**
 * Max under test: the gateway's OpenAI-Realtime-compatible endpoint, with a
 * fix for the framework's voice-message gap.
 *
 * The stock OpenAIRealtimeAgentAdapter returns the agent's spoken turn as an
 * AUDIO-ONLY message — the transcript is parked on `lastAgentTranscript` and
 * never attached to the message. The LangWatch Simulations UI then shows an
 * audio player with no caption, so the conversation reads as empty (the user
 * simulator side already attaches its transcript, which is why only Max's
 * turns looked blank). We attach the transcript here as a leading text part,
 * mirroring the user simulator. (Diagnosed against the framework source;
 * the same fix belongs upstream in scenario's adapter.)
 */
class TranscriptAttachingRealtimeAgent extends voice.OpenAIRealtimeAgentAdapter {
  override async call(input: AgentInput): Promise<AgentReturnTypes> {
    const result = await super.call(input);
    const transcript = this.lastAgentTranscript?.trim();
    if (transcript) {
      if (Array.isArray(result)) result.forEach((m) => attach(m, transcript));
      else attach(result, transcript);
    }
    return result;
  }
}

function attach(message: unknown, transcript: string): void {
  if (!message || typeof message !== "object") return;
  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content)) return;
  const part = (p: unknown) =>
    p && typeof p === "object" ? (p as { type?: string }).type : undefined;
  const hasAudio = content.some((p) => part(p) === "file");
  const hasText = content.some((p) => part(p) === "text");
  if (hasAudio && !hasText) {
    content.unshift({ type: "text", text: transcript });
  }
}

export function maxAgent(url: string) {
  return new TranscriptAttachingRealtimeAgent({
    url,
    apiKey: "handled-by-gateway",
    role: AgentRole.AGENT,
  });
}
