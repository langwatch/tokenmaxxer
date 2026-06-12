/**
 * End-to-end probe of the gateway: behaves like the scenario test adapter
 * (manual turn-taking) and exercises the write_page tool path. Run with the
 * gateway and playground already up.
 */
import "dotenv/config";
import WebSocket from "ws";

const url = process.env.GATEWAY_URL ?? "ws://localhost:4870/realtime";
const t0 = Date.now();
const ts = () => `+${String(Date.now() - t0).padStart(6, " ")}ms`;

const ws = new WebSocket(url);
const send = (obj: unknown) => ws.send(JSON.stringify(obj));

let phase: "intro" | "page" = "intro";
let introSent = false;
let audioBytes = 0;
let transcript = "";
const toolEvents: string[] = [];
let navigated = "";

ws.on("error", (e) => {
  console.error(ts(), "ws error", e.message);
  process.exit(1);
});

ws.on("message", (raw) => {
  const evt = JSON.parse(raw.toString());
  switch (evt.type) {
    case "session.created":
      console.log(ts(), "session.created — sending manual-turn session.update");
      send({
        type: "session.update",
        session: {
          type: "realtime",
          model: "ignored-client-model",
          instructions: "ignored client instructions",
          audio: { input: { turn_detection: null } },
        },
      });
      break;
    case "session.updated":
      if (phase === "intro" && !introSent) {
        introSent = true;
        console.log(ts(), "session.updated — turn 1: intro");
        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: "Hey Max, you there? Quick check." },
            ],
          },
        });
        send({ type: "response.create" });
      }
      break;
    case "response.output_audio.delta":
      audioBytes += Buffer.from(String(evt.delta), "base64").length;
      break;
    case "response.output_audio_transcript.done":
      transcript = String(evt.transcript ?? "");
      console.log(ts(), `agent said: "${transcript}"`);
      break;
    case "response.done":
      if (phase === "intro" && audioBytes > 0) {
        phase = "page";
        console.log(ts(), `intro done (${audioBytes} audio bytes) — turn 2: ask for a page`);
        audioBytes = 0;
        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Put a landing page for our new startup on the screen — " +
                  "it's called PurrBnB, airbnb for cat sitters. Make it pop.",
              },
            ],
          },
        });
        send({ type: "response.create" });
      } else if (phase === "page" && navigated && audioBytes > 0) {
        console.log(
          ts(),
          `SUCCESS — tools: [${toolEvents.join(", ")}], navigated to ${navigated}, spoken ack ${audioBytes} bytes`,
        );
        process.exit(0);
      }
      break;
    case "tokenmaxxer.tool":
      console.log(
        ts(),
        `tool ${evt.phase}: ${evt.tool} ${JSON.stringify(evt.args).slice(0, 100)} ${evt.result ?? ""}`,
      );
      toolEvents.push(`${evt.tool}:${evt.phase}`);
      break;
    case "tokenmaxxer.navigate":
      navigated = String(evt.path);
      console.log(ts(), `navigate → ${navigated}`);
      break;
    case "error":
      console.error(ts(), "SERVER ERROR:", JSON.stringify(evt));
      break;
  }
});

setTimeout(() => {
  console.error(
    ts(),
    `TIMEOUT phase=${phase} audioBytes=${audioBytes} tools=[${toolEvents.join(",")}] navigated=${navigated}`,
  );
  process.exit(1);
}, 60_000);
