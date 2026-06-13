// @ts-check
/**
 * The tokenmaxxer HUD: a frameless, transparent, always-on-top overlay that
 * floats above every other window (and full-screen apps) showing the room's
 * listening state. It wraps the existing console in HUD mode, so it reuses
 * the proven mic / playback / WebSocket stack verbatim — the Electron shell
 * only adds the floating-window behaviour. Cross-platform by construction:
 * the same shell runs on Windows once the desktop adapter lands there.
 */
const { app, BrowserWindow, screen, session } = require("electron");

const CONSOLE_URL = process.env.TOKENMAXXER_CONSOLE_URL ?? "http://localhost:5170";
const HUD_WIDTH = 460;
const HUD_HEIGHT = 132;

function createHud() {
  const { workArea } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
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
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadURL(`${CONSOLE_URL}/?hud=1`);
  return win;
}

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

// The HUD is a background overlay — keep running when its window is closed
// only matters on macOS; quit elsewhere.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
