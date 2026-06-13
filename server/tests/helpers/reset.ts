/**
 * Clean slate between dogfood / demo / scenario runs. Three independent moves,
 * all best-effort (never throw — a reset must not be the thing that breaks):
 *   - kill the room-agent tmux sessions (slug prefix), leaving the human/fork
 *     cards alone
 *   - delete the room channels, keeping the team coordination channels
 *   - put the live site back to baseline: drop agent worktrees + branches and
 *     clean the served checkout
 *
 * Used by scripts/reset-rooms.ts (manual, between dogfood runs) and by the
 * voice scenarios' beforeAll (fresh state every run).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Channels that are NOT rooms — team coordination, never deleted. */
const KEEP_CHANNELS = (
  process.env.TOKENMAXXER_KEEP_CHANNELS ??
  "get-the-dgx-hackathon,langwatch-nlp-go-migration,langwatch-ai-gateway,langwatch-npx,bugfixes"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Room-agent tmux sessions are named with this slug prefix (config.fleetPrefix). */
const FLEET_PREFIX = process.env.TOKENMAXXER_FLEET_PREFIX ?? "tmx-";

/** The checkout vite serves on screen — the one the demo's HMR reflects. */
const SITE_DIR =
  process.env.TOKENMAXXER_SITE_DIR ?? path.join(os.homedir(), "Projects", "2lang-2watch");

function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/** Kill every room-agent tmux session, leaving the human/fork cards running. */
export function killRoomAgents(): string[] {
  const sessions = run("tmux", ["list-sessions", "-F", "#S"]).trim().split("\n").filter(Boolean);
  const killed: string[] = [];
  for (const s of sessions) {
    if (s.startsWith(FLEET_PREFIX)) {
      run("tmux", ["kill-session", "-t", s]);
      killed.push(s);
    }
  }
  return killed;
}

/** Delete every channel except the coordination ones we keep. */
export function deleteRoomChannels(): string[] {
  let names: string[] = [];
  try {
    names = (JSON.parse(run("kanban", ["channel", "list", "--json"])) as { name: string }[]).map(
      (r) => r.name,
    );
  } catch {
    // no channels, or kanban unavailable
  }
  const deleted: string[] = [];
  for (const name of names) {
    if (!KEEP_CHANNELS.includes(name)) {
      run("kanban", ["channel", "delete", name, "--json"]);
      // `channel delete` keeps the append-only log, so a re-created channel of
      // the same name would replay stale history — drop it for a clean slate.
      try {
        fs.rmSync(path.join(os.homedir(), ".kanban-code", "channels", `${name}.jsonl`), {
          force: true,
        });
      } catch {
        // best effort
      }
      deleted.push(name);
    }
  }
  return deleted;
}

/** Baseline the served site: drop agent worktrees + branches, clean the checkout. */
export function revertSite(): void {
  if (!fs.existsSync(SITE_DIR)) return;
  // Remove agent worktrees (every worktree that is not the served checkout).
  const wt = run("git", ["-C", SITE_DIR, "worktree", "list", "--porcelain"]);
  for (const line of wt.split("\n")) {
    const m = line.match(/^worktree (.+)$/);
    if (m && path.resolve(m[1]) !== path.resolve(SITE_DIR)) {
      run("git", ["-C", SITE_DIR, "worktree", "remove", "--force", m[1]]);
    }
  }
  run("git", ["-C", SITE_DIR, "worktree", "prune"]);
  // Delete the branches agents left behind.
  const branches = run("git", ["-C", SITE_DIR, "branch"])
    .split("\n")
    .map((b) => b.replace(/^[*+\s]+/, "").trim())
    .filter(Boolean);
  for (const b of branches) {
    if (/^(contrib\/|worktree-|tmx-)/.test(b)) {
      run("git", ["-C", SITE_DIR, "branch", "-D", b]);
    }
  }
  // Revert any direct edits to the served checkout.
  run("git", ["-C", SITE_DIR, "checkout", "--", "."]);
  run("git", ["-C", SITE_DIR, "clean", "-fd"]);
}

export interface ResetOptions {
  /** Kill room-agent tmux sessions (default true). */
  agents?: boolean;
  /** Delete room channels (default true). */
  channels?: boolean;
  /** Baseline the served site (default true). */
  site?: boolean;
}

/** Clean slate for the next run. Returns what was cleaned. */
export function resetRooms(opts: ResetOptions = {}): {
  killed: string[];
  deletedChannels: string[];
} {
  const killed = opts.agents === false ? [] : killRoomAgents();
  const deletedChannels = opts.channels === false ? [] : deleteRoomChannels();
  if (opts.site !== false) revertSite();
  return { killed, deletedChannels };
}
