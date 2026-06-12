/**
 * Drive Inworld exactly like the scenario adapter does: real speech audio
 * appended in one chunk, manual commit, response.create. Dumps every event
 * with payloads to diagnose text-only responses.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";
import { MAX_INSTRUCTIONS } from "../src/persona.js";
import { TOOL_SCHEMAS } from "../src/tools/schemas.js";

const INWORLD_API_KEY = process.env.INWORLD_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const text = process.argv[2] ?? "Hey Max, how is the work going so far?";

async function ttsPcm24k(say: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: say,
      response_format: "pcm", // 24kHz PCM16 mono
    }),
  });
  if (!res.ok) throw new Error(`tts failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const pcm = await ttsPcm24k(text);
console.log(`tts: ${pcm.length} bytes (${(pcm.length / 48000).toFixed(2)}s)`);

const ws = new WebSocket(
  `wss://api.inworld.ai/api/v1/realtime/session?key=voice-${Date.now()}&protocol=realtime`,
  { headers: { Authorization: `Basic ${INWORLD_API_KEY}` } },
);
const send = (obj: unknown) => ws.send(JSON.stringify(obj));
const t0 = Date.now();
let audioBytes = 0;
const audioChunks: Buffer[] = [];

ws.on("message", (raw) => {
  const evt = JSON.parse(raw.toString());
  if (evt.type === "response.output_audio.delta") {
    const b = Buffer.from(evt.delta, "base64");
    audioBytes += b.length;
    audioChunks.push(b);
    return;
  }
  console.log(`+${Date.now() - t0}ms ${JSON.stringify(evt).slice(0, 300)}`);
  if (evt.type === "session.created") {
    send({
      type: "session.update",
      session: {
        type: "realtime",
        model: "inworld/models/gemma-4-26b-a4b-it",
        instructions: MAX_INSTRUCTIONS,
        output_modalities: ["audio"],
        tools: TOOL_SCHEMAS,
        audio: {
          input: {
            transcription: { model: "assemblyai/u3-rt-pro" },
            turn_detection: null,
          },
          output: { model: "inworld-tts-2", voice: "Jason" },
        },
        providerData: { stt: { voice_profile: false } },
      },
    });
  }
  if (evt.type === "session.updated") {
    // exactly what the adapter does: one big append, commit, response.create
    send({
      type: "input_audio_buffer.append",
      audio: pcm.toString("base64"),
    });
    send({ type: "input_audio_buffer.commit" });
    send({ type: "response.create" });
  }
  if (evt.type === "response.done") {
    console.log(`audio bytes received: ${audioBytes}`);
    const out = path.join(import.meta.dirname, "..", "outputs");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "probe-audio-reply.pcm"), Buffer.concat(audioChunks));
    process.exit(audioBytes > 0 ? 0 : 1);
  }
});

setTimeout(() => {
  console.log(`TIMEOUT, audio bytes: ${audioBytes}`);
  process.exit(1);
}, 30_000);
