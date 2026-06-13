import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-fuchsia-500/10 to-transparent"></div>

      <section className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Luxury stays for your <span className="bg-gradient-to-r from-fuchsia-400 to-orange-400 bg-clip-text text-transparent">feline friends.</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">Find the perfect purr-fect getaway for your cat with trusted sitters who treat them like royalty.</p>
        <div className="mt-10 flex justify-center">
          <input
            type="text"
            placeholder="Where is your cat going?"
            className="w-full max-w-md rounded-l-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-zinc-100 placeholder-zinc-400 focus:border-fuchsia-400 focus:ring-fuchsia-400"
          />
          <button className="rounded-r-xl bg-fuchsia-500 px-6 py-3 font-semibold text-white transition hover:bg-fuchsia-400">Search</button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-4xl font-bold tracking-tight">How it Works</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-zinc-400">Getting your cat the best care is as easy as 1-2-3.</p>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto w-fit rounded-xl bg-zinc-800 p-3 text-2xl">📚</div>
            <h3 className="mt-6 text-xl font-semibold">Book</h3>
            <p className="mt-2 text-zinc-400">Browse verified sitters and find the perfect match for your cat's needs and personality.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto w-fit rounded-xl bg-zinc-800 p-3 text-2xl">🏡</div>
            <h3 className="mt-6 text-xl font-semibold">Sit</h3>
            <p className="mt-2 text-zinc-400">Your cat enjoys a comfortable, loving stay while you're away, with regular updates.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto w-fit rounded-xl bg-zinc-800 p-3 text-2xl">😻</div>
            <h3 className="mt-6 text-xl font-semibold">Purr</h3>
            <p className="mt-2 text-zinc-400">Return to a happy, relaxed cat, ready to share all their vacation stories.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-4xl font-bold tracking-tight">Top Rated Sitters</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-zinc-400">Meet the sitters who consistently earn five-star purrs.</p>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center text-5xl">🐈</div>
            <h3 className="mt-6 text-xl font-semibold">Luna's Haven</h3>
            <p className="mt-2 text-zinc-400">Specializes in shy cats. Offers daily photo updates and organic treats.</p>
            <div className="mt-4 text-orange-400">⭐⭐⭐⭐⭐</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600 ring-2 ring-fuchsia-500">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-fuchsia-500 px-3 py-1 text-xs font-bold uppercase text-white">Featured</div>
            <div className="mx-auto h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center text-5xl">🐾</div>
            <h3 className="mt-6 text-xl font-semibold">Whiskers & Wonders</h3>
            <p className="mt-2 text-zinc-400">Experienced with playful breeds. Large home with catio access.</p>
            <div className="mt-4 text-orange-400">⭐⭐⭐⭐⭐</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-zinc-600">
            <div className="mx-auto h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center text-5xl">💖</div>
            <h3 className="mt-6 text-xl font-semibold">Feline Retreat</h3>
            <p className="mt-2 text-zinc-400">Calm environment for senior cats. Medication administration available.</p>
            <div className="mt-4 text-orange-400">⭐⭐⭐⭐⭐</div>
          </div>
        </div>
        <div className="mt-16 text-center">
          <button className="rounded-xl bg-fuchsia-500 px-8 py-4 font-semibold text-white transition hover:bg-fuchsia-400">View All Sitters</button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Ready to find the perfect stay?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">Join the PurrBnB community and give your cat the vacation they deserve.</p>
        <button className="mt-10 rounded-xl bg-fuchsia-500 px-8 py-4 font-semibold text-white transition hover:bg-fuchsia-400">Get Started Now</button>
      </section>
    </div>
  );
}
