/**
 * Delegation eval — does Max route a spoken request to the RIGHT action?
 *
 * This is the measurable core of the pivot: the whole product is Max turning
 * meeting talk into the correct move — spin up a ROOM of agents (spawn_room),
 * put something on the screen (open_url), steer a running room (message_room /
 * add_agents), or read the channel (check_progress). It drives the REAL
 * gateway (Inworld gemma-4 tool calling) over a labeled set of utterances,
 * scores the tool it picks, logs per-item correctness to LangWatch, and prints
 * overall accuracy + a confusion table.
 *
 * Context matters: "throw two more agents at it" only makes sense once a room
 * exists, so follow-up cases carry a `setup` that spins that room up first (in
 * the same conversation) — exactly the state they're spoken in during the
 * demo. The engine runs dry-run so nothing real launches; the kanban channels
 * created as a side effect are deleted at the end.
 *
 * Run: npx tsx scripts/experiment-delegation.ts
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { LangWatch } from "langwatch";
import { GatewayClient, startTestServer } from "../tests/helpers/gateway.js";

type Tool = "spawn_room" | "open_url" | "add_agents" | "message_room" | "check_progress";
interface Case {
  utterance: string;
  expected: Tool;
  /** Spoken first, in the same conversation, to establish realistic context. */
  setup?: string[];
}

// Rooms that follow-up cases assume are already running.
const DARK_ROOM = "Get three agents on dark mode for the website.";
const LOGIN_ROOM = "Spin up a room to fix the login.";

// Meeting-room utterances labeled with the move Max should make.
const DATASET: Case[] = [
  // Real work -> a room of agents (context-free)
  { utterance: "Get five agents on a full dark mode for the website.", expected: "spawn_room" },
  { utterance: "Spin up a room to fix the broken login.", expected: "spawn_room" },
  { utterance: "Have a couple of agents research the cat-sitter market.", expected: "spawn_room" },
  { utterance: "Build a Stripe integration in a separate service.", expected: "spawn_room" },
  { utterance: "Throw a team at redesigning the pricing page.", expected: "spawn_room" },
  { utterance: "Someone should look into why the dashboard is slow.", expected: "spawn_room" },
  // Show something -> a browser window (context-free, the demo openers)
  { utterance: "Pull up the new website on the screen.", expected: "open_url" },
  { utterance: "Open issue 1234 on langwatch.", expected: "open_url" },
  { utterance: "Show me the langwatch repo.", expected: "open_url" },
  { utterance: "Put the live site on the screen for everyone.", expected: "open_url" },
  // Steer a running room (needs a room first)
  { utterance: "Throw two more agents at the dark mode room.", expected: "add_agents", setup: [DARK_ROOM] },
  { utterance: "Double the team on the login fix.", expected: "add_agents", setup: [LOGIN_ROOM] },
  { utterance: "Tell the dark mode room to keep the logo readable on black.", expected: "message_room", setup: [DARK_ROOM] },
  { utterance: "Remind the login room to write tests as they go.", expected: "message_room", setup: [LOGIN_ROOM] },
  // Status -> read the channel (needs a room first)
  { utterance: "How's it going in there?", expected: "check_progress", setup: [DARK_ROOM] },
  { utterance: "What's everyone working on right now?", expected: "check_progress", setup: [DARK_ROOM] },
  { utterance: "Give me a quick status on the rooms.", expected: "check_progress", setup: [DARK_ROOM] },
];

function listChannels(): Set<string> {
  try {
    const out = execFileSync("kanban", ["channel", "list", "--json"], { encoding: "utf8" });
    return new Set((JSON.parse(out) as { name: string }[]).map((r) => r.name));
  } catch {
    return new Set();
  }
}

const channelsBefore = listChannels();
const server = await startTestServer({ TOKENMAXXER_FLEET_DRYRUN: "1" });

/** Drive one utterance (after any setup turns) and return the first tool Max calls. */
async function toolFor(text: string, setup: string[] = []): Promise<string | null> {
  const client = new GatewayClient();
  try {
    await client.connect(server.url);
    await client.configureManualTurns();
    for (const s of setup) {
      client.sayText(s);
      // Let the WHOLE setup turn complete — the tool call, its execution, AND
      // Max's spoken acknowledgement — before the next user turn. Firing the
      // follow-up mid-ack means it isn't heard in context and the routing is
      // garbage (this is exactly what made follow-ups look broken at first).
      await client.waitFor(
        (e) => e.type === "tokenmaxxer.tool" && e.phase === "finished",
        60_000,
      );
      await client
        .waitFor((e) => e.type === "response.output_audio_transcript.done", 30_000)
        .catch(() => {});
    }
    client.sayText(text);
    const evt = await client.waitFor(
      (e) => e.type === "tokenmaxxer.tool" && e.phase === "started",
      60_000,
    );
    return String(evt.tool);
  } catch {
    return null;
  } finally {
    client.close();
  }
}

const langwatch = new LangWatch();
const evaluation = await langwatch.experiments.init("tokenmaxxer-delegation");

let correct = 0;
const confusion: Record<string, Record<string, number>> = {};

await evaluation.run(DATASET, async ({ item, index }) => {
  const got = await toolFor(item.utterance, item.setup);
  const ok = got === item.expected;
  if (ok) correct++;
  const row = (confusion[item.expected] ??= {});
  row[got ?? "(none)"] = (row[got ?? "(none)"] ?? 0) + 1;

  evaluation.log("delegation/correct", {
    index,
    passed: ok,
    data: {
      utterance: item.utterance,
      expected: item.expected,
      got: got ?? "(none)",
      in_context: Boolean(item.setup?.length),
    },
  });
  console.log(
    `${ok ? "✅" : "❌"} expected=${item.expected.padEnd(14)} got=${(got ?? "(none)").padEnd(14)} "${item.utterance.slice(0, 50)}"`,
  );
});

const pct = ((100 * correct) / DATASET.length).toFixed(0);
console.log(`\n=== DELEGATION ACCURACY: ${correct}/${DATASET.length} = ${pct}% ===`);
console.log("\nconfusion (expected → what Max actually picked):");
for (const [expected, got] of Object.entries(confusion)) {
  const parts = Object.entries(got).map(([k, v]) => `${k}:${v}`).join("  ");
  console.log(`  ${expected.padEnd(14)} → ${parts}`);
}

// Clean up the channels the rooms created as a side effect.
for (const name of listChannels()) {
  if (!channelsBefore.has(name)) {
    try {
      execFileSync("kanban", ["channel", "delete", name, "--json"], { stdio: "ignore" });
    } catch {
      // best effort
    }
  }
}

server.stop();
process.exit(0);
