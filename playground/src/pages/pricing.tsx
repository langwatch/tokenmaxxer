import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">PurrBNB</h1>
        <h2 className="text-3xl font-black mb-4">Luxury pet-sitting for your feline friends</h2>
        <p className="text-2xl font-light">Discover our purr-fectly curated cat sitters and get your cat the royal treatment they deserve.</p>
      </section>
      <section className="relative mx-auto max-w-7xl p-8">
        <h2 className="text-3xl font-black mb-4">Pricing</h2>
        <div className="grid grid-cols-1 gap-8">
          <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 transition p-8">
            <div className="bg-gradient-from-violet-500 to-violet-300 p-2"></div>
            <div className="flex flex-col p-4">
              <h4 className="text-2xl font-bold">Kitten</h4>
              <p className="text-lg text-zinc-400">$19/mo</p>
              <p className="text-lg text-zinc-400">Basic listing, no frills</p>
              <button className="mt-4 rounded-xl bg-violet-500 hover:bg-violet-400 px-6 py-3 font-semibold text-white transition">Subscribe Now</button>
              <p className="text-sm text-zinc-400">Get instant access to our standard listings</p>
            </div>
          </div>
          <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 transition p-8">
            <div className="bg-gradient-from-violet-500 to-violet-300 p-2"></div>
            <div className="flex flex-col p-4">
              <h4 className="text-2xl font-bold">Siamese</h4>
              <p className="text-lg text-zinc-400">$49/mo</p>
              <p className="text-lg text-zinc-400">Enhanced visibility, with some extra sparkle</p>
              <button className="mt-4 rounded-xl bg-violet-500 hover:bg-violet-400 px-6 py-3 font-semibold text-white transition">Subscribe Now</button>
              <p className="text-sm text-zinc-400">Get featured in our standard listings, with some added flair</p>
            </div>
          </div>
          <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 transition p-8">
            <div className="bg-gradient-from-violet-500 to-violet-300 p-2"></div>
            <div className="flex flex-col p-4">
              <h4 className="text-2xl font-bold">Persian</h4>
              <p className="text-lg text-zinc-400">$99/mo</p>
              <p className="text-lg text-zinc-400">Premium placement, with personal concierge service</p>
              <button className="mt-4 rounded-xl bg-violet-500 hover:bg-violet-400 px-6 py-3 font-semibold text-white transition">Subscribe Now</button>
              <p className="text-sm text-zinc-400">Experience the ultimate in luxury pet-sitting with our top-tier service</p>
            </div>
          </div>
        </div>
      </section>
      <section className="relative mx-auto max-w-7xl p-8">
        <h2 className="text-3xl font-black mb-4">What you get with PurrBNB</h2>
        <div className="grid grid-cols-2 gap-8">
          <div className="flex items-center">
            <div className="w-14 h-14 text-zinc-900/100 rounded-full bg-zinc-100 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f7dc6e">
                <path d="M12 0C5.9 0 1 4.1 1 9v3.5l6 6-4.5 4.5-4.5-4.5-4.5 4.5-4.5-4.5-4.5 4.5-4.5 4.5 4.5-4.5 4.5z"></path>
              </svg>
            </div>
            <div className="flex items-start">
              <h4 className="text-2xl font-bold">Verified sitters</h4>
              <p className="text-lg text-zinc-400">All our sitters undergo rigorous screening and vetting</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-14 h-14 text-zinc-900/100 rounded-full bg-zinc-100 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f7dc6e">
                <path d="M12 14v4h6v8.5h-6 1.5v-1.5L11 18 8 14 5.5 11 1 18 4.5v4h4zm-1.5-9l4-4v-4.5L11 3 7.5 1 6 4 12 4 7.5 1 5.5 0l-4 4v4.5zm-1.5 2.5L11 7 7 12 5.5 14 6 15.5 11 7 13.5 8 16 5.5 13 7 10.5 12z"></path>
              </svg>
            </div>
            <div className="flex items-start">
              <h4 className="text-2xl font-bold">Personalized matching</h4>
              <p className="text-lg text-zinc-400">We match you with the perfect sitter for your cat's unique needs</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-14 h-14 text-zinc-900/100 rounded-full bg-zinc-100 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f7dc6e">
                <path d="M16 16c-4.4 0-8-3.6-8 4h3.2c2.4 0 4.2 0 6.6 2.2v-9.6c0-0.6-0.5-1.1-1.1-1.5 0-0.4-0.4-0.8-0.5-1.2V16 0.6C12.6 2.1 10 3.7 8 5 6.2 1.7 0 2 2 6C2.2 6 5 4 5.5 4 8.4 2.5 8.1 6.8 5.9 7.3C6 7 5.6 3.3 4.5 2 5.5 3.6 7 4.6 8.2 3.9c0.5 0.1 1 0.2 1.2 0.4 1 0.3 1.5 0.6 2.1 0.8 0.6 0.2 0.9 0.3 1.3 0.4 0.4 0.2 0.6 0.4 0.8 0.4 0.6 0.5 1 0.4 1.4 0.4 1.1 0.4 1.3 0.4 1.4 0.6 0.8 0.6 0.8 0.8 0.4 1.4 0.4 1.4 0.6 2 0.4 1.5 0.6 1 0.6 0.6 1 0.6 0.8 1 0.6 1 0.8 0.4 1 0.4 1 0.8 0.6 1.2 1 0.6 1.4 1 1 0.6 1 0.8 1 1 1 0.6 1 1 1 1 1 1 1z"></path>
              </svg>
            </div>
            <div className="flex items-start">
              <h4 className="text-2xl font-bold">Real-time updates</h4>
              <p className="text-lg text-zinc-400">Get real-time updates on your cat's stay</p>
            </div>
          </div>
        </div>
      </section>
      <section className="relative mx-auto max-w-7xl p-8">
        <h2 className="text-3xl font-black mb-4">.pet-lover-approved</h2>
        <p className="text-2xl font-light">Join the purr-fect community of cat lovers and sitters, working together for the best care and love for your feline friends</p>
        <div className="grid grid-cols-2 gap-8">
          <button className="rounded-xl bg-violet-500 hover:bg-violet-400 px-6 py-3 font-semibold text-white transition">Join Our Community</button>
          <button className="rounded-xl bg-zinc-500 hover:bg-zinc-400 px-6 py-3 font-semibold text-white transition">Contact Us</button>
        </div>
      </section>
    </div>
  );
}
