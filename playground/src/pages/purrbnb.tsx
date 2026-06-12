import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Your cat's <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">home away from home.</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">Find the perfect, trusted sitter for your feline friend. Peace of mind, purrfect care.</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <input type="text" placeholder="Location (e.g., New York)" className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          <input type="date" className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          <button className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Find a Sitter</button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-4xl font-bold tracking-tight">How it Works</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-zinc-400">Finding the ideal cat sitter is simple and stress-free with Purrbnb.</p>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto w-fit rounded-xl bg-zinc-800 p-3 text-2xl">📚</div>
            <h3 className="mt-6 text-xl font-semibold">1. Book</h3>
            <p className="mt-3 text-zinc-400">Browse verified sitters, read reviews, and book securely online.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto w-fit rounded-xl bg-zinc-800 p-3 text-2xl">🤝</div>
            <h3 className="mt-6 text-xl font-semibold">2. Meet</h3>
            <p className="mt-3 text-zinc-400">Arrange a meet-and-greet to ensure a perfect match for your cat.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto w-fit rounded-xl bg-zinc-800 p-3 text-2xl">😌</div>
            <h3 className="mt-6 text-xl font-semibold">3. Relax</h3>
            <p className="mt-3 text-zinc-400">Enjoy your time away, knowing your cat is in loving, capable hands.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-4xl font-bold tracking-tight">Featured Sitters</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-zinc-400">Meet some of our top-rated and most beloved cat sitters.</p>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto h-24 w-24 rounded-full bg-zinc-800"></div>
            <h3 className="mt-6 text-xl font-semibold">Luna P.</h3>
            <p className="mt-2 text-zinc-400">5 years experience, specializes in shy cats.</p>
            <div className="mt-4 flex items-center justify-center gap-1 text-yellow-400">
              <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
              <span className="ml-2 text-sm text-zinc-500">(48 reviews)</span>
            </div>
            <span className="mt-4 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold uppercase text-violet-300">Verified</span>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600 ring-2 ring-violet-500">
            <div className="mx-auto h-24 w-24 rounded-full bg-zinc-800"></div>
            <h3 className="mt-6 text-xl font-semibold">Oliver K.</h3>
            <p className="mt-2 text-zinc-400">Loves playful kittens, experienced with medication.</p>
            <div className="mt-4 flex items-center justify-center gap-1 text-yellow-400">
              <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
              <span className="ml-2 text-sm text-zinc-500">(62 reviews)</span>
            </div>
            <span className="mt-4 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold uppercase text-violet-300">Verified</span>
            <span className="absolute -top-3 -right-3 rounded-full bg-violet-600 px-3 py-1 text-xs font-bold uppercase text-white">Top Sitter</span>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto h-24 w-24 rounded-full bg-zinc-800"></div>
            <h3 className="mt-6 text-xl font-semibold">Mia S.</h3>
            <p className="mt-2 text-zinc-400">Specializes in senior cats and special needs.</p>
            <div className="mt-4 flex items-center justify-center gap-1 text-yellow-400">
              <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
              <span className="ml-2 text-sm text-zinc-500">(35 reviews)</span>
            </div>
            <span className="mt-4 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold uppercase text-violet-300">Verified</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Ready to find the perfect sitter?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">Join the Purrbnb community and give your cat the care they deserve.</p>
        <button className="mt-10 rounded-xl bg-violet-500 px-8 py-4 font-semibold text-white transition hover:bg-violet-400">Get Started Now</button>
      </section>
    </div>
  );
}
