import type { ScreenRegion, TileSlot } from "./types.js";

/**
 * Pure region math — no OS calls, fully unit-testable. Turns a slot and the
 * usable screen into a concrete window region, leaving a gap between tiles
 * so the layout reads as distinct panes rather than one seam.
 */
export function regionForSlot(
  slot: TileSlot,
  screen: ScreenRegion,
  gap = 8,
): ScreenRegion {
  const halfW = Math.floor((screen.width - gap * 3) / 2);
  const halfH = Math.floor((screen.height - gap * 3) / 2);
  const leftX = screen.x + gap;
  const rightX = screen.x + gap * 2 + halfW;
  const topY = screen.y + gap;
  const bottomY = screen.y + gap * 2 + halfH;
  const fullW = screen.width - gap * 2;
  const fullH = screen.height - gap * 2;

  switch (slot) {
    case "top-right":
      return { x: rightX, y: topY, width: halfW, height: halfH };
    case "bottom-right":
      return { x: rightX, y: bottomY, width: halfW, height: halfH };
    case "top-left":
      return { x: leftX, y: topY, width: halfW, height: halfH };
    case "bottom-left":
      return { x: leftX, y: bottomY, width: halfW, height: halfH };
    case "left-half":
      return { x: leftX, y: topY, width: halfW, height: fullH };
    case "right-half":
      return { x: rightX, y: topY, width: halfW, height: fullH };
    case "top-half":
      return { x: leftX, y: topY, width: fullW, height: halfH };
    case "bottom-half":
      return { x: leftX, y: bottomY, width: fullW, height: halfH };
    case "full":
      return { x: leftX, y: topY, width: fullW, height: fullH };
  }
}

/**
 * The fan-out plan. As windows open, the room sees the most at once:
 *   - top-right    → the live prototype page
 *   - bottom-right → first working agent terminal
 *   - bottom-left  → second working agent terminal (more cascade over these)
 *   - top-left     → proactive results (a finished PR)
 * The floating HUD sits on top and is never tiled.
 */
const TERMINAL_SLOTS: TileSlot[] = ["bottom-right", "bottom-left"];

export function pageSlot(): TileSlot {
  return "top-right";
}

export function terminalSlotForIndex(index: number): TileSlot {
  return TERMINAL_SLOTS[index % TERMINAL_SLOTS.length];
}

export function prSlot(): TileSlot {
  return "top-left";
}
