import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Purrbnb Pricing</h1>
        <p className="text-xl font-bold text-violet-400">Experience the purrfect getaway for you and your feline friend</p>
      </section>
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-1 flex-col justify-between p-4">
            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-md transition hover:shadow-lg">
              <h2 className="text-5xl font-bold">Casual Care</h2>
              <p className="text-lg font-bold">$25/day</p>
              <p className="text-sm">A home away from home for you and your cat</p>
              <button className="mt-4 rounded-xl bg-violet-500 p-3 font-semibold text-white hover:bg-violet-400 transition">Select Plan</button>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-md transition hover:shadow-lg">
              <h2 className="text-5xl font-bold">Pro Purr<span className="text-lg text-violet-500"></span></h2>
              <p className="text-lg font-bold">$45/day</p>
              <p className="text-sm">Includes grooming services for the ultimate feline experience</p>
              <button className="mt-4 rounded-xl bg-violet-500 p-3 font-semibold text-white hover:bg-violet-400 transition">Select Plan</button>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-md transition hover:shadow-lg">
              <h2 className="text-5xl font-bold">Elite Feline</h2>
              <p className="text-lg font-bold">$80/day</p>
              <p className="text-sm">All the perks, plus overnight stays and health monitoring for your cat</p>
              <button className="mt-4 rounded-xl bg-violet-500 p-3 font-semibold text-white hover:bg-violet-400 transition">Select Plan</button>
            </div>
          </div>
        </div>
      </section>
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto p-4">
          <img src="https://example.com/illustration-1.png" alt="Purrbnb illustration" className="w-64 h-64 mb-8 rounded-xl bg-zinc-900/10" />
          <p className="text-lg font-bold text-violet-400">Purrbnb is the purrfect solution for you and your feline friend</p>
          <p className="text-sm text-zinc-500">We offer a range of amenities, including private studios, cat cafes, and playrooms</p>
        </div>
      </section>
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-1 flex-col justify-between p-4">
            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-md transition hover:shadow-lg">
              <h2 className="text-5xl font-bold">What sets us apart</h2>
              <p className="text-lg font-medium">High-quality, stylish accommodations for both you and your cat</p>
              <ul className="list-decimal list-inside-none m-0">
                <li className="text-lg font-medium">Comfortable studios with cat towers</li>
                <li className="text-lg font-medium">Cat cafes with scratching posts and toys</li>
                <li className="text-lg font-medium">Playrooms with interactive games and activities</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
