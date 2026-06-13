import { NoopDesktopController } from "./noop.js";

/**
 * Windows desktop control — NOT YET IMPLEMENTED.
 *
 * This is the seam for the Windows teammate. Implement the DesktopController
 * interface here using whatever Windows automation fits:
 *   - window placement: PowerShell + user32 MoveWindow / SetWindowPos, or
 *     `nircmd win setsize`, or the FancyZones / Win32 APIs
 *   - browser: launch Chrome/Edge with --app or --window-position/--window-size
 *   - terminal: Windows Terminal (`wt.exe new-tab --title ... <command>`) or
 *     a console host, running `tmux attach` under WSL / the bundled tmux
 *   - notify: PowerShell BurntToast / Windows.UI.Notifications toast
 *
 * The tiler (regionForSlot) is already cross-platform — reuse it as-is.
 * Until this exists, the factory falls back to Noop on win32 so the rest of
 * the app runs unchanged (no windows, effects still happen).
 */
export class WindowsDesktopController extends NoopDesktopController {
  // Intentionally a Noop subclass for now. Replace the method bodies with
  // real implementations; the platform tag below documents intent.
  override readonly platform = "win32-noop";
}
