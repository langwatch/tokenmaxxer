import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="h-128 w-full">
          <img src="hero.jpg" className="h-full w-full object-cover object-center"></img>
        </div>
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Uber for your best friend</h1>
        <p className="text-2xl font-bold">Get your furry friend where they need to be, without the stress</p>
      </div>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-medium">Safety-Verified Drivers</h2>
        <p className="text-lg font-normal">Our drivers are thoroughly vetted, with extensive background checks and rigorous training.</p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-4">
                <img src="driver1.jpg" className="rounded-full h-16 w-full object-cover object-center"></img>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-medium">Real-time GPS Tracking</h2>
        <p className="text-lg font-normal">Track your ride in real-time, with live updates from our drivers.</p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7"></circle>
                  <text x="9" y="16" fontSize="14" fontWeight="bold">📍</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-medium">Stress-Free Transport</h2>
          <p className="text-lg font-normal">Our drivers are trained to handle even the most anxious of pets.</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col items-center">
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 15v-15h-20v15H10z"></path>
                        </svg>
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 15v-15h-20v15H10z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="flex flex-col items-center">
          <button className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Sign Up</button>
          <button className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white mx-4 transition hover:bg-violet-400">Download App</button>
        </div>
      </div>
    </div>
  );
}
