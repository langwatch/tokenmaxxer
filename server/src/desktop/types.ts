/**
 * Platform-agnostic desktop control contract.
 *
 * tokenmaxxer drives the real desktop: it pops browser windows for
 * prototypes and terminal windows for Claude agents, tiled around a
 * floating listening HUD. Everything OS-specific lives behind this
 * interface. macOS is implemented today (MacDesktopController); a Windows
 * teammate implements the same interface (WindowsDesktopController) without
 * touching any caller. Tests and CI use NoopDesktopController so runs stay
 * headless.
 *
 * Coordinates are logical screen points, origin top-left, matching what
 * both macOS and Windows window APIs use.
 */

export interface ScreenRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where a managed window sits. The tiler turns a slot + the usable screen
 * into a concrete ScreenRegion. "fan-out" slots subdivide the screen so the
 * room sees more at once as more windows open (the Iron Man effect).
 */
export type TileSlot =
  | "top-right"
  | "bottom-right"
  | "top-left"
  | "bottom-left"
  | "left-half"
  | "right-half"
  | "top-half"
  | "bottom-half"
  | "full";

export interface OpenBrowserOptions {
  /** URL to show. */
  url: string;
  /** Stable id so the same logical window is reused (e.g. a page slug). */
  key: string;
  /** Where to place it. */
  slot: TileSlot;
}

export interface OpenTerminalOptions {
  /** Shell command the terminal runs, e.g. `tmux attach -t tmx-foo`. */
  command: string;
  /** Window/tab title. */
  title: string;
  /** Stable id for reuse / bookkeeping. */
  key: string;
  /** Where to place it. */
  slot: TileSlot;
}

export interface NotifyOptions {
  title: string;
  message: string;
  /** If set, the notification (or a follow-up window) surfaces this URL. */
  openUrl?: string;
}

/**
 * The capability surface every platform adapter implements. All methods are
 * best-effort and must never throw into a tool handler — a desktop that
 * can't pop a window should still let the underlying effect (file written,
 * agent spawned) succeed.
 */
export interface DesktopController {
  /** "darwin" | "win32" | "noop". */
  readonly platform: string;
  /** Whether this controller actually drives windows. */
  readonly enabled: boolean;

  /** The usable screen region (menu bar / taskbar excluded). */
  screen(): Promise<ScreenRegion>;

  /** Open or reuse a browser window for `key`, placed at `slot`. */
  openBrowser(opts: OpenBrowserOptions): Promise<void>;

  /** Reload the browser window for `key` if it is still open. */
  reloadBrowser(key: string): Promise<boolean>;

  /** Open a terminal window running `command`, placed at `slot`. */
  openTerminal(opts: OpenTerminalOptions): Promise<void>;

  /** Surface a proactive notification (and optionally a URL). */
  notify(opts: NotifyOptions): Promise<void>;

  /**
   * Bring the agent board (KanbanCode) forward focused on a channel and pin
   * it to its corner of the screen, so the room watches the agents talk in
   * real time. Best-effort — a missing app must not break a spawn.
   */
  focusChannel(channel: string): Promise<void>;

  /**
   * Close the single managed window for `key` (e.g. an agent's terminal when
   * its room is torn down), leaving every other room's windows untouched.
   */
  closeWindow(key: string): Promise<void>;

  /** Tear down windows this controller opened (reset between runs). */
  closeManaged(): Promise<void>;
}
