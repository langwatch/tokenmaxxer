/**
 * Delegation routing — the tool Max picks IS the decision. This drives the
 * REAL gateway (Inworld gemma-4 tool calling) with a labeled set of spoken
 * requests and asserts each routes to the right action:
 *   - real work spins up a ROOM of agents      → spawn_room
 *   - showing something on the screen           → open_url
 *   - a follow-up to a room already in flight   → add_agents / message_room
 *   - a status question                         → check_progress
 * Binds specs/room-orchestration.feature and specs/meeting-agent.feature.
 *
 * The room engine runs in dry-run so spawn routing never launches real tmux
 * agents — we only assert which tool fired. spawn_room still creates a real
 * kanban channel as a side effect, so any channel created here is deleted in
 * afterAll. Not part of CI (needs the live Inworld API).
 */
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  GatewayClient,
  startTestServer,
  type TestServer,
} from "./helpers/gateway.js";

let server: TestServer;
let channelsBefore = new Set<string>();

function listChannels(): Set<string> {
  try {
    const out = execFileSync("kanban", ["channel", "list", "--json"], {
      encoding: "utf8",
    });
    const rows = JSON.parse(out) as { name: string }[];
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

beforeAll(async () => {
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

/** Send one text turn, return the first tool Max calls. */
async function routeOf(text: string): Promise<string> {
  const client = new GatewayClient();
  await client.connect(server.url);
  await client.configureManualTurns();
  client.sayText(text);
  const evt = await client.waitFor(
    (e) => e.type === "tokenmaxxer.tool" && e.phase === "started",
    60_000,
  );
  client.close();
  return String(evt.tool);
}

describe("delegation — real work spins up a room", () => {
  const roomRequests = [
    "Get five agents on a full dark mode for the website.",
    "Spin up a room to fix the broken login.",
    "Have a couple of agents research the cat-sitter market.",
    "Build a Stripe integration in a separate service.",
  ];
  for (const text of roomRequests) {
    it(`"${text.slice(0, 38)}…" → spawn_room`, async () => {
      expect(await routeOf(text)).toBe("spawn_room");
    }, 90_000);
  }
});

describe("delegation — showing something opens a browser", () => {
  const urlRequests = [
    "Pull up the new website on the screen.",
    "Open issue 1234 on langwatch.",
    "Show me the langwatch repo.",
  ];
  for (const text of urlRequests) {
    it(`"${text.slice(0, 38)}…" → open_url`, async () => {
      expect(await routeOf(text)).toBe("open_url");
    }, 90_000);
  }
});

describe("delegation — follow-ups reach a running room", () => {
  it("'throw two more agents at the dark mode room' → add_agents", async () => {
    expect(await routeOf("Throw two more agents at the dark mode room.")).toBe(
      "add_agents",
    );
  }, 90_000);

  it("'tell the dark mode room to keep the logo readable' → message_room", async () => {
    expect(
      await routeOf("Tell the dark mode room to keep the logo readable on black."),
    ).toBe("message_room");
  }, 90_000);
});

describe("delegation — status questions read the channel", () => {
  const statusRequests = [
    "How's it going in there?",
    "What's everyone working on right now?",
  ];
  for (const text of statusRequests) {
    it(`"${text.slice(0, 38)}…" → check_progress`, async () => {
      expect(await routeOf(text)).toBe("check_progress");
    }, 90_000);
  }
});

describe("delegation — the page-codegen tools are gone", () => {
  it("a request that used to make a page now goes to a room or the screen, never a page tool", async () => {
    const tool = await routeOf(
      "Put a landing page for our cat-sitting startup together.",
    );
    expect(["spawn_room", "open_url"]).toContain(tool);
    expect(["write_page", "edit_page", "open_page", "set_page_model"]).not.toContain(
      tool,
    );
  }, 90_000);
});
