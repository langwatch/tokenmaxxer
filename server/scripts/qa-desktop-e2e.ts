/**
 * Full Iron Man QA: drives the REAL desktop-enabled gateway with two spoken
 * (text) turns — a page request and a real-work request — and screenshots
 * the desktop as the windows fan out: the chromeless prototype window
 * top-right, the Warp+tmux+Claude terminal bottom-right, the floating HUD on
 * top. Run with `pnpm dev` (desktop on) + `pnpm hud` already up.
 */
import { execFileSync } from "node:child_process";
import { GatewayClient } from "../tests/helpers/gateway.js";

const url = process.env.GATEWAY_URL ?? "ws://localhost:4870/realtime";
const shot = (name: string) =>
  execFileSync("screencapture", [
    "-x",
    `/Users/rchaves/Projects/tokenmaxxer/.claude/tmp/qa/${name}`,
  ]);
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const c = new GatewayClient();
await c.connect(url);
await c.configureManualTurns();
console.log("connected");

// Turn 1 — a page. A real chromeless browser window should pop top-right.
c.sayText(
  "Put a landing page for PurrBnB, an airbnb for cat sitters, on the screen. Make it pop.",
);
await c.waitFor(
  (e) =>
    e.type === "tokenmaxxer.tool" &&
    (e.tool === "write_page" || e.tool === "edit_page") &&
    e.phase === "finished",
  90_000,
);
console.log("page is on screen");
await delay(4000);
shot("e2e-after-page.png");

// Turn 2 — real work. A Warp terminal with Claude Code should pop bottom-right.
c.sayText(
  "Now get an agent to implement a basic login API for it in a separate service.",
);
await c.waitFor(
  (e) => e.type === "tokenmaxxer.fleet" && (e.agents as unknown[]).length > 0,
  60_000,
);
console.log("fleet agent dispatched — terminal opening");
await delay(16000);
shot("e2e-full-desktop.png");

c.close();
console.log("done — screenshots captured");
process.exit(0);
