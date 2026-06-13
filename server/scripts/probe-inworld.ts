/**
 * Connectivity probe for the Inworld Realtime API.
 *
 * Connects, configures a session, sends a text turn, and reports every
 * event with timings. Saves the returned audio to outputs/probe.wav so a
 * human can listen and confirm it is real speech.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";

const INWORLD_API_KEY = process.env.INWORLD_API_KEY;
if (!INWORLD_API_KEY) throw new Error("INWORLD_API_KEY missing in .env");

const url = `wss://api.inworld.ai/api/v1/realtime/session?key=voice-${Date.now()}&protocol=realtime`;
const t0 = Date.now();
const ts = () => `+${String(Date.now() - t0).padStart(5, " ")}ms`;

const audioChunks: Buffer[] = [];
let transcript = "";

const ws = new WebSocket(url, {
  headers: { Authorization: `Basic ${INWORLD_API_KEY}` },
});

function send(obj: unknown) {
  ws.send(JSON.stringify(obj));
}

function wavFromPcm16(pcm: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

ws.on("open", () => console.log(ts(), "ws open"));
ws.on("error", (err) => {
  console.error(ts(), "ws error:", err.message);
  process.exit(1);
});
ws.on("close", (code, reason) =>
  console.log(ts(), `ws close code=${code} reason=${reason.toString()}`),
);

ws.on("message", (raw) => {
  const evt = JSON.parse(raw.toString());
  switch (evt.type) {
    case "session.created":
      console.log(ts(), "session.created — sending session.update");
      send({
        type: "session.update",
        session: {
          type: "realtime",
          model: "inworld/models/gemma-4-26b-a4b-it",
          instructions:
            "You are Max, a meeting-room AI. Reply in one short sentence.",
          output_modalities: ["audio"],
          audio: {
            input: {
              transcription: { model: "assemblyai/u3-rt-pro" },
              turn_detection: {
                type: "semantic_vad",
                eagerness: "medium",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { model: "inworld-tts-2", voice: "Jason" },
          },
        },
      });
      break;
    case "session.updated":
      console.log(ts(), "session.updated — sending text turn");
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Introduce yourself in exactly one short sentence.",
            },
          ],
        },
      });
      send({ type: "response.create" });
      break;
    case "response.output_audio.delta": {
      const buf = Buffer.from(evt.delta, "base64");
      if (audioChunks.length === 0)
        console.log(ts(), `FIRST audio delta (${buf.length} bytes)`);
      audioChunks.push(buf);
      break;
    }
    case "response.output_audio_transcript.delta":
      transcript += evt.delta ?? "";
      break;
    case "response.output_text.delta":
      transcript += evt.delta ?? "";
      break;
    case "response.done": {
      const pcm = Buffer.concat(audioChunks);
      console.log(ts(), `response.done — ${audioChunks.length} chunks, ${pcm.length} bytes (${(pcm.length / 48000).toFixed(2)}s of audio)`);
      console.log(ts(), `transcript: ${transcript.trim()}`);
      const out = path.join(import.meta.dirname, "..", "outputs");
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, "probe.wav"), wavFromPcm16(pcm));
      console.log(ts(), `wrote outputs/probe.wav`);
      ws.close();
      process.exit(0);
    }
    case "error":
      console.error(ts(), "SERVER ERROR:", JSON.stringify(evt, null, 2));
      break;
    default:
      console.log(ts(), `event: ${evt.type}`);
  }
});

setTimeout(() => {
  console.error(ts(), "TIMEOUT — no response.done after 30s");
  process.exit(1);
}, 30_000);
