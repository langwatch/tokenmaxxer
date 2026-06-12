/**
 * Prompts for the speed-codegen chain. Tuned for ChatJimmy's aggressively
 * quantized Llama 3.1 8B: the model outputs ONLY the JSX body — the part
 * it is reliably good at — and the file skeleton (imports, function,
 * export) is applied in code afterwards. Experiments showed full-file
 * output fails ~half the time (missing export wrapper), body-only with
 * structural wrapping almost never does.
 */

export const PAGE_SYSTEM_PROMPT = `You write the JSX body of dark, modern, expensive-looking React pages styled with Tailwind utility classes.

OUTPUT RULES — all mandatory:
- Output ONLY JSX, starting with < and ending with >. No imports, no function declaration, no export, no markdown fences, no explanation.
- The JSX must be ONE root element: <div className="min-h-screen bg-zinc-950 text-zinc-100"> ... </div>
- Tailwind classes only. No style objects, no CSS, no external libraries, no images, no fetch, no hooks.
- Complete, real content: punchy confident copy, never lorem ipsum, never placeholders like "..." or TODO.

STYLE COOKBOOK (follow unless the request demands otherwise):
- Hero: text-5xl md:text-7xl font-black tracking-tight heading; one accent phrase inside <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">.
- A soft glow at the top: <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
- Sections: <section className="mx-auto max-w-6xl px-6 py-20">.
- Cards: rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8, hover:border-zinc-600 transition.
- Highlighted card: add ring-2 ring-violet-500 and a small uppercase badge.
- Buttons: rounded-xl bg-violet-500 hover:bg-violet-400 px-6 py-3 font-semibold text-white transition.
- Emoji as icons (🐱 ⚡ ✨ 🚀) inside <div className="rounded-xl bg-zinc-800 p-3 text-2xl w-fit">.

EXAMPLE (request: "a tiny page that welcomes beta users of RocketNotes"):
<div className="min-h-screen bg-zinc-950 text-zinc-100">
  <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-500/10 to-transparent"></div>
  <section className="relative mx-auto max-w-6xl px-6 py-24 text-center">
    <p className="text-sm uppercase tracking-[0.3em] text-violet-400">RocketNotes beta</p>
    <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">Notes that <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">write back.</span></h1>
    <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">You made it into the beta. Strap in.</p>
    <button className="mt-10 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Open my workspace</button>
  </section>
</div>`;

export function writePagePrompt(slug: string, description: string): string {
  return `JSX body for the page "/${slug}": ${description}

Make it a full rich page: hero plus 2-4 content sections. Output only the JSX.`;
}

export function editPagePrompt(
  slug: string,
  instructions: string,
  currentBody: string,
): string {
  return `Current JSX body of the page "/${slug}":

${currentBody}

Output the COMPLETE updated JSX body with this change applied: ${instructions}

Keep everything else exactly as it is. Output only the JSX.`;
}

export function retryPrompt(error: string): string {
  return `That JSX failed to compile: ${error}
Output the corrected COMPLETE JSX body now, nothing else.`;
}

/** The file skeleton applied around the model's JSX body. */
export function wrapBody(body: string): string {
  const indented = body
    .trim()
    .split("\n")
    .map((l) => (l ? `    ${l}` : l))
    .join("\n");
  return `import React from "react";

export default function Page() {
  return (
${indented}
  );
}
`;
}
