import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { log } from "../log.js";

const exec = promisify(execFile);

/**
 * Thin wrapper over the kanban CLI — the tmux hands of the orchestrator.
 * Every call shells out; all output is JSON via -j.
 */

export interface LaunchResult {
  action: string;
  tmuxName: string;
  sessionId: string;
  card?: { id: string };
}

export async function kanbanLaunch(
  slug: string,
  cwd: string,
  model: string,
): Promise<LaunchResult> {
  const { stdout } = await exec("kanban", [
    "launch",
    slug,
    "--cwd",
    cwd,
    "--model",
    model,
    "--json",
  ]);
  return JSON.parse(stdout) as LaunchResult;
}

export async function kanbanSend(card: string, message: string): Promise<void> {
  await exec("kanban", ["send", card, message, "--json"], {
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function kanbanCapture(card: string): Promise<string> {
  const { stdout } = await exec("kanban", ["capture", card], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

export async function kanbanKill(tmuxName: string): Promise<void> {
  try {
    await exec("tmux", ["kill-session", "-t", tmuxName]);
  } catch (err) {
    log("kanban", `kill ${tmuxName} failed: ${(err as Error).message}`);
  }
}

/** The handle Max posts under when speaking into a room channel. */
export const MAX_HANDLE = "max";

/** Create a channel (idempotent — already-exists is fine). */
export async function kanbanChannelCreate(channel: string): Promise<void> {
  try {
    await exec("kanban", ["channel", "create", channel, "--as", MAX_HANDLE, "--json"]);
  } catch (err) {
    // Re-creating an existing channel is not an error for us.
    log("kanban", `channel create ${channel}: ${(err as Error).message}`);
  }
}

/** Broadcast a message into a channel as a given handle (Max by default). */
export async function kanbanChannelSend(
  channel: string,
  message: string,
  as: string = MAX_HANDLE,
): Promise<void> {
  await exec("kanban", ["channel", "send", channel, message, "--as", as, "--json"], {
    maxBuffer: 10 * 1024 * 1024,
  });
}

/** Recent channel history as raw text, for composing a progress report. */
export async function kanbanChannelHistory(
  channel: string,
  n = 20,
): Promise<string> {
  try {
    const { stdout } = await exec(
      "kanban",
      ["channel", "history", channel, "-n", String(n)],
      { maxBuffer: 10 * 1024 * 1024 },
    );
    return stdout;
  } catch {
    return "";
  }
}

/** Bring the KanbanCode app forward, focused on a channel (deep link). */
export async function kanbanChannelOpen(channel: string): Promise<void> {
  try {
    await exec("kanban", ["channel", "open", channel]);
  } catch (err) {
    log("kanban", `channel open ${channel} failed: ${(err as Error).message}`);
  }
}

/** True when the pane shows claude actively generating. */
export function looksBusy(capture: string): boolean {
  return /esc to interrupt/i.test(capture);
}
