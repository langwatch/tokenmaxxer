import { log } from "../log.js";
import { MacDesktopController } from "./mac.js";
import { NoopDesktopController } from "./noop.js";
import type { DesktopController } from "./types.js";

export type { DesktopController, ScreenRegion, TileSlot } from "./types.js";
export {
  regionForSlot,
  pageSlot,
  terminalSlotForIndex,
  prSlot,
} from "./tiler.js";

/**
 * Whether desktop control should drive real windows. On by default on macOS
 * when interactive; forced off under tests/CI; overridable with
 * TOKENMAXXER_DESKTOP=1|0. This keeps the gateway/voice/fleet test suites
 * fully headless while the real app pops windows.
 */
function desktopEnabled(): boolean {
  const flag = process.env.TOKENMAXXER_DESKTOP;
  if (flag === "1") return true;
  if (flag === "0") return false;
  if (process.env.VITEST || process.env.CI) return false;
  return process.platform === "darwin";
}

let singleton: DesktopController | null = null;

export function createDesktopController(): DesktopController {
  if (!desktopEnabled()) return new NoopDesktopController();
  if (process.platform === "darwin") {
    log("desktop", "macOS desktop control enabled");
    return new MacDesktopController();
  }
  // Windows adapter not implemented yet — see windows.ts. Fall back to Noop
  // so the app still runs (no windows, effects still happen).
  log("desktop", `no desktop adapter for ${process.platform} — running headless`);
  return new NoopDesktopController();
}

/** Process-wide desktop controller. */
export function desktop(): DesktopController {
  if (!singleton) singleton = createDesktopController();
  return singleton;
}
