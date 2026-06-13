// @ts-check
/**
 * The tokenmaxxer HUD: a frameless, transparent, always-on-top overlay that
 * floats above every other window (and full-screen apps) showing the room's
 * listening state. It wraps the existing console in HUD mode, so it reuses
 * the proven mic / playback / WebSocket stack verbatim — the Electron shell
 * only adds the floating-window behaviour. Cross-platform by construction:
 * the same shell runs on Windows once the desktop adapter lands there.
 *
 * Closing: the bar has an ✕ button, and Cmd/Ctrl+Q or Cmd/Ctrl+W also quit
 * (a frameless overlay has no menu bar to hang a Quit item on). Reopen any
 * time with `pnpm hud`.
 */
const { app, BrowserWindow, screen, session } = require("electron");

const CONSOLE_URL = process.env.TOKENMAXXER_CONSOLE_URL ?? "http://localhost:5170";
const HUD_WIDTH = 460;
const HUD_HEIGHT = 132;

/** @type {BrowserWindow | null} */
let hud = null;

function createHud() {
  const { workArea } = screen.getPrimaryDisplay();
  hud = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    // Bottom-centre, just above the dock.
    x: Math.round(workArea.x + (workArea.width - HUD_WIDTH) / 2),
    y: Math.round(workArea.y + workArea.height - HUD_HEIGHT - 16),
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      // The console talks only to our local gateway; no node integration
      // needed in the page.
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Float above full-screen apps and show on every Space.
  hud.setAlwaysOnTop(true, "screen-saver");
  hud.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // There is no menu bar on this overlay, so wire the usual quit shortcuts
  // by hand: Cmd/Ctrl+Q and Cmd/Ctrl+W both close it.
  hud.webContents.on("before-input-event", (event, input) => {
    const mod = input.meta || input.control;
    if (mod && (input.key === "q" || input.key === "w")) {
      event.preventDefault();
      app.quit();
    }
  });

  hud.on("closed", () => {
    hud = null;
  });

  hud.loadURL(`${CONSOLE_URL}/?hud=1`);
  return hud;
}

// One HUD at a time: a second `pnpm hud` should focus the existing overlay,
// not stack another transparent window on top of it.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!hud) return;
    if (hud.isMinimized()) hud.restore();
    hud.show();
    hud.focus();
  });

  app.whenReady().then(() => {
    // Auto-grant the microphone so the room starts listening without a prompt.
    session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
      cb(permission === "media");
    });

    createHud();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createHud();
    });
  });
}

// The overlay is the whole app — when its window closes (✕ button or
// Cmd+Q/W), quit for real on every platform.
app.on("window-all-closed", () => app.quit());
