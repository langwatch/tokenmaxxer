/**
 * Full room QA: drives the REAL desktop-enabled gateway with spoken (text)
 * turns and watches the desktop come alive — a browser window for the site,
 * the KanbanCode board pinned top-left on the room's channel, Warp terminals
 * fanning out as the agents pour in. Run with the gateway up on :4870 with
 * TOKENMAXXER_DESKTOP=1.
 *
 *   npx tsx scripts/qa-room-e2e.ts
 */
import { execFileSync } from "node:child_process";
import { GatewayClient } from "../tests/helpers/gateway.js";

const url = process.env.GATEWAY_URL ?? "ws://localhost:4870/realtime";
const AGENTS = Number(process.env.QA_AGENTS ?? 3);
const TOPIC = process.env.QA_TOPIC ?? "qa dark mode";
const SHOT_DIR = "/Users/rchaves/Projects/tokenmaxxer/.claude/tmp/qa";
const shot = (name: string) => {
  try {
    execFileSync("mkdir", ["-p", SHOT_DIR]);
    execFileSync("screencapture", ["-x", `${SHOT_DIR}/${name}`]);
    console.log(`  📸 ${name}`);
  } catch (err) {
    console.log(`  (screencapture failed: ${(err as Error).message})`);
  }
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toolFinished(tool: string) {
  return (e: Record<string, unknown>) =>
    e.type === "tokenmaxxer.tool" && e.tool === tool && e.phase === "finished";
}

const c = new GatewayClient();
await c.connect(url);
await c.configureManualTurns();
console.log("connected to", url);

// Turn 1 — open the live site on the room screen.
console.log(`\n[1] "pull up the new website"`);
c.sayText("Pull up the new website for us on the screen.");
const open = await c.waitFor(toolFinished("open_url"), 30_000);
console.log("    open_url →", JSON.stringify(open.args));
await delay(3500);
shot("room-1-website.png");

// Turn 2 — spin up a room of agents on the site.
console.log(`\n[2] "get ${AGENTS} agents on a full dark mode for the website"`);
c.sayText(
  `Get ${AGENTS} agents on a full dark mode for the website. Make every page dark by default, keep contrast readable.`,
);
const spawn = await c.waitFor(toolFinished("spawn_room"), 30_000);
console.log("    spawn_room →", JSON.stringify(spawn.args));
const fleet = await c.waitFor(
  (e) => e.type === "tokenmaxxer.fleet" && (e.agents as unknown[]).length > 0,
  30_000,
);
console.log(`    fleet now has ${(fleet.agents as unknown[]).length} agents`);

// Give the agents time to launch, join the channel, and start talking.
console.log("    waiting for agents to launch + join the channel…");
await delay(28_000);
shot("room-2-full-desktop.png");

// Show the channel chatter — proof the swarm self-organized.
const channel = String((spawn.args as { topic?: string }).topic ?? TOPIC)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
console.log(`\n[3] channel #${channel} history:`);
try {
  const hist = execFileSync("kanban", ["channel", "history", channel, "-n", "20"], {
    encoding: "utf8",
  });
  console.log(hist);
} catch (err) {
  console.log("  (could not read channel:", (err as Error).message, ")");
}

c.close();
console.log("\ndone — screenshots in", SHOT_DIR);
process.exit(0);
