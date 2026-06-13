import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-600 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-7xl font-black tracking-tight text-zinc-100 text-left">
          <span className="text-8xl font-bold text-zinc-100">THE</span> <span className="text-8xl font-bold text-zinc-100">END</span> <span className="text-10xl font-black text-zinc-100"> OF</span> <span className="text-8xl font-bold text-zinc-100">DEBT.</span>
        </h1>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-5xl font-bold text-zinc-400">Global Reset</h2>
        <p className="text-lg font-normal text-zinc-400">A new world order, free from the shackles of debt.</p>
        <ol className="list-decimal list-inside-5 text-lg text-zinc-400">
          <li className="text-lg font-bold text-zinc-500">Map the debt</li>
          <li className="text-lg font-bold text-zinc-500">Build a debt-free future</li>
          <li className="text-lg font-bold text-zinc-500">Unlock global economic freedom</li>
        </ol>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-5xl font-bold text-zinc-400">Join the Movement</h2>
        <p className="text-lg font-normal text-zinc-400">Be part of a global revolution.</p>
        <button className="mt-10 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500">Join Now</button>
      </section>
    </div>
  );
}
