/**
 * Voice scenario tests for Max — REAL audio end to end. The scenario user
 * simulator speaks through TTS into the gateway; the gateway proxies Inworld
 * (STT + gemma-4 + TTS); tools execute server-side for real. The agent under
 * test is the gateway itself: scenario's OpenAI Realtime adapter is pointed at
 * the gateway WS endpoint, which speaks the same protocol. Binds
 * specs/meeting-agent.feature and specs/room-orchestration.feature.
 *
 * The room engine runs in dry-run: Max really makes the spawn_room / open_url
 * tool calls (and really creates the kanban channel), but no tmux agents are
 * launched — these scenarios prove Max's VOICE behaviour, not the swarm. The
 * swarm is proven in QA + the live demo. Channels created here are cleaned up.
 *
 * Note on scripts: when Max fires a tool, the first response is tool-only;
 * the spoken acknowledgement arrives as a follow-up response after the gateway
 * executes the call. Hence the double `scenario.agent()` steps.
 */
import { execFileSync } from "node:child_process";
import scenario from "@langwatch/scenario";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetRooms } from "../helpers/reset.js";
import { startTestServer, type TestServer } from "../helpers/gateway.js";
import { maxAgent } from "./helpers/max-agent.js";
import { saveRecording } from "./helpers/save-recording.js";

let server: TestServer;
let channelsBefore = new Set<string>();

function listChannels(): Set<string> {
  try {
    const out = execFileSync("kanban", ["channel", "list", "--json"], {
      encoding: "utf8",
    });
    return new Set((JSON.parse(out) as { name: string }[]).map((r) => r.name));
  } catch {
    return new Set();
  }
}

beforeAll(async () => {
  // Fresh state every run: kill any stale room agents and clear stale room
  // channels. The served site is left alone — scenarios run dry-run and never
  // touch it (use scripts/reset-rooms.ts for the full site baseline).
  resetRooms({ site: false });
  channelsBefore = listChannels();
  server = await startTestServer({ TOKENMAXXER_FLEET_DRYRUN: "1" });
});

afterAll(() => {
  server?.stop();
  // spawn_room creates real channels as a side effect — remove the new ones.
  for (const name of listChannels()) {
    if (!channelsBefore.has(name)) {
      try {
        execFileSync("kanban", ["channel", "delete", name, "--json"], {
          stdio: "ignore",
        });
      } catch {
        // best effort
      }
    }
  }
});

function maxUnderTest() {
  // The gateway IS the agent (OpenAI Realtime wire). maxAgent wraps the
  // adapter to attach Max's spoken transcript to the audio message, so the
  // LangWatch Simulations UI shows the conversation instead of blank audio.
  return maxAgent(server.url);
}

describe.sequential("Max — meeting room voice agent", () => {
  it("spins up a room of agents the moment work is mentioned, without asking permission", async () => {
    const result = await scenario.run({
      name: "idea becomes a room of agents",
      description:
        "A founder in a meeting room wants real work done. Max should spin " +
        "up a room of agents immediately and acknowledge in very few words.",
      agents: [
        maxUnderTest(),
        scenario.userSimulatorAgent({
          voice: "elevenlabs/EXAVITQu4vr4xnSDxMaL",
          persona:
            "You are a startup founder SPEAKING in a meeting room, excited " +
            "and fast. Natural spoken sentences. You want a full dark mode " +
            "built for your website and you want a few agents on it right " +
            "now. 1-2 sentences per turn.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made a spawn_room tool call for the dark mode work",
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
    const dir = saveRecording(result.audio, "room-on-idea");
    expect(dir, "no audio recording captured").not.toBeNull();
    const speakers = new Set(result.audio!.segments.map((s) => s.speaker));
    expect(speakers.has("user"), "no user audio in recording").toBe(true);
    expect(speakers.has("agent"), "no agent audio in recording").toBe(true);

    // Regression: Max's spoken turns carry a transcript text part alongside
    // the audio, so the LangWatch Simulations UI renders the conversation
    // instead of blank audio players.
    const agentAudioWithText = result.messages.some((m) => {
      if (m.role !== "assistant" || !Array.isArray(m.content)) return false;
      const types = m.content.map((p) => (p as { type?: string }).type);
      return types.includes("file") && types.includes("text");
    });
    expect(
      agentAudioWithText,
      "agent audio message is missing its transcript text part",
    ).toBe(true);
  }, 240_000);

  it("pulls a site up on the room screen when asked to see something", async () => {
    const result = await scenario.run({
      name: "spoken request opens a browser",
      description:
        "A founder asks to see the new website on the room screen. Max " +
        "should open it with open_url and confirm briefly.",
      agents: [
        maxUnderTest(),
        scenario.userSimulatorAgent({
          voice: "openai/nova",
          persona:
            "You are SPEAKING in a meeting room. Ask Max to pull up the new " +
            "website on the screen so everyone can see it. One sentence.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made an open_url tool call for the website",
            "Max indicated out loud, briefly, that it is on the screen",
            "Max did not try to build or edit the page itself",
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
    saveRecording(result.audio, "site-on-screen");
  }, 240_000);

  it("answers progress questions from the room channels", async () => {
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
            "going in the rooms, naturally, in one sentence.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made a check_progress tool call",
            "Max reported the status out loud briefly (it is fine if no rooms are running yet)",
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

  it("opens a GitHub issue, then spins a room to fix it", async () => {
    const result = await scenario.run({
      name: "issue on screen then a room to fix it",
      description:
        "The team spotted a GitHub issue. Max should first put it on the " +
        "screen (open_url), then when asked, spin up a room of agents to fix " +
        "it (spawn_room) — confirming briefly each time.",
      agents: [
        maxUnderTest(),
        scenario.userSimulatorAgent({
          voice: "openai/nova",
          persona:
            "You are SPEAKING in a meeting room, decisive and brief. First " +
            "ask Max to open issue 1234 on langwatch on the screen. After it " +
            "is up, ask him to get a couple of agents to fix it. One short " +
            "sentence per turn.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made an open_url tool call for the langwatch issue 1234",
            "When asked to fix it, Max made a spawn_room tool call (not another open_url)",
            "Max confirmed each step out loud in one short sentence",
          ],
        }),
      ],
      script: [
        scenario.user(),
        scenario.agent(), // open_url tool turn
        scenario.agent(), // spoken confirmation
        scenario.user(),
        scenario.agent(), // spawn_room tool turn
        scenario.agent(), // spoken confirmation
        scenario.judge(),
      ],
      maxTurns: 12,
    });
    expect(result.success, result.reasoning).toBe(true);
    saveRecording(result.audio, "issue-then-room");
  }, 300_000);

  it("shuts a room down when the team is done with it", async () => {
    const result = await scenario.run({
      name: "tear a room down by voice",
      description:
        "The team is done with the dark mode work and wants the room gone. " +
        "Max should close it with close_room and confirm briefly.",
      agents: [
        maxUnderTest(),
        scenario.userSimulatorAgent({
          voice: "openai/nova",
          persona:
            "You are SPEAKING in a meeting room. You are done with the dark " +
            "mode work and want it cleaned up. Tell Max to kill the dark mode " +
            "room. One short sentence.",
        }),
        scenario.judgeAgent({
          criteria: [
            "Max made a close_room tool call for the dark mode room",
            "Max confirmed out loud, briefly, that the room is shut down (it is fine if the room was not running)",
            "Max did not spin up a new room or add agents",
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
    saveRecording(result.audio, "close-room");
  }, 240_000);
});
