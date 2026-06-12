import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { config } from "../config.js";
import { log } from "../log.js";

export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * One upstream Inworld Realtime connection. Emits:
 * - "event" (evt: RealtimeEvent) — every upstream event after session setup
 * - "ready" — session.updated received (config applied)
 * - "reconnecting" / "closed"
 *
 * Reconnects with backoff and re-applies the session config. The session
 * config is provided by the owner and can be updated (merged client
 * session.update) at any time.
 */
export class InworldUpstream extends EventEmitter {
  private ws: WebSocket | null = null;
  private closed = false;
  private retries = 0;
  ready = false;

  constructor(private sessionConfig: Record<string, unknown>) {
    super();
  }

  async connect(): Promise<void> {
    this.closed = false;
    const ws = new WebSocket(config.inworldUrl(), {
      headers: { Authorization: `Basic ${config.inworldApiKey}` },
    });
    this.ws = ws;

    ws.on("message", (raw) => {
      let evt: RealtimeEvent;
      try {
        evt = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (evt.type === "session.created") {
        this.sendRaw({ type: "session.update", session: this.sessionConfig });
        return; // session.created is internal; clients get their own
      }
      if (evt.type === "session.updated" && !this.ready) {
        this.ready = true;
        this.retries = 0;
        this.emit("ready");
      }
      this.emit("event", evt);
    });

    ws.on("close", (code) => {
      this.ready = false;
      if (this.closed) return;
      const delay = Math.min(500 * 2 ** this.retries++, 8000);
      log("inworld", `upstream closed (code=${code}), reconnecting in ${delay}ms`);
      this.emit("reconnecting");
      setTimeout(() => {
        if (!this.closed) void this.connect();
      }, delay);
    });

    ws.on("error", (err) => {
      log("inworld", `upstream error: ${err.message}`);
      // close handler drives the reconnect
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("inworld upstream connect timeout")),
        10_000,
      );
      ws.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /** Wait until the session config has been acknowledged. */
  async waitReady(timeoutMs = 10_000): Promise<void> {
    if (this.ready) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("inworld session.updated timeout")),
        timeoutMs,
      );
      this.once("ready", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  updateSession(sessionConfig: Record<string, unknown>) {
    this.sessionConfig = sessionConfig;
    this.sendRaw({ type: "session.update", session: sessionConfig });
  }

  sendRaw(obj: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}
