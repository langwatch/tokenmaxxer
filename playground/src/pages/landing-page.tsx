import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Your Cat's Dream Vacation Starts Here</h1>
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Find your cat's perfect stay.</span>
        <div className="flex flex-col items-center justify-center">
          <form className="flex flex-col items-center">
            <input type="text" className="mt-4 rounded-xl placeholder-zinc-400 text-lg placeholder-zinc-900 bg-zinc-900/60 placeholder-shrink text-lg px-4 py-3" id="location" placeholder="Search for a city or zip" />
            <button className="ml-4 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Search</button>
          </form>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-4xl font-bold">How it works</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <h3 className="text-2xl">Book a sitter</h3>
            <p className="text-lg text-zinc-400">Choose a sitter, set the date and time, and get ready for some serious R&R.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <h3 className="text-2xl">Stay relaxed</h3>
            <p className="text-lg text-zinc-400">Our expert sitters will take care of your cat, so you can focus on relaxation.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <h3 className="text-2xl">Get updates</h3>
            <p className="text-lg text-zinc-400">Get photos, updates, and peace of mind with our sitter's regular check-ins.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-4xl font-bold">Top-Rated Sitters Near You</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-zinc-600 transition">
            <h3 className="text-2xl">Sitter 1</h3>
            <p className="text-lg text-zinc-400">Cats love them.</p>
            <button className="mt-4 rounded-xl bg-violet-500 ring-2 ring-violet-500 text-zinc-100 hover:bg-violet-400">Book now</button>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-zinc-600 transition">
            <h3 className="text-2xl">Sitter 2</h3>
            <p className="text-lg text-zinc-400">Your cat will thank you.</p>
            <button className="mt-4 rounded-xl bg-violet-500 ring-2 ring-violet-500 text-zinc-100 hover:bg-violet-400">Book now</button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-4xl font-bold">Why PurrBnB</h2>
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col items-center">
            <h3 className="text-2xl">Verified Sitter Profiles</h3>
            <p className="text-lg text-zinc-400">We verify our sitters' experience, trustworthiness, and love for cats.</p>
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-2xl">Safety First</h3>
            <p className="text-lg text-zinc-400">Our sitters are background-checked, and we're always on the lookout for the best.</p>
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-2xl">Purrfect Matches</h3>
            <p className="text-lg text-zinc-400">We match sitters with cats who share similar energy and play styles.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
