import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <img src="cat-on-sofa.jpg" className="object-cover mb-10 max-w-sm object-center w-full" />
        <h1 className="text-7xl font-black mt-6 tracking-tight text-violet-400">Your cat's favorite vacation starts here.</h1>
        <p className="text-2xl font-normal mt-4 text-slate-400">Purrbnb: your trusted partner in providing a purrfect home for your feline friend.</p>
      </section>
      <section className="my-10">
        <section className="mx-auto max-w-6xl px-6 py-12 bg-zinc-900 text-zinc-400 text-center">
          <h2 className="text-4xl font-bold">Search for your cat's dream vacation</h2>
          <div className="flex flex-col gap-4 text-lg">
            <input type="search" className="text-xl p-2 placeholder:text-slate-400 bg-zinc-800 rounded-xl border border-zinc-800" />
            <select className="p-2 text-zinc-900 bg-zinc-900 bg-white bg-opacity-20 border border-zinc-900 rounded-xl">
              <option>2023</option>
              <option>2024</option>
              <option>2025</option>
            </select>
            <button className="rounded-xl bg-violet-500 bg-opacity-90 px-6 py-2 font-semibold text-white transition hover:bg-violet-400">Find Your Dream Vacation</button>
          </div>
        </section>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-4xl font-bold">How it works</h2>
        <div className="grid grid-cols-1 gap-4 mt-6">
          <div className="flex flex-col">
            <h4 className="text-2xl font-bold">Find</h4>
            <p className="text-lg text-zinc-400">Search for the purrfect match</p>
            <button className="mt-4 rounded-xl bg-zinc-800 hover:bg-violet-500 p-2 text-xl text-violet-500 transition">Explore</button>
          </div>
          <div className="flex flex-col">
            <h4 className="text-2xl font-bold">Book</h4>
            <p className="text-lg text-zinc-400">Secure booking, no stress</p>
            <button className="mt-4 rounded-xl bg-violet-500 hover:bg-violet-400 p-2 text-xl text-white transition">Reserve</button>
          </div>
          <div className="flex flex-col">
            <h4 className="text-2xl font-bold">Relax</h4>
            <p className="text-lg text-zinc-400">Enjoy your dream vacation, your cat enjoys theirs</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-24 grid grid-cols-1 gap-4">
        <h2 className="text-4xl font-bold">Featured Cat Sitters</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <img src="cat-sitter.jpg" className="object-cover object-center w-full" />
            <h3 className="text-3xl font-bold">Whisker World Travels</h3>
            <div className="flex flex-col mt-4">
              <div className="text-lg text-zinc-400">5.0 (100 reviews)</div>
              <button className="text-lg text-violet-500 bg-transparent hover:bg-violet-500 px-2 py-1 rounded-xl">View Profile</button>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <img src="cat-sitter2.jpg" className="object-cover object-center w-full" />
            <h3 className="text-3xl font-bold">Purrfectly Purrsonalized</h3>
            <div className="flex flex-col mt-4">
              <div className="text-lg text-zinc-400">4.9 (200 reviews)</div>
              <button className="text-lg text-violet-500 bg-transparent hover:bg-violet-500 px-2 py-1 rounded-xl">View Profile</button>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <img src="cat-sitter3.jpg" className="object-cover object-center w-full" />
            <h3 className="text-3xl font-bold">Feline Friends Forever</h3>
            <div className="flex flex-col mt-4">
              <div className="text-lg text-zinc-400">4.8 (100 reviews)</div>
              <button className="text-lg text-violet-500 bg-transparent hover:bg-violet-500 px-2 py-1 rounded-xl">View Profile</button>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-4xl font-bold">Join our community of cat lovers</h2>
        <button className="rounded-xl bg-violet-500 bg-opacity-90 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Sign up</button>
      </section>
    </div>
  );
}
