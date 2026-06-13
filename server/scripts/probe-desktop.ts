/**
 * Proves the macOS desktop controller for real: opens a chromeless browser
 * window tiled top-right showing the playground, opens a Warp terminal tiled
 * bottom-right attached to a tmux session, fires a notification, screenshots
 * the tiling, then cleans up.
 *
 * Run with the playground up: TOKENMAXXER_DESKTOP=1 npx tsx scripts/probe-desktop.ts
 */
import { execFileSync } from "node:child_process";
import { MacDesktopController } from "../src/desktop/mac.js";

const d = new MacDesktopController();
console.log("screen:", await d.screen());

await d.openBrowser({
  url: "http://localhost:5171/",
  key: "prototype",
  slot: "top-right",
});
console.log("opened browser top-right");

execFileSync("tmux", [
  "new-session",
  "-d",
  "-s",
  "tmx-desktopprobe",
  "echo 'this is a worker agent terminal — claude code would run here'; exec sleep 60",
]);
await d.openTerminal({
  command: "tmux attach -t tmx-desktopprobe",
  title: "desktop probe agent",
  key: "desktopprobe",
  slot: "bottom-right",
});
console.log("opened terminal bottom-right");

await d.notify({
  title: "tokenmaxxer",
  message: "Pricing page is live and the fleet is on the cat market.",
  openUrl: "https://github.com/langwatch/tokenmaxxer/pull/1",
});
console.log("fired notification");

await new Promise((r) => setTimeout(r, 3000));
execFileSync("screencapture", [
  "-x",
  "/Users/rchaves/Projects/tokenmaxxer/.claude/tmp/qa/desktop-tiling.png",
]);
console.log("screenshot captured");

await new Promise((r) => setTimeout(r, 2000));
await d.closeManaged();
try {
  execFileSync("tmux", ["kill-session", "-t", "tmx-desktopprobe"]);
} catch {
  // already gone
}
console.log("cleaned up");
