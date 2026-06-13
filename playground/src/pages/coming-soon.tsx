import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-6xl font-black tracking-tight md:text-8xl">The future of workflow is almost here.</h1>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-lg text-zinc-400">We're building something incredible.</p>
        <p className="text-lg text-zinc-400">Join the waitlist to be the first to know.</p>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex justify-center">
          <form>
            <input type="email" className="rounded-xl bg-zinc-900 text-zinc-100 p-4 text-lg w-full placeholder:text-zinc-300" placeholder="your email address" />
            <button className="ml-4 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Notify Me</button>
          </form>
        </div>
      </section>
    </div>
  );
}
