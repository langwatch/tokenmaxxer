/**
 * Tool-calling probe for the Inworld Realtime API.
 *
 * Configures a session with a dispatch_work tool, says something that should
 * trigger it, completes the function-call round trip, and confirms the agent
 * speaks an acknowledgement afterwards.
 */
import "dotenv/config";
import WebSocket from "ws";

const INWORLD_API_KEY = process.env.INWORLD_API_KEY;
if (!INWORLD_API_KEY) throw new Error("INWORLD_API_KEY missing in .env");

const url = `wss://api.inworld.ai/api/v1/realtime/session?key=voice-${Date.now()}&protocol=realtime`;
const t0 = Date.now();
const ts = () => `+${String(Date.now() - t0).padStart(5, " ")}ms`;

let transcript = "";
let toolCallSeen = false;
let audioBytesAfterTool = 0;

const ws = new WebSocket(url, {
  headers: { Authorization: `Basic ${INWORLD_API_KEY}` },
});
const send = (obj: unknown) => ws.send(JSON.stringify(obj));

ws.on("error", (err) => {
  console.error(ts(), "ws error:", err.message);
  process.exit(1);
});

ws.on("message", (raw) => {
  const evt = JSON.parse(raw.toString());
  switch (evt.type) {
    case "session.created":
      send({
        type: "session.update",
        session: {
          type: "realtime",
          model: "inworld/models/gemma-4-26b-a4b-it",
          instructions:
            "You are Max, the meeting-room AI of a startup team. You listen " +
            "and reply in ONE short sentence. The moment someone mentions " +
            "work that could be started — research, building something, " +
            "trying an idea — you MUST call the dispatch_work tool with a " +
            "clear mission brief, then acknowledge briefly out loud.",
          output_modalities: ["audio"],
          tools: [
            {
              type: "function",
              name: "dispatch_work",
              description:
                "Dispatch a mission to the agent fleet. Fire-and-forget: " +
                "work starts immediately in the background.",
              parameters: {
                type: "object",
                properties: {
                  mission: {
                    type: "string",
                    description:
                      "Self-contained mission brief for the worker agent",
                  },
                  topic: {
                    type: "string",
                    description: "2-4 word workstream label",
                  },
                },
                required: ["mission", "topic"],
              },
            },
          ],
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
      console.log(ts(), "session.updated — speaking an actionable idea");
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Okay so new idea: an airbnb for cat sitters. Let's get " +
                "someone researching the market size right away.",
            },
          ],
        },
      });
      send({ type: "response.create" });
      break;
    case "response.function_call_arguments.done": {
      toolCallSeen = true;
      console.log(
        ts(),
        `TOOL CALL: name=${evt.name} call_id=${evt.call_id} args=${evt.arguments}`,
      );
      send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: evt.call_id,
          output: JSON.stringify({
            status: "dispatched",
            agent: "market-research-cats",
            note: "Agent spinning up now, will report progress.",
          }),
        },
      });
      send({ type: "response.create" });
      break;
    }
    case "response.output_audio.delta":
      if (toolCallSeen)
        audioBytesAfterTool += Buffer.from(evt.delta, "base64").length;
      break;
    case "response.output_audio_transcript.delta":
      transcript += evt.delta ?? "";
      break;
    case "response.done":
      console.log(ts(), `response.done — transcript so far: "${transcript.trim()}"`);
      if (toolCallSeen && audioBytesAfterTool > 0) {
        console.log(
          ts(),
          `SUCCESS: tool called AND spoken ack after (${audioBytesAfterTool} audio bytes)`,
        );
        process.exit(0);
      }
      break;
    case "error":
      console.error(ts(), "SERVER ERROR:", JSON.stringify(evt));
      break;
    default:
      console.log(ts(), `event: ${evt.type}`);
  }
});

setTimeout(() => {
  console.error(
    ts(),
    `TIMEOUT — toolCallSeen=${toolCallSeen} transcript="${transcript.trim()}"`,
  );
  process.exit(1);
}, 30_000);
