import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-violet-900 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Notes that <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">write back.</span></h1>
        <p className="text-sm uppercase tracking-[0.3em] text-violet-400">RocketNotes beta</p>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">You made it into the beta. Strap in.</p>
        <button className="mt-10 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Open my workspace</button>
      </section>
    </div>
  );
}
