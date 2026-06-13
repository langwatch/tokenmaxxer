import React from "react";
import { pageSlugs } from "../App";

export default function Page() {
  const slugs = pageSlugs().filter((s) => s !== "home");
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent" />
      <main className="relative mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm uppercase tracking-[0.3em] text-violet-400">
          tokenmaxxer playground
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
          Say it.{" "}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            It ships.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-400">
          This screen is wired to the meeting. Every page below was spoken
          into existence.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {slugs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-zinc-500">
              No pages yet. Ask the room for one.
            </div>
          )}
          {slugs.map((slug) => (
            <a
              key={slug}
              href={`/${slug}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 transition hover:border-violet-500/50 hover:bg-zinc-900"
            >
              <div className="text-xl font-semibold">/{slug}</div>
              <div className="mt-2 text-sm text-zinc-500">open page →</div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
