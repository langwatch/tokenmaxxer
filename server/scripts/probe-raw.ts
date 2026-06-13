/**
 * Raw event dump straight from Inworld with the production tool schemas,
 * to inspect exactly what the wire carries for tricky turns.
 */
import "dotenv/config";
import WebSocket from "ws";
import { MAX_INSTRUCTIONS } from "../src/persona.js";
import { TOOL_SCHEMAS } from "../src/tools/schemas.js";

const INWORLD_API_KEY = process.env.INWORLD_API_KEY!;
const text = process.argv[2] ?? "Hey Max, you there? Quick check.";

const ws = new WebSocket(
  `wss://api.inworld.ai/api/v1/realtime/session?key=voice-${Date.now()}&protocol=realtime`,
  { headers: { Authorization: `Basic ${INWORLD_API_KEY}` } },
);
const send = (obj: unknown) => ws.send(JSON.stringify(obj));
const t0 = Date.now();

ws.on("message", (raw) => {
  const evt = JSON.parse(raw.toString());
  if (evt.type === "response.output_audio.delta") {
    console.log(`+${Date.now() - t0}ms response.output_audio.delta (${String(evt.delta).length} b64 chars)`);
    return;
  }
  console.log(`+${Date.now() - t0}ms ${JSON.stringify(evt).slice(0, 500)}`);
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
      },
    });
  }
  if (evt.type === "session.updated") {
    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    send({ type: "response.create" });
  }
  if (evt.type === "response.done") {
    setTimeout(() => process.exit(0), 500);
  }
});

setTimeout(() => process.exit(1), 30_000);
