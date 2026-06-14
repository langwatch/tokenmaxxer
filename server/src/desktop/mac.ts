import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { log } from "../log.js";
import { appInstalled, osa } from "./osascript.js";
import { regionForSlot } from "./tiler.js";
import type {
  DesktopController,
  NotifyOptions,
  OpenBrowserOptions,
  OpenTerminalOptions,
  ScreenRegion,
} from "./types.js";

/** Height of the macOS menu bar to keep windows clear of, in points. */
const MENU_BAR_INSET = 28;

const WARP_LAUNCH_DIR = path.join(os.homedir(), ".warp", "launch_configurations");
const CHROME_BIN =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CHROME_DATA_ROOT = path.join(os.tmpdir(), "tokenmaxxer-chrome");
/** System Events process name for the KanbanCode native app (the board). */
const KANBAN_APP_PROCESS = "KanbanCode";

function escapeForApplescript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * macOS desktop control via AppleScript. Browser prototypes open as real
 * Chrome windows; heavy agents open as Warp windows attached to their tmux
 * session; window placement uses the System Events accessibility API, which
 * works for any app. All actions are best-effort and swallow errors so a
 * desktop hiccup never breaks a tool call.
 */
export class MacDesktopController implements DesktopController {
  readonly platform = "darwin";
  readonly enabled = true;

  /** key → spawned Chrome app-instance (pid + the URL it currently shows). */
  private browserWindows = new Map<string, { pid: number; url: string }>();
  /** key → Warp launch-config name, for cleanup. */
  private warpConfigs = new Map<string, string>();
  private terminalPreference =
    process.env.TOKENMAXXER_TERMINAL ?? "warp";

  async screen(): Promise<ScreenRegion> {
    try {
      const raw = await osa(
        'tell application "Finder" to get bounds of window of desktop',
      );
      const [, , w, h] = raw.split(",").map((n) => parseInt(n.trim(), 10));
      return {
        x: 0,
        y: MENU_BAR_INSET,
        width: w || 1512,
        height: (h || 982) - MENU_BAR_INSET,
      };
    } catch {
      return { x: 0, y: MENU_BAR_INSET, width: 1512, height: 982 - MENU_BAR_INSET };
    }
  }

  async openBrowser(opts: OpenBrowserOptions): Promise<void> {
    try {
      const region = regionForSlot(opts.slot, await this.screen());
      const existing = this.browserWindows.get(opts.key);
      // Reuse the window ONLY if its process is still alive. A chromeless app
      // instance quits when its last window closes, so once the user closes the
      // page the pid is dead — and raising a dead pid silently does nothing,
      // which shows up as "open_url fired but no Chrome appeared". When the
      // entry is stale, fall through and spawn a fresh window.
      if (existing && this.pidAlive(existing.pid)) {
        if (existing.url === opts.url) {
          // Same page: Vite HMR already pushed any file change into the open
          // window — just raise it to the front.
          await this.raiseProcess(existing.pid);
          return;
        }
        // Different page in the same logical window: close and reopen at the
        // same slot (chromeless app windows don't take navigation commands).
        this.killPid(existing.pid);
      }
      if (existing) this.browserWindows.delete(opts.key);
      const pid = this.spawnChromeApp(opts.url, region, opts.key);
      if (pid !== null) this.browserWindows.set(opts.key, { pid, url: opts.url });
    } catch (err) {
      log("desktop", `openBrowser failed: ${(err as Error).message}`);
    }
  }

  /** Whether a pid is still running (signal 0 tests existence, kills nothing). */
  private pidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async reloadBrowser(key: string): Promise<boolean> {
    // The prototype site hot-reloads on file change via Vite HMR, so an open
    // window already reflects edits. Report whether we have a live window.
    return this.browserWindows.has(key);
  }

