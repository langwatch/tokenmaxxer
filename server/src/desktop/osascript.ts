import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Run an AppleScript snippet, return trimmed stdout. macOS only. */
export async function osa(script: string, timeoutMs = 8000): Promise<string> {
  const { stdout } = await exec("osascript", ["-e", script], {
    timeout: timeoutMs,
  });
  return stdout.trim();
}

/** True when a .app bundle is installed under either Applications dir. */
export async function appInstalled(name: string): Promise<boolean> {
  for (const base of ["/Applications", "/System/Applications"]) {
    try {
      await exec("test", ["-d", `${base}/${name}.app`]);
      return true;
    } catch {
      // not here
    }
  }
  return false;
}
