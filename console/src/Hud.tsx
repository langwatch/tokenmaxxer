import { useEffect, useState } from "react";
import { room, type RoomState } from "./realtime";

/**
 * The floating listening HUD — a compact glass bar that lives on top of
 * everything (in the Electron overlay). It carries the listening state,
 * the last thing said, the last action fired, and the fleet size. The
 * prototyping happens in real desktop windows, not here.
 */
function useRoom(): RoomState {
  const [state, setState] = useState(room.state);
  useEffect(() => room.subscribe(setState), []);
  return state;
}

const TOOL_ICONS: Record<string, string> = {
  dispatch_work: "🚀",
  check_progress: "📡",
  write_page: "🎨",
  edit_page: "✏️",
  open_page: "🖥️",
  set_page_model: "🧠",
};

export default function Hud() {
  const state = useRoom();
  const lastTurn = state.transcript[state.transcript.length - 1];
  const lastTool = state.tools[0];
  const working = state.fleet.filter((a) => a.status === "working").length;

  const orb =
    state.connection === "idle"
      ? "bg-zinc-600"
      : state.agentTalking
        ? "bg-fuchsia-400 talking"
        : state.connection === "live"
          ? "bg-emerald-400"
          : "bg-amber-400 talking";

  return (
    <div
      className="flex h-screen w-screen items-stretch justify-center bg-transparent p-2"
      style={{ WebkitUserSelect: "none" }}
    >
      <div
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 shadow-2xl backdrop-blur-xl"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <span className={`h-3 w-3 shrink-0 rounded-full ${orb}`} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-zinc-100">
            {lastTurn ? (
              <span className={lastTurn.role === "agent" ? "text-violet-300" : "text-zinc-300"}>
                {lastTurn.role === "agent" ? "Max: " : "You: "}
                {lastTurn.text}
              </span>
            ) : (
              <span className="text-zinc-500">
                {state.connection === "idle"
                  ? "click to listen"
                  : "listening…"}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
            {lastTool && (
              <span className="truncate">
                {TOOL_ICONS[lastTool.tool] ?? "⚙️"} {lastTool.tool}
                {lastTool.phase === "started" ? "…" : " ✓"}
              </span>
            )}
            <span className="ml-auto shrink-0">
              {working > 0 ? `🤖 ${working} working` : `🤖 ${state.fleet.length}`}
            </span>
          </div>
        </div>

        <button
          onClick={() => (state.connection === "idle" ? void room.start() : room.stop())}
          className="shrink-0 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-400"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {state.connection === "idle" ? "listen" : "stop"}
        </button>

        <button
          onClick={() => window.close()}
          title="Close the HUD (reopen with: pnpm hud)"
          aria-label="Close"
          className="shrink-0 rounded-md px-1.5 py-1.5 text-sm leading-none text-zinc-500 transition hover:bg-white/10 hover:text-zinc-100"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
