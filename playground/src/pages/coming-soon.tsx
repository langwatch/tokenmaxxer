import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <div className="h-screen flex justify-center items-center overflow-hidden">
        <section className="relative mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-7xl font-black font-bold">Something is brewing.</h1>
          <p className="mt-6 text-5xl font-black font-bold">Stay tuned for our next big release.</p>
        </section>
      </div>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 grid-rows-1 justify-center items-center gap-4">
          <button className="mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-600" onClick={() => window.open('mailto:mailto:example@example.com', '_blank', 'scrollto=true')}>
            <p className="text-3xl font-medium text-zinc-200">Join our early access list</p>
            <p className="text-lg font-medium text-zinc-200">Stay up-to-date on our progress</p>
          </button>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 grid-rows-1 justify-center items-center gap-4">
          <a href="https://example.com/twitter" className="text-3xl font-medium text-zinc-200" target="_blank">
            <i className="mr-2 text-3xl"></i>Twitter
          </a>
          <a href="https://example.com/instagram" className="text-3xl font-medium text-zinc-200" target="_blank">
            <i className="mr-2 text-3xl"></i>Instagram
          </a>
          <a href="https://example.com/facebook" className="text-3xl font-medium text-zinc-200" target="_blank">
            <i className="mr-2 text-3xl"></i>Facebook
          </a>
        </div>
      </section>
      <section className="absolute bottom-0 m-auto w-full p-4">
        <p className="text-3xl text-zinc-400">Copyright 2024, RocketNotes</p>
      </section>
    </div>
  );
}
