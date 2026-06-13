import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-crimson-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Stress-Free Rides for Your <span className="bg-gradient-to-r from-crimson-400 to-fuchsia-400 bg-clip-text text-transparent">Best Friend.</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">BarkRide offers premium, on-demand transportation for your dog, ensuring comfort and safety every journey.</p>
        <div className="flex justify-center gap-8 md:gap-12">
          <button className="mt-10 rounded-xl bg-crimson-700 px-6 py-3 font-semibold text-white transition hover:bg-crimson-600">Get Started</button>
          <button className="mt-10 rounded-xl bg-crimson-700 px-6 py-3 font-semibold text-white transition hover:bg-crimson-600">View Pricing</button>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 text-center text-4xl font-bold tracking-tight">Our Commitment to Excellence</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 transition hover:border-zinc-600">
            <div className="mb-4 text-4xl"></div>
            <h3 className="mb-3 text-xl font-semibold">Vetted Drivers</h3>
            <p className="text-zinc-400">Every BarkRide driver undergoes rigorous background checks and comprehensive training in pet care and safety protocols.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 transition hover:border-zinc-600">
            <div className="mb-4 text-4xl"></div>
            <h3 className="mb-3 text-xl font-semibold">Real-time Tracking</h3>
            <p className="text-zinc-400">Monitor your dog's journey with live GPS tracking, receiving updates directly to your phone for complete peace of mind.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 transition hover:border-zinc-600">
            <div className="mb-4 text-4xl"></div>
            <h3 className="mb-3 text-xl font-semibold">Safety Protocols</h3>
            <p className="text-zinc-400">We adhere to the highest safety standards, with secure vehicle setups and emergency preparedness for every ride.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-6 text-4xl font-bold tracking-tight">Seamless Booking, Superior Service</h2>
        <p className="mx-auto max-w-2xl text-lg text-zinc-400">Experience the ease of scheduling a ride for your dog with our intuitive app. From doorstep pickup to safe arrival, we handle everything with care.</p>
        <div className="flex justify-center gap-8 md:gap-12">
          <button className="mt-10 rounded-xl bg-crimson-700 px-6 py-3 font-semibold text-white transition hover:bg-crimson-600">Book a Ride Now</button>
          <button className="mt-10 rounded-xl bg-crimson-700 px-6 py-3 font-semibold text-white transition hover:bg-crimson-600">Get Started</button>
        </div>
      </section>
    </div>
  );
}
