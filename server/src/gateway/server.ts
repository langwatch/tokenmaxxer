import http from "node:http";
import crypto from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "../config.js";
import type { TokenmaxxerEvent } from "../events.js";
import { InworldUpstream, type RealtimeEvent } from "../inworld/upstream.js";
import { log } from "../log.js";
import { fleet } from "../orchestrator/fleet.js";
import { MAX_GREETING } from "../persona.js";
import { executeTool } from "../tools/handlers.js";
import { buildSessionConfig, type ClientSessionRequest } from "./session-config.js";

/** All connected clients — tokenmaxxer.* events broadcast to every one. */
const clients = new Set<WebSocket>();

export function broadcast(event: TokenmaxxerEvent) {
  const payload = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

/** One meeting voice session: a client WS bridged to its own Inworld session. */
class GatewaySession {
  private upstream: InworldUpstream;
  /** call_ids already executed — the wire can describe one call twice. */
  private executedCalls = new Set<string>();
  // Dead-air recovery: a response that ends with only a dropped malformed
  // tool call leaves the user hanging. Nudge the model to speak, capped so
  // a misbehaving model can't loop us.
  private droppedMalformedThisResponse = false;
  private audioThisResponse = false;
  private recoveryAttempts = 0;

  constructor(private client: WebSocket) {
    this.upstream = new InworldUpstream(buildSessionConfig());
    this.upstream.on("event", (evt: RealtimeEvent) => this.onUpstream(evt));
    this.upstream.on("reconnecting", () =>
      this.sendToClient({
        type: "tokenmaxxer.status",
        message: "voice link dropped — reconnecting",
      }),
    );

    void this.upstream
      .connect()
      .then(() => {
        // Mirror the OpenAI Realtime handshake to the client; its own
        // session.update will be merged and forwarded.
        this.sendToClient({ type: "session.created", session: {} });
      })
      .catch((err) => {
        log("gateway", `upstream connect failed: ${err.message}`);
        this.sendToClient({
          type: "error",
          error: { message: `upstream connect failed: ${err.message}` },
        });
        client.close();
      });

    client.on("message", (raw) => this.onClient(raw.toString()));
    client.on("close", () => {
      this.upstream.close();
      clients.delete(client);
    });
  }

  private sendToClient(obj: unknown) {
    if (this.client.readyState === WebSocket.OPEN) {
      this.client.send(JSON.stringify(obj));
    }
  }

  private onClient(raw: string) {
    let msg: RealtimeEvent;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "session.update": {
        const requested = (msg as { session?: ClientSessionRequest }).session ?? null;
        this.upstream.updateSession(buildSessionConfig(requested));
        break;
      }
      case "tokenmaxxer.greet":
        // Voice convention: the agent greets first when the room comes online.
        this.upstream.sendRaw({
          type: "response.create",
          response: {
            instructions: `Say exactly: "${MAX_GREETING}"`,
          },
        });
        break;
      default:
        this.upstream.sendRaw(msg);
    }
  }

  private onUpstream(evt: RealtimeEvent) {
    // Tool calls are the gateway's job — execute, respond, keep talking.
    // Two wire shapes describe the same call; whichever arrives complete
    // first wins, deduped on call_id. Nameless/id-less events are dropped:
    // answering them with an empty call_id permanently corrupts the
    // upstream conversation.
    if (evt.type === "response.function_call_arguments.done") {
      this.maybeExecuteToolCall(
        evt.call_id as string | undefined,
        evt.name as string | undefined,
        (evt.arguments as string | undefined) ?? "{}",
      );
    }
    if (evt.type === "response.output_item.done") {
      const item = evt.item as
        | { type?: string; call_id?: string; name?: string; arguments?: string }
        | undefined;
      if (item?.type === "function_call") {
        this.maybeExecuteToolCall(item.call_id, item.name, item.arguments ?? "{}");
      }
    }

    if (evt.type === "response.created") {
      this.droppedMalformedThisResponse = false;
      this.audioThisResponse = false;
    }
    if (evt.type === "response.output_audio.delta") {
      this.audioThisResponse = true;
      this.recoveryAttempts = 0;
    }
    if (
      evt.type === "response.done" &&
      this.droppedMalformedThisResponse &&
      !this.audioThisResponse &&
      this.recoveryAttempts < 2
    ) {
      this.recoveryAttempts++;
      log("gateway", "response ended with only a malformed tool call — nudging a spoken reply");
      this.upstream.sendRaw({ type: "response.create" });
    }

    this.captureTranscripts(evt);
    this.sendToClient(evt);
  }

  private maybeExecuteToolCall(
    callId: string | undefined,
    name: string | undefined,
    rawArgs: string,
  ) {
    if (!callId || !name) {
      log("gateway", `dropping malformed tool call (call_id=${callId}, name=${name})`);
      this.droppedMalformedThisResponse = true;
      return;
    }
    if (this.executedCalls.has(callId)) return;
    this.executedCalls.add(callId);
    void this.handleToolCall(callId, name, rawArgs);
  }

  private captureTranscripts(evt: RealtimeEvent) {
    if (evt.type === "conversation.item.input_audio_transcription.completed") {
      const text = String(evt.transcript ?? "").trim();
      if (text) {
        broadcast({
          type: "tokenmaxxer.transcript",
          role: "user",
          text,
          at: Date.now(),
        });
      }
    }
    if (evt.type === "response.output_audio_transcript.done") {
      const text = String(evt.transcript ?? "").trim();
      if (text) {
        broadcast({
          type: "tokenmaxxer.transcript",
          role: "agent",
          text,
          at: Date.now(),
        });
      }
    }
    // User text turns (tests, text-mode clients) land as conversation items.
    const item = (
      evt as {
        item?: { role?: string; content?: { type?: string; text?: string }[] };
      }
    ).item;
    if (evt.type === "conversation.item.added" && item?.role === "user") {
      const text = (item.content ?? [])
        .filter((c) => c.type === "input_text")
        .map((c) => c.text ?? "")
        .join(" ")
        .trim();
      if (text) {
        broadcast({
          type: "tokenmaxxer.transcript",
          role: "user",
          text,
          at: Date.now(),
        });
      }
    }
  }

  private async handleToolCall(callId: string, name: string, rawArgs: string) {
    const id = crypto.randomUUID();
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch {
      // tolerate malformed args; handler validates
    }
    log("gateway", `tool ${name}(${rawArgs.slice(0, 120)})`);
    broadcast({ type: "tokenmaxxer.tool", phase: "started", id, tool: name, args });

    const t0 = Date.now();
    let output: Record<string, unknown>;
    try {
      const outcome = await executeTool(name, args);
      output = outcome.output;
      if (outcome.navigate !== undefined) {
        broadcast({ type: "tokenmaxxer.navigate", path: outcome.navigate });
      }
      broadcast({
        type: "tokenmaxxer.tool",
        phase: "finished",
        id,
        tool: name,
        args,
        result: JSON.stringify(output).slice(0, 300),
        elapsedMs: Date.now() - t0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      output = { status: "error", note: message };
      broadcast({
        type: "tokenmaxxer.tool",
        phase: "failed",
        id,
        tool: name,
        args,
        result: message,
        elapsedMs: Date.now() - t0,
      });
    }

    this.upstream.sendRaw({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    });
    this.upstream.sendRaw({ type: "response.create" });
  }
}

export function startGateway(): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, fleet: fleet.list().length }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server, path: "/realtime" });
  wss.on("connection", (ws) => {
    clients.add(ws);
    log("gateway", `client connected (${clients.size} total)`);
    new GatewaySession(ws);
    // Late joiners see the current fleet immediately.
    ws.send(JSON.stringify({ type: "tokenmaxxer.fleet", agents: fleet.list() }));
  });

  fleet.on("fleet", (agents) => broadcast({ type: "tokenmaxxer.fleet", agents }));

  server.listen(config.port, () => {
    log("gateway", `listening on http://localhost:${config.port} (ws: /realtime)`);
  });
  return server;
}
