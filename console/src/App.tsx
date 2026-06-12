import { useEffect, useState } from "react";
import { room, type RoomState } from "./realtime";

const PLAYGROUND_URL = `http://${window.location.hostname}:5171`;

function useRoom(): RoomState {
  const [state, setState] = useState(room.state);
  useEffect(() => room.subscribe(setState), []);
  return state;
}

function ConnectButton({ state }: { state: RoomState }) {
  if (state.connection === "idle") {
    return (
      <button
        onClick={() => void room.start()}
        className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400"
      >
        start listening
      </button>
    );
  }
  const label = {
    connecting: "connecting…",
    live: "live",
    reconnecting: "reconnecting…",
  }[state.connection];
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-block h-3 w-3 rounded-full ${
          state.connection === "live"
            ? state.agentTalking
              ? "bg-fuchsia-400 talking"
              : "bg-emerald-400"
            : "bg-amber-400 talking"
        }`}
      />
      <span className="text-sm uppercase tracking-widest text-zinc-400">
        {state.agentTalking ? "max is talking" : label}
      </span>
      <button
        onClick={() => room.stop()}
        className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 transition hover:border-zinc-500"
      >
        stop
      </button>
    </div>
  );
}

function Transcript({ state }: { state: RoomState }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500">
        conversation
      </h2>
      <div className="mt-2 flex flex-1 flex-col-reverse gap-2 overflow-y-auto">
        {[...state.transcript].reverse().map((t, i) => (
          <div
            key={`${t.at}-${i}`}
            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              t.role === "agent"
                ? "self-start border border-violet-900/60 bg-violet-950/40 text-violet-100"
                : "self-end bg-zinc-800 text-zinc-100"
            }`}
          >
            {t.text}
          </div>
        ))}
        {state.transcript.length === 0 && (
          <p className="text-sm text-zinc-600">
            Start talking — everything lands here.
          </p>
        )}
      </div>
    </section>
  );
}

const TOOL_ICONS: Record<string, string> = {
  dispatch_work: "🚀",
  check_progress: "📡",
  write_page: "🎨",
  edit_page: "✏️",
  open_page: "🖥️",
};

function ToolFeed({ state }: { state: RoomState }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500">
        actions
      </h2>
      <div className="mt-2 flex-1 space-y-2 overflow-y-auto">
        {state.tools.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border p-3 text-sm transition ${
              t.phase === "started"
                ? "border-amber-700/60 bg-amber-950/20"
                : t.phase === "failed"
                  ? "border-red-800 bg-red-950/30"
                  : "border-zinc-800 bg-zinc-900/60"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <span>{TOOL_ICONS[t.tool] ?? "⚙️"}</span>
              <span>{t.tool}</span>
              <span className="ml-auto text-xs text-zinc-500">
                {t.phase === "started"
                  ? "running…"
                  : t.elapsedMs !== undefined
                    ? `${(t.elapsedMs / 1000).toFixed(1)}s`
                    : ""}
              </span>
            </div>
            <div className="mt-1 truncate text-xs text-zinc-400">
              {summarizeArgs(t.args)}
            </div>
            {t.result && t.phase !== "started" && (
              <div className="mt-1 truncate text-xs text-zinc-500">{t.result}</div>
            )}
          </div>
        ))}
        {state.tools.length === 0 && (
          <p className="text-sm text-zinc-600">
            Tool calls show up here the moment Max fires them.
          </p>
        )}
      </div>
    </section>
  );
}

function summarizeArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

const STATUS_STYLE: Record<string, string> = {
  launching: "bg-amber-400",
  working: "bg-emerald-400 talking",
  idle: "bg-sky-400",
  gone: "bg-zinc-600",
};

function FleetPanel({ state }: { state: RoomState }) {
  return (
    <section className="flex min-h-0 flex-col">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500">
        the fleet{" "}
        <span className="text-zinc-700">({state.fleet.length} agents)</span>
      </h2>
      <div className="mt-2 flex-1 space-y-2 overflow-y-auto">
        {state.fleet.map((a) => (
          <div
            key={a.slug}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span
                className={`inline-block h-2 w-2 rounded-full ${STATUS_STYLE[a.status] ?? "bg-zinc-600"}`}
              />
              <span className="truncate">{a.slug}</span>
              <span className="ml-auto shrink-0 text-xs text-zinc-500">
                {a.status}
              </span>
            </div>
            <div className="mt-1 truncate text-xs text-zinc-400">{a.topic}</div>
            <div className="mt-1 truncate text-xs text-zinc-600">
              {a.lastActivity}
            </div>
          </div>
        ))}
        {state.fleet.length === 0 && (
          <p className="text-sm text-zinc-600">
            No agents yet. Mention work and watch them spawn.
          </p>
        )}
      </div>
    </section>
  );
}

function Preview({ state }: { state: RoomState }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500">
          room screen
        </h2>
        <code className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-violet-300">
          {state.previewPath}
        </code>
      </div>
      <iframe
        title="playground"
        src={`${PLAYGROUND_URL}${state.previewPath}`}
        className="mt-2 w-full flex-1 rounded-2xl border border-zinc-800 bg-zinc-950"
      />
    </section>
  );
}

export default function App() {
  const state = useRoom();
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-6 border-b border-zinc-900 px-6 py-4">
        <h1 className="text-lg font-black tracking-tight">
          token
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            maxxer
          </span>
        </h1>
        <p className="hidden text-sm text-zinc-500 md:block">
          the meeting room that ships while you talk
        </p>
        <div className="ml-auto">
          <ConnectButton state={state} />
        </div>
      </header>

      {state.statusMessage && (
        <div className="border-b border-amber-900/50 bg-amber-950/30 px-6 py-2 text-sm text-amber-200">
          {state.statusMessage}
        </div>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex min-h-0 flex-col gap-6">
          <Transcript state={state} />
          <ToolFeed state={state} />
          <FleetPanel state={state} />
        </div>
        <Preview state={state} />
      </main>
    </div>
  );
}
