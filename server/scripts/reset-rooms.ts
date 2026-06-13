/**
 * Clean slate between dogfood / demo / scenario runs: kill the room agents,
 * delete the room channels (keeping the team coordination channels), and put
 * the live site back to baseline (drop agent worktrees + branches, clean the
 * served checkout). Run this, then talk to Max again from zero.
 *
 *   npx tsx scripts/reset-rooms.ts
 *
 * Keep extra channels with TOKENMAXXER_KEEP_CHANNELS=a,b,c. Skip the site
 * revert with TOKENMAXXER_RESET_NO_SITE=1.
 */
import "dotenv/config";
import { resetRooms } from "../tests/helpers/reset.js";

const { killed, deletedChannels } = resetRooms({
  site: process.env.TOKENMAXXER_RESET_NO_SITE !== "1",
});

console.log(`🧹 killed ${killed.length} agent session(s): ${killed.join(", ") || "(none)"}`);
console.log(
  `🧹 deleted ${deletedChannels.length} room channel(s): ${deletedChannels.join(", ") || "(none)"}`,
);
if (process.env.TOKENMAXXER_RESET_NO_SITE !== "1") {
  console.log("🧹 site baselined: agent worktrees + branches dropped, served checkout clean.");
}
console.log("✨ clean slate — say the word to Max.");
