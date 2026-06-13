import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">Your cat's second favorite home.</h1>
        <p className="text-lg leading-snug font-semibold text-zinc-400">Trusted, professional sitters for the discerning feline.</p>
        <img src="https://example.com/purr.jpg" alt="A serene cat" className="rounded-2xl h-40 object-cover" />
      </section>
      <section className="bg-white/20 mx-auto max-w-6xl px-8 py-16 mt-24">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col p-4 transition hover:bg-zinc-800 bg-zinc-900/60 rounded-2xl ring-2 ring-zinc-600">
            <h3 className="text-lg font-semibold">Book</h3>
            <p className="text-lg text-zinc-400">Schedule your cat's stay with our sitters.</p>
          </div>
          <div className="flex flex-col p-4 transition hover:bg-zinc-800 bg-zinc-900/60 rounded-2xl ring-2 ring-zinc-600">
            <h3 className="text-lg font-semibold">Match</h3>
            <p className="text-lg text-zinc-400">Meet your cat's sitter and get matched.</p>
          </div>
          <div className="flex flex-col p-4 transition hover:bg-zinc-800 bg-zinc-900/60 rounded-2xl ring-2 ring-zinc-600">
            <h3 className="text-lg font-semibold">Relax</h3>
            <p className="text-lg text-zinc-400">Enjoy your cat's stay and relax knowing they're in good hands.</p>
          </div>
        </div>
      </section>
      <section className="relative mx-auto max-w-6xl p-8 mt-20">
        <h2 className="text-2xl font-bold tracking-tight">Featured Sitters</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold">Sitter 1</h3>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" width="24">
                  <g>
                    <rect x="4.5" y="2" width="18" height="5" fill="none" rx="2.5" />
                    <path d="M5 9.5h14c-3 0-5-1.9-5-4s-1.9 5 0 4 4 4 4 0 2.9 0-4 4zm2 0c0 1.1 1.1 2 2.2 2h-13c0-1.1 0.9-2.1 2.2-2z" />
                  </g>
                </svg>
                <p className="text-2xl">4.9/5</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:bg-zinc-800 bg-zinc-900/60">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold">Sitter 2</h3>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" width="24">
                  <g>
                    <rect x="4.5" y="2" width="18" height="5" fill="none" rx="2.5" />
                    <path d="M5 9.5h14c3 0 5-1.9 5-4s-1.9 5 0 4 4 4 4 0 2.9 0-4 4z" />
                  </g>
                </svg>
                <p className="text-2xl">4.8/5</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="relative mx-auto max-w-6xl p-8 mt-20">
        <button className="mt-6 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Find a Sitter</button>
      </div>
    </div>
  );
}
