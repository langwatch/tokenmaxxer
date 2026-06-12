/**
 * Voice scenario tests for Max — REAL audio end to end. The scenario
 * user simulator speaks through TTS into the gateway; the gateway proxies
 * Inworld (STT + gemma-4 + TTS); tools execute server-side for real
 * (jimmy codegen, fleet dispatch with actual claude agents in tmux).
 *
 * The agent under test is the gateway itself: scenario's OpenAI Realtime
 * adapter is pointed at the gateway WS endpoint, which speaks the same
 * protocol. Binds specs/meeting-agent.feature.
 *
 * Note on scripts: when Max fires a tool, the first response is tool-only;
 * the spoken acknowledgement arrives as a follow-up response after the
 * gateway executes the call. Hence the double `scenario.agent()` steps.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import scenario, { AgentRole, voice } from "@langwatch/scenario";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer, type TestServer } from "../helpers/gateway.js";
import { saveRecording } from "./helpers/save-recording.js";

const PLAYGROUND_PAGES = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "playground",
  "src",
  "pages",
);

let server: TestServer;
let pagesBefore = new Set<string>();
let tmuxBefore = new Set<string>();

function listTmux(): Set<string> {
  try {
    return new Set(
      execFileSync("tmux", ["list-sessions", "-F", "#S"], { encoding: "utf8" })
        .trim()
        .split("\n"),
    );
  } catch {
    return new Set();
  }
}

beforeAll(async () => {
  pagesBefore = new Set(fs.readdirSync(PLAYGROUND_PAGES));
  tmuxBefore = listTmux();
  server = await startTestServer();
});

afterAll(() => {
  server?.stop();
  // Remove pages and tmux agents created during the voice runs.
  for (const f of fs.readdirSync(PLAYGROUND_PAGES)) {
    if (!pagesBefore.has(f)) fs.rmSync(path.join(PLAYGROUND_PAGES, f));
  }
  for (const session of listTmux()) {
    if (!tmuxBefore.has(session) && session.startsWith("tmx-")) {
      try {
        execFileSync("tmux", ["kill-session", "-t", session]);
      } catch {
        // already gone
      }
    }
  }
});

function maxUnderTest() {
  // voice.openAIRealtimeAgent — the published default export's d.ts misses
  // the voice factories (runtime/type drift); the voice namespace has them.
  return voice.openAIRealtimeAgent({
    url: server.url,
    apiKey: "handled-by-gateway",
    role: AgentRole.AGENT,
  });
}

describe.sequential("Max — meeting room voice agent", () => {
  it("dispatches work the moment an idea is actionable, without asking permission", async () => {
    const result = await scenario.run({
      name: "idea becomes dispatched work",
      description:
        "A startup founder in a meeting room thinks out loud about a new " +
        "idea and wants it explored. Max should dispatch the work " +
        "immediately and acknowledge in very few words.",
      agents: [
        maxUnderTest(),
        scenario.userSimulatorAgent({
          voice: "elevenlabs/EXAVITQu4vr4xnSDxMaL",
          persona:
            "You are a startup founder SPEAKING in a meeting room, excited " +
            "and fast. Natural spoken sentences. You just had an idea: an " +
            "airbnb for cat sitters. You want the market researched right " +
            "away. 1-2 sentences per turn.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made a dispatch_work tool call for the cat sitter idea",
            "Max acknowledged out loud in one short sentence without asking for permission or more details",
            "Max did not lecture or enumerate options",
          ],
        }),
      ],
      script: [
        scenario.user(),
        scenario.agent(), // tool-only response
        scenario.agent(), // spoken acknowledgement
        scenario.judge(),
      ],
      maxTurns: 8,
    });
    expect(result.success, result.reasoning).toBe(true);

    // Listenable proof: both sides actually spoke.
    const dir = saveRecording(result.audio, "dispatch-on-idea");
    expect(dir, "no audio recording captured").not.toBeNull();
    const speakers = new Set(result.audio!.segments.map((s) => s.speaker));
    expect(speakers.has("user"), "no user audio in recording").toBe(true);
    expect(speakers.has("agent"), "no agent audio in recording").toBe(true);
  }, 240_000);

  it("answers progress questions from fleet state", async () => {
    const result = await scenario.run({
      name: "progress check",
      description:
        "A team member asks the room AI how the work is going. Max should " +
        "check progress and summarize briefly.",
      agents: [
        maxUnderTest(),
        scenario.userSimulatorAgent({
          voice: "openai/nova",
          persona:
            "You are SPEAKING in a meeting room. Ask Max how things are " +
            "going with the work, naturally, in one sentence.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made a check_progress tool call",
            "Max reported the fleet status out loud briefly (it is fine if the fleet is empty)",
          ],
        }),
      ],
      script: [
        scenario.user(),
        scenario.agent(),
        scenario.agent(),
        scenario.judge(),
      ],
      maxTurns: 8,
    });
    expect(result.success, result.reasoning).toBe(true);
    saveRecording(result.audio, "progress-check");
  }, 240_000);

  it("paints a page on the room screen when asked for something visual", async () => {
    const scenarioStart = Date.now();
    const result = await scenario.run({
      name: "spoken page request renders on screen",
      description:
        "A founder asks for a landing page for their startup to be put on " +
        "the room screen. Max should create the page with write_page and " +
        "confirm it is on screen.",
      agents: [
        maxUnderTest(),
        scenario.userSimulatorAgent({
          voice: "openai/nova",
          persona:
            "You are SPEAKING in a meeting room. Ask for a landing page " +
            "for your startup 'PurrBnB' (airbnb for cat sitters) to be put " +
            "up on the screen. One sentence.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made a write_page tool call for a PurrBnB-related page",
            "Max indicated out loud, briefly, that the page is on or going to the screen",
          ],
        }),
      ],
      script: [
        scenario.user(),
        scenario.agent(),
        scenario.agent(),
        scenario.judge(),
      ],
      maxTurns: 8,
    });
    expect(result.success, result.reasoning).toBe(true);

    // A page file was really written during this scenario (created or
    // overwritten — the model picks the slug, which may collide).
    const touched = fs
      .readdirSync(PLAYGROUND_PAGES)
      .filter((f) => f !== "home.tsx")
      .filter(
        (f) =>
          fs.statSync(path.join(PLAYGROUND_PAGES, f)).mtimeMs >= scenarioStart,
      );
    expect(touched.length, "no page file was written").toBeGreaterThan(0);
    const code = fs.readFileSync(path.join(PLAYGROUND_PAGES, touched[0]), "utf8");
    expect(code).toContain("export default function Page()");
    saveRecording(result.audio, "page-on-screen");
  }, 240_000);
});
