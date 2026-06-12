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

/** True when the pane shows claude actively generating. */
export function looksBusy(capture: string): boolean {
  return /esc to interrupt/i.test(capture);
}
