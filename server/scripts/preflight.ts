/**
 * Demo-day preflight: every moving part checked in one run.
 * `npx tsx scripts/preflight.ts` — exits non-zero if anything is off.
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";

const exec = promisify(execFile);
let failures = 0;

function report(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    report(name, true, detail ?? "");
  } catch (err) {
    report(name, false, (err as Error).message);
  }
}

await check("env keys", async () => {
  const required = ["INWORLD_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`missing ${missing.join(", ")}`);
});

await check("tmux", async () => {
  const { stdout } = await exec("tmux", ["-V"]);
  return stdout.trim();
});

await check("desktop apps (Chrome + a terminal)", async () => {
  const has = async (name: string) => {
    for (const base of ["/Applications", "/System/Applications"]) {
      try {
        await exec("test", ["-d", `${base}/${name}.app`]);
        return true;
      } catch {
        // not here
      }
    }
    return false;
  };
  if (!(await has("Google Chrome"))) throw new Error("Google Chrome not installed");
  const term = (await has("Warp")) ? "Warp" : (await has("iTerm")) ? "iTerm" : "Terminal";
  return `Chrome + ${term}`;
});

await check("kanban CLI", async () => {
  const { stdout } = await exec("kanban", ["--version"]);
  return stdout.trim();
});

await check("claude CLI", async () => {
  const { stdout } = await exec("claude", ["--version"]);
  return stdout.trim().split("\n")[0];
});

await check("gateway :4870", async () => {
  const res = await fetch("http://localhost:4870/health", {
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { fleet: number };
  return `fleet=${data.fleet}`;
});

await check("console :5170 (styled)", async () => {
  const res = await fetch("http://localhost:5170/", { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // tailwind CSS pipeline can wedge on long-running dev servers; verify the
  // stylesheet actually compiles right now
  const css = await fetch("http://localhost:5170/src/index.css", {
    signal: AbortSignal.timeout(3000),
  });
  const body = await css.text();
  if (!body.includes("tailwind") && body.length < 1000) {
    throw new Error("stylesheet looks empty — restart the console dev server");
  }
});

await check("playground :5171", async () => {
  const res = await fetch("http://localhost:5171/", { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

await check("jimmy proxy", async () => {
  const res = await fetch("http://localhost:4100/v1/models", {
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

await check("jimmy speed", async () => {
  const t0 = Date.now();
  const res = await fetch("http://localhost:4100/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.1-8B",
      messages: [{ role: "user", content: "Say ok." }],
      max_tokens: 5,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return `${Date.now() - t0}ms`;
});

await check("inworld realtime (gemma-4)", async () => {
  const t0 = Date.now();
  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(
      `wss://api.inworld.ai/api/v1/realtime/session?key=preflight-${Date.now()}&protocol=realtime`,
      { headers: { Authorization: `Basic ${process.env.INWORLD_API_KEY}` } },
    );
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timeout"));
    }, 15_000);
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    ws.on("message", (raw) => {
      const evt = JSON.parse(raw.toString());
      if (evt.type === "session.created") {
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              model: "inworld/models/gemma-4-26b-a4b-it",
              instructions: "Reply with one word.",
              output_modalities: ["text"],
            },
          }),
        );
      }
      if (evt.type === "session.updated") {
        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: "ok?" }] },
          }),
        );
        ws.send(JSON.stringify({ type: "response.create" }));
      }
      if (evt.type === "response.done") {
        clearTimeout(timer);
        ws.close();
        resolve(`${Date.now() - t0}ms`);
      }
      if (evt.type === "error") {
        clearTimeout(timer);
        ws.close();
        reject(new Error(String(evt.error?.message ?? "error")));
      }
    });
  });
});

await check("anthropic (brain)", async () => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 5,
      messages: [{ role: "user", content: "ok?" }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

console.log(failures === 0 ? "\n🚀 ALL SYSTEMS GO" : `\n💥 ${failures} check(s) failing`);
process.exit(failures === 0 ? 0 : 1);