  /**
   * A chromeless Chrome app-instance: a separate user-data-dir gives it its
   * own pid (so we can track, raise and close it), and the geometry flags
   * place it on the CURRENT Space — avoiding AppleScript's habit of opening
   * windows on whatever Space the main Chrome already lives on.
   */
  private spawnChromeApp(
    url: string,
    region: ScreenRegion,
    key: string,
  ): number | null {
    const dataDir = path.join(CHROME_DATA_ROOT, key.replace(/[^a-zA-Z0-9]/g, "-"));
    const child = spawn(
      CHROME_BIN,
      [
        `--user-data-dir=${dataDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        `--window-position=${region.x},${region.y}`,
        `--window-size=${region.width},${region.height}`,
        `--app=${url}`,
      ],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
    return child.pid ?? null;
  }

  private async raiseProcess(pid: number): Promise<void> {
    try {
      await osa(
        `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`,
      );
    } catch {
      // window may have been closed by the user; harmless
    }
  }

  private killPid(pid: number): void {
    try {
      process.kill(pid);
    } catch {
      // already gone
    }
  }

  async openTerminal(opts: OpenTerminalOptions): Promise<void> {
    const region = regionForSlot(opts.slot, await this.screen());
    const useWarp =
      this.terminalPreference === "warp" && (await appInstalled("Warp"));
    try {
      if (useWarp) {
        await this.openWarp(opts, region);
      } else if (await appInstalled("iTerm")) {
        await this.openITerm(opts, region);
      } else {
        await this.openAppleTerminal(opts, region);
      }
    } catch (err) {
      log("desktop", `openTerminal failed: ${(err as Error).message}`);
    }
  }

  private async openWarp(
    opts: OpenTerminalOptions,
    region: ScreenRegion,
  ): Promise<void> {
    const name = `tokenmaxxer-${opts.key}`.replace(/[^a-zA-Z0-9-]/g, "-");
    fs.mkdirSync(WARP_LAUNCH_DIR, { recursive: true });
    const yaml = `---
name: ${name}
windows:
  - tabs:
      - title: ${opts.title}
        layout:
          cwd: "~"
          commands:
            - exec: ${opts.command}
`;
    fs.writeFileSync(path.join(WARP_LAUNCH_DIR, `${name}.yaml`), yaml);
    this.warpConfigs.set(opts.key, name);
    // Warm Warp first so a cold start doesn't lose the launch, then open the
    // session window.
    await osa(`do shell script "open -a Warp"`);
    await delay(400);
    await osa(`do shell script "open 'warp://launch/${name}'"`);
    // Warp brings the new window to front; poll until it exists, then tile it.
    await this.positionFrontWindow("stable", region);
  }

  private async openITerm(
    opts: OpenTerminalOptions,
    region: ScreenRegion,
  ): Promise<void> {
    await osa(
      `tell application "iTerm"
         create window with default profile
         tell current session of current window to write text "${escapeForApplescript(opts.command)}"
       end tell`,
    );
    await delay(600);
    await this.positionFrontWindow("iTerm2", region);
  }

  private async openAppleTerminal(
    opts: OpenTerminalOptions,
    region: ScreenRegion,
  ): Promise<void> {
    await osa(
      `tell application "Terminal" to do script "${escapeForApplescript(opts.command)}"`,
    );
    await delay(600);
    await this.positionFrontWindow("Terminal", region);
  }

  /**
   * Move + size the frontmost window of a process via accessibility, polling
   * until the window exists (a freshly launched terminal can take a couple of
   * seconds to draw its first window).
   */
  private async positionFrontWindow(
    processName: string,
    region: ScreenRegion,
    maxTries = 14,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxTries; attempt++) {
      try {
        await osa(
          `tell application "System Events" to tell process "${processName}"
             set position of window 1 to {${region.x}, ${region.y}}
             set size of window 1 to {${region.width}, ${region.height}}
           end tell`,
        );
        return;
      } catch {
        await delay(400);
      }
    }
    // Accessibility not granted, or the window never appeared — the terminal
    // still opened, just untiled.
    log("desktop", `could not tile ${processName} after polling`);
  }

  async notify(opts: NotifyOptions): Promise<void> {
    try {
      const subtitle = opts.openUrl ? ` subtitle "${escapeForApplescript(opts.openUrl)}"` : "";
      await osa(
        `display notification "${escapeForApplescript(opts.message)}" with title "${escapeForApplescript(opts.title)}"${subtitle}`,
      );
    } catch (err) {
      log("desktop", `notify failed: ${(err as Error).message}`);
    }
  }

  async focusChannel(channel: string): Promise<void> {
    try {
      // Drop the marker KanbanCode drains on activation to auto-select this
      // channel, written BEFORE we bring the app forward so it's on disk when
      // applicationDidBecomeActive fires. A plain file (no deep link) keeps the
      // quit-dialog fix intact; a write failure just means no auto-select.
      this.writeFocusMarker(channel);
      const region = regionForSlot("top-left", await this.screen());
      // Bring the ALREADY-RUNNING KanbanCode forward via accessibility, NOT the
      // kanbancode:// deep link. The deep link can relaunch a stale registered
      // build and trip KanbanCode's quit-protection dialog mid-demo; activating
      // the live process by name never launches anything, so no dialog. (Channel
      // auto-select rode on the deep link, so we drop it — the board still comes
      // forward on the room; a non-relaunching select is a KanbanCode-side job.)
      await osa(
        `tell application "System Events"
           if exists (process "${KANBAN_APP_PROCESS}") then
             set frontmost of process "${KANBAN_APP_PROCESS}" to true
           end if
         end tell`,
      ).catch(() => {});
      // Pin the board to the top-left quarter so it's the room's focal point
      // while terminals fan out below and the screen sits top-right.
      await delay(300);
      // The board window already exists (we never relaunch the app), so a few
      // tries is plenty: attempt 1 lands when accessibility is granted, and a
      // miss fails fast in ~1s instead of stalling the spawn flow for ~5.6s.
      await this.positionFrontWindow(KANBAN_APP_PROCESS, region, 3);
      log("desktop", `focused board top-left (room #${channel})`);
    } catch (err) {
      log("desktop", `focusChannel failed: ${(err as Error).message}`);
    }
  }

  /**
   * Write the channel slug to the marker KanbanCode reads (and drains) in
   * applicationDidBecomeActive to auto-select that channel. Best-effort.
   */
  private writeFocusMarker(channel: string): void {
    try {
      const marker = path.join(os.homedir(), ".kanban-code", "focus-channel");
      fs.mkdirSync(path.dirname(marker), { recursive: true });
      fs.writeFileSync(marker, channel);
    } catch {
      // best effort — no marker just means no auto-select, never a broken focus
    }
  }

  async closeWindow(key: string): Promise<void> {
    // A browser window we own: kill its app-instance pid.
    const browser = this.browserWindows.get(key);
    if (browser) {
      this.killPid(browser.pid);
      this.browserWindows.delete(key);
    }
    // A terminal window: close the Warp window carrying this session's title,
    // then drop its launch config. TARGETED — the matched window's own close
    // button, never a global Cmd+W — so a loose title match can't take down an
    // unrelated window. Best-effort: a leftover dead pane is cosmetic.
    try {
      await osa(
        `tell application "System Events"
           if exists (process "Warp") then
             tell process "Warp"
               repeat with w in (every window)
                 try
                   if (name of w) contains "${escapeForApplescript(key)}" then
                     click (first button of w whose subrole is "AXCloseButton")
                   end if
                 end try
               end repeat
             end tell
           end if
         end tell`,
      );
    } catch {
      // best effort
    }
    const name = this.warpConfigs.get(key);
    if (name) {
      try {
        fs.rmSync(path.join(WARP_LAUNCH_DIR, `${name}.yaml`), { force: true });
      } catch {
        // best effort
      }
      this.warpConfigs.delete(key);
    }
  }

  async closeManaged(): Promise<void> {
    for (const { pid } of this.browserWindows.values()) {
      this.killPid(pid);
    }
    this.browserWindows.clear();
    for (const name of this.warpConfigs.values()) {
      try {
        fs.rmSync(path.join(WARP_LAUNCH_DIR, `${name}.yaml`), { force: true });
      } catch {
        // best effort
      }
    }
    this.warpConfigs.clear();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
