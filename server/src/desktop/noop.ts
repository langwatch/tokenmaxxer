import { log } from "../log.js";
import type {
  DesktopController,
  NotifyOptions,
  OpenBrowserOptions,
  OpenTerminalOptions,
  ScreenRegion,
} from "./types.js";

/**
 * Headless controller for tests, CI, and any non-desktop host. Performs no
 * window actions; the underlying tool effects (file written, agent spawned)
 * still happen because those live in the tool handlers, not here.
 */
export class NoopDesktopController implements DesktopController {
  readonly platform: string = "noop";
  readonly enabled: boolean = false;

  async screen(): Promise<ScreenRegion> {
    return { x: 0, y: 0, width: 1920, height: 1080 };
  }
  async openBrowser(opts: OpenBrowserOptions): Promise<void> {
    log("desktop", `noop openBrowser ${opts.key} ${opts.url}`);
  }
  async reloadBrowser(_key: string): Promise<boolean> {
    return false;
  }
  async openTerminal(opts: OpenTerminalOptions): Promise<void> {
    log("desktop", `noop openTerminal ${opts.key}: ${opts.command}`);
  }
  async notify(opts: NotifyOptions): Promise<void> {
    log("desktop", `noop notify: ${opts.title} — ${opts.message}`);
  }
  async focusChannel(channel: string): Promise<void> {
    log("desktop", `noop focusChannel ${channel}`);
  }
  async closeManaged(): Promise<void> {}
}
