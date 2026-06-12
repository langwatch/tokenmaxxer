import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import WebSocket from "ws";

const SERVER_DIR = path.resolve(import.meta.dirname, "..", "..");

export interface TestServer {
  port: number;
  url: string;
  proc: ChildProcess;
  stop: () => void;
}

/** Spawn the real server on a test port and wait for /health. */
export async function startTestServer(
  env: Record<string, string> = {},
): Promise<TestServer> {
  const port = 4900 + Math.floor(Math.random() * 90);
  const proc = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      TOKENMAXXER_PORT: String(port),
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout?.on("data", (d: Buffer) => {
    if (process.env.TEST_SERVER_LOGS) console.log(`[server] ${d.toString().trim()}`);
  });
  proc.stderr?.on("data", (d: Buffer) =>
    console.error(`[server!] ${d.toString().trim()}`),
  );

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) {
        return {
          port,
          url: `ws://localhost:${port}/realtime`,
          proc,
          stop: () => proc.kill("SIGTERM"),
        };
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  proc.kill("SIGTERM");
  throw new Error("test server did not become healthy in 30s");
}

type Predicate = (evt: Record<string, unknown>) => boolean;

/**
 * Minimal realtime client for integration tests: manual turn-taking, text
 * in, events out. Mirrors how the scenario adapter drives the gateway.
 */
export class GatewayClient {
  private ws!: WebSocket;
  events: Record<string, unknown>[] = [];
  private waiters: {
    predicate: Predicate;
    resolve: (evt: Record<string, unknown>) => void;
  }[] = [];

  async connect(url: string): Promise<void> {
    this.ws = new WebSocket(url);
    this.ws.on("message", (raw) => {
      const evt = JSON.parse(raw.toString()) as Record<string, unknown>;
      this.events.push(evt);
      for (let i = this.waiters.length - 1; i >= 0; i--) {
        if (this.waiters[i].predicate(evt)) {
          const [w] = this.waiters.splice(i, 1);
          w.resolve(evt);
        }
      }
    });
    await new Promise<void>((resolve, reject) => {
      this.ws.once("open", resolve);
      this.ws.once("error", reject);
    });
  }

  send(obj: unknown): void {
    this.ws.send(JSON.stringify(obj));
  }

  /** Configure manual turn-taking (what the scenario adapter does). */
  async configureManualTurns(): Promise<void> {
    await this.waitFor((e) => e.type === "session.created", 15_000);
    this.send({
      type: "session.update",
      session: {
        type: "realtime",
        model: "client-model-to-be-overridden",
        instructions: "client instructions to be overridden",
        audio: { input: { turn_detection: null } },
      },
    });
    await this.waitFor((e) => e.type === "session.updated", 15_000);
  }

  /** Send a user text turn and request a response. */
  sayText(text: string): void {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    this.send({ type: "response.create" });
  }

  waitFor(predicate: Predicate, timeoutMs = 60_000): Promise<Record<string, unknown>> {
    const existing = this.events.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.resolve === wrapped);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(
          new Error(
            `waitFor timed out; last events: ${this.events
              .slice(-8)
              .map((e) => e.type)
              .join(", ")}`,
          ),
        );
      }, timeoutMs);
      const wrapped = (evt: Record<string, unknown>) => {
        clearTimeout(timer);
        resolve(evt);
      };
      this.waiters.push({ predicate, resolve: wrapped });
    });
  }

  audioBytes(): number {
    return this.events
      .filter((e) => e.type === "response.output_audio.delta")
      .reduce((sum, e) => sum + Buffer.from(String(e.delta), "base64").length, 0);
  }

  close(): void {
    this.ws?.close();
  }
}
