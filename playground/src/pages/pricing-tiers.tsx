import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="mt-4 text-5xl font-black font-bold text-violet-500">Scale Your <span className="text-7xl text-violet-500">Hosting Game</span></h1>
        <div className="flex flex-row-reverse flex-1 max-w-4xl mt-12">
          <div className="flex flex-1 justify-end text-right mx-auto">
            <button className="mt-6 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Get Started</button>
          </div>
          <section className="flex flex-col-reverse flex-1 mx-auto">
            <div className="flex flex-1 flex-col mx-auto">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
                <h2 className="text-4xl font-bold text-zinc-500">Solo Traveler</h2>
                <p className="text-2xl text-zinc-400">
                  <ul className="list-disc space-y-2">
                    <li className="text-lg">Simple and intuitive interface</li>
                    <li className="text-lg">Basic features for the solo user</li>
                    <li className="text-lg">No commitments</li>
                  </ul>
                </p>
                <button className="mt-6 w-24 rounded-xl bg-violet-500 bg-zinc-900/20 hover:bg-violet-400">Get Started</button>
              </div>
            </div>
          </section>
          <div className="flex flex-1 mx-auto mt-12">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
              <h2 className="text-4xl font-bold text-zinc-500">Pro Host</h2>
              <p className="text-2xl text-zinc-400">
                <ul className="list-disc space-y-2">
                  <li className="text-lg">Advanced analytics for informed decision-making</li>
                  <li className="text-lg">Customizable dashboard for your brand</li>
                  <li className="text-lg">White-glove support for your business</li>
                </ul>
              </p>
              <button className="mt-6 w-24 rounded-xl bg-violet-500 bg-zinc-900/20 hover:bg-violet-400">Get Started</button>
            </div>
          </div>
          <div className="flex flex-1 mx-auto mt-12">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
              <h2 className="text-4xl font-bold text-zinc-500">Enterprise</h2>
              <p className="text-2xl text-zinc-400">
                <ul className="list-disc space-y-2">
                  <li className="text-lg">Custom API for seamless integrations</li>
                  <li className="text-lg">Personalized support for your team</li>
                  <li className="text-lg">Full management for your hosting operations</li>
                </ul>
              </p>
              <button className="mt-6 w-24 rounded-xl bg-violet-500 bg-zinc-900/20 hover:bg-violet-400">Get Started</button>
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-6xl px-6 py-12">
        <h2 className="text-4xl font-bold text-violet-500">Pricing is simple</h2>
        <p className="text-2xl text-zinc-400">
          No hidden fees. No surprises. Only the price you expect.
        </p>
      </section>
      <section className="max-w-6xl px-6 py-12">
        <h2 className="text-4xl font-bold text-violet-500">Join the hosts who are <span className="text-5xl text-violet-500">scaling their hosting game</span></h2>
        <p className="text-2xl text-zinc-400">
          Discover how our platform can help you grow your hosting business.
        </p>
      </section>
      <div className="flex flex-1 mx-auto mt-12">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
          <h2 className="text-4xl font-bold text-zinc-500">Ready to learn more?</h2>
          <p className="text-2xl text-zinc-400">
            <ul className="list-disc space-y-2">
              <li className="text-lg">Contact us for a demo</li>
            </ul>
          </p>
          <div className="text-2xl text-violet-500">
            <div className="rounded-xl bg-zinc-900 p-3 text-2xl w-fit">
              <span className="text-2xl text-violet-500">🚀</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
