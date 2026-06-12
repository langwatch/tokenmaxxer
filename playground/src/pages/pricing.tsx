import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
          <section className="relative mx-auto max-w-6xl px-6 py-24">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-violet-400">Pricing</h1>
            <p className="text-lg leading-tight text-zinc-400">Trusted pet-sitting marketplace with a heart</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-zinc-600 transition shadow-lg hover:scale-[1.02]">
                <div className="rounded-xl bg-zinc-800 p-3 text-2xl w-fit mb-4">🐾</div>
                <h2 className="text-4xl font-bold">Casual</h2>
                <p className="text-xl leading-tight">Basic sitter matching</p>
                <ul className="list-disc list-inside-5 list-inside-5 ml-8">
                  <li className="text-lg">Simple sitter matching</li>
                  <li className="text-lg">No extra features</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-violet-600 bg-violet-900/40 p-8 hover:border-violet-400 transition shadow-lg hover:scale-[1.02]">
                <div className="rounded-xl bg-violet-800 p-3 text-2xl w-fit mb-4">✨</div>
                <h2 className="text-4xl font-bold text-violet-300">Pro</h2>
                <p className="text-xl leading-tight text-violet-200">Verified sitter video calls and instant booking</p>
                <ul className="list-disc list-inside-5 list-inside-5 ml-8">
                  <li className="text-lg">Verified sitter video calls</li>
                  <li className="text-lg">Instant booking and booking management</li>
                  <li className="text-lg">Additional support from our team</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-zinc-600 transition ring-2 ring-violet-500 shadow-lg hover:scale-[1.02]">
                <div className="rounded-xl bg-zinc-800 p-3 text-2xl w-fit mb-4">👑</div>
                <h2 className="text-4xl font-bold">Elite</h2>
                <p className="text-xl leading-tight">24/7 concierge, overnight stays, &amp; premium pet insurance</p>
                <ul className="list-disc list-inside-5 list-inside-5 ml-8">
                  <li className="text-lg">24/7 concierge level of support</li>
                  <li className="text-lg">Inclusive premium pet insurance</li>
                  <li className="text-lg">Additional support from our dedicated team</li>
                  <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">And more!</span>
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-20 mx-auto">
              <button className="mt-20 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition">Get Started</button>
            </div>
            <div className="grid grid-cols-1 gap-6 mt-20">
              <div className="text-lg">Choose your plan carefully, but don't worry, you can switch at any time.</div>
              <label className="inline-flex items-center">
                <input type="radio" className="appearance-none h-4 w-4 border-2 border-zinc-600 rounded-full" />
                <span className="text-lg ml-4">Monthly</span>
              </label>
              <label className="inline-flex items-center ml-6">
                <input type="radio" className="appearance-none h-4 w-4 border-2 border-zinc-600 rounded-full" />
                <span className="text-lg">Yearly</span>
              </label>
            </div>
          </section>
        </div>
  );
}
