/**
 * Browser QA of the meeting console: a real headed-equivalent Chromium with
 * a FAKE MICROPHONE playing synthesized speech — the room literally talks
 * to Max through the browser, and we screenshot what a meeting would see.
 *
 * Prereqs: gateway (4870), console (5170), playground (5171), jimmy proxy.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { wavFromPcm16 } from "../src/audio.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OUT = path.resolve(import.meta.dirname, "..", "..", ".claude", "tmp", "qa");
fs.mkdirSync(OUT, { recursive: true });

async function ttsPcm24k(say: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: say,
      response_format: "pcm",
    }),
  });
  if (!res.ok) throw new Error(`tts failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function silence(seconds: number): Buffer {
  return Buffer.alloc(Math.round(seconds * 24000) * 2);
}

async function buildMicTrack(): Promise<string> {
  const a = await ttsPcm24k("Hey Max, quick check — you there?");
  const b = await ttsPcm24k(
    "Max, put a pricing page for PurrBnB on the screen. Three tiers, make it pop.",
  );
  const pcm = Buffer.concat([
    silence(4), // Max greets the room first
    a,
    silence(7), // Max answers
    b,
    silence(25), // tool runs, page lands, Max confirms
  ]);
  const file = path.join(OUT, "qa-mic.wav");
  fs.writeFileSync(file, wavFromPcm16(pcm));
  return file;
}

const shot = async (page: import("playwright").Page, name: string) => {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log(`📸 ${name}`);
};

const micFile = await buildMicTrack();
console.log(`mic track ready: ${micFile}`);

const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--use-file-for-fake-audio-capture=${micFile}`,
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1680, height: 1000 },
  permissions: ["microphone"],
});
const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log(`[browser error] ${msg.text()}`);
});

await page.goto("http://localhost:5170/");
await page.waitForSelector("text=start listening", { timeout: 10_000 });
await shot(page, "01-initial.png");

await page.click("text=start listening");
console.log("listening started — the wav is now the room mic");

const layoutProbe = async (label: string) => {
  const info = await page.evaluate(
    `(() => { const m = document.querySelector("main"); return JSON.stringify({ w: window.innerWidth, grid: m ? getComputedStyle(m).gridTemplateColumns : null, iframe: !!document.querySelector("iframe") }); })()`,
  );
  console.log(`[layout ${label}] ${info}`);
};
await page.waitForTimeout(2000);
await layoutProbe("after-start");

// Max's greeting lands as the first agent transcript.
try {
  await page.waitForSelector("text=Max here", { timeout: 20_000 });
  await shot(page, "02-greeting.png");
} catch {
  console.log("⚠️ greeting did not appear — continuing, will fail QA at the end");
  await shot(page, "02-no-greeting.png");
}

// The first user turn (semantic VAD heard the fake mic).
await page.waitForSelector("text=/quick check/i", { timeout: 30_000 });
console.log("user turn transcribed in UI");

// Max replies, then the page request triggers write_page in the tool feed.
await page.waitForSelector("text=write_page", { timeout: 60_000 });
await layoutProbe("at-tool-feed");
await shot(page, "03-tool-feed.png");

// The preview navigates to the new page.
await page.waitForFunction(
  // string form: browser context, not node — keeps DOM types out of tsc
  `(() => { const el = document.querySelector("iframe"); return el && new URL(el.src).pathname !== "/"; })()`,
  { timeout: 60_000 },
);
// Give the freshly-written page a beat to hot-compile inside the iframe.
await page.waitForTimeout(4000);
await shot(page, "04-page-on-screen.png");

// Unhappy path: the playground's not-found page (a page nobody asked for).
await page.goto("http://localhost:5171/this-page-does-not-exist");
await page.waitForSelector("text=Say it out loud", { timeout: 10_000 });
await shot(page, "05-playground-404.png");

// The playground page itself, full screen (what the projector shows).
const iframeSrc = "http://localhost:5171/";
await page.goto(iframeSrc);
await page.waitForTimeout(1500);
await shot(page, "06-playground-home.png");

await browser.close();
console.log(`done — screenshots in ${OUT}`);
