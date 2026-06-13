/**
 * Desktop control tests. The tiler and the Noop controller are pure and run
 * everywhere. The macOS integration test actually opens and closes a real
 * window, so it is gated behind TOKENMAXXER_DESKTOP_TEST=1 (and darwin) to
 * keep the normal suite and CI headless. Binds specs/desktop-control.feature.
 */
import { describe, expect, it } from "vitest";
import { NoopDesktopController } from "../src/desktop/noop.js";
import {
  pageSlot,
  regionForSlot,
  terminalSlotForIndex,
} from "../src/desktop/tiler.js";
import type { ScreenRegion } from "../src/desktop/types.js";

const SCREEN: ScreenRegion = { x: 0, y: 28, width: 1512, height: 954 };

describe("tiler", () => {
  it("top-right sits in the right half, upper quadrant, inside the screen", () => {
    const r = regionForSlot("top-right", SCREEN);
    expect(r.x).toBeGreaterThan(SCREEN.width / 2 - 50);
    expect(r.y).toBeLessThan(SCREEN.height / 2 + SCREEN.y);
    expect(r.x + r.width).toBeLessThanOrEqual(SCREEN.x + SCREEN.width);
    expect(r.y + r.height).toBeLessThanOrEqual(SCREEN.y + SCREEN.height);
  });

  it("quadrants do not overlap", () => {
    const tr = regionForSlot("top-right", SCREEN);
    const bl = regionForSlot("bottom-left", SCREEN);
    // top-right is right+upper, bottom-left is left+lower → disjoint
    expect(bl.x + bl.width).toBeLessThanOrEqual(tr.x);
    expect(tr.y + tr.height).toBeLessThanOrEqual(bl.y);
  });

  it("full and halves stay within the usable screen", () => {
    for (const slot of ["full", "left-half", "right-half"] as const) {
      const r = regionForSlot(slot, SCREEN);
      expect(r.x).toBeGreaterThanOrEqual(SCREEN.x);
      expect(r.y).toBeGreaterThanOrEqual(SCREEN.y);
      expect(r.x + r.width).toBeLessThanOrEqual(SCREEN.x + SCREEN.width);
      expect(r.y + r.height).toBeLessThanOrEqual(SCREEN.y + SCREEN.height);
    }
  });

  it("pages go top-right; terminals fan out across other quadrants", () => {
    expect(pageSlot()).toBe("top-right");
    expect(terminalSlotForIndex(0)).not.toBe("top-right");
    expect(terminalSlotForIndex(1)).not.toBe("top-right");
    expect(terminalSlotForIndex(0)).not.toBe(terminalSlotForIndex(1));
  });
});

describe("noop controller", () => {
  it("is disabled and performs no window actions", async () => {
    const d = new NoopDesktopController();
    expect(d.enabled).toBe(false);
    expect(d.platform).toBe("noop");
    await d.openBrowser({ url: "http://x", key: "k", slot: "top-right" });
    await d.openTerminal({ command: "echo hi", title: "t", key: "k", slot: "bottom-right" });
    await d.notify({ title: "t", message: "m" });
    expect(await d.reloadBrowser("k")).toBe(false);
    await d.closeManaged();
  });
});

const runMac =
  process.platform === "darwin" && process.env.TOKENMAXXER_DESKTOP_TEST === "1";
const macDescribe = runMac ? describe : describe.skip;

macDescribe("macOS controller (real windows)", () => {
  it("opens, tracks and closes a browser window", async () => {
    const { MacDesktopController } = await import("../src/desktop/mac.js");
    const d = new MacDesktopController();
    const screen = await d.screen();
    expect(screen.width).toBeGreaterThan(200);
    expect(screen.height).toBeGreaterThan(200);

    await d.openBrowser({
      url: "http://localhost:5171/",
      key: "test-proto",
      slot: "top-right",
    });
    const tracked = (
      d as unknown as { browserWindows: Map<string, unknown> }
    ).browserWindows;
    expect(tracked.has("test-proto"), "browser window not tracked").toBe(true);
    expect(await d.reloadBrowser("test-proto")).toBe(true);

    await d.closeManaged();
    expect(tracked.size).toBe(0);
  }, 30_000);
});
