import http from "node:http";
import crypto from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "../config.js";
import type { TokenmaxxerEvent } from "../events.js";
import { InworldUpstream, type RealtimeEvent } from "../inworld/upstream.js";
import { log } from "../log.js";
import { fleet } from "../orchestrator/fleet.js";
import { tracer } from "../observability.js";
import { MAX_GREETING } from "../persona.js";
import { transcribePcm } from "./stt-shim.js";
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
  // Capacity resilience: transient "model at capacity" errors are retried;
  // repeated ones switch the session to the fallback model so the room
  // never goes dead.
  private capacityErrors = 0;
  private onFallbackModel = false;
  private lastClientSessionRequest: ClientSessionRequest | null = null;
  // Manual-turn mode (scenario tests): Inworld does not transcribe
  // committed audio when turn_detection is null, so the gateway buffers
  // the turn's audio and injects a whisper transcript as text instead.
  private manualTurns = false;
  private manualAudioBuf: Buffer[] = [];
  private pendingManualCommit = false;
  private pendingResponseCreate = false;

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
    if (process.env.TOKENMAXXER_WIRE_LOG) {
      log("wire", `client→ ${msg.type}`);
    }

    switch (msg.type) {
      case "session.update": {
        const requested = (msg as { session?: ClientSessionRequest }).session ?? null;
        this.lastClientSessionRequest = requested;
        this.manualTurns =
          requested?.audio?.input != null &&
          "turn_detection" in requested.audio.input &&
          requested.audio.input.turn_detection === null;
        this.upstream.updateSession(
          buildSessionConfig(
            requested,
            this.onFallbackModel ? config.inworldFallbackModel : undefined,
          ),
        );
        break;
      }
      case "input_audio_buffer.append": {
        if (!this.manualTurns) {
          this.upstream.sendRaw(msg);
          break;
        }
        this.manualAudioBuf.push(
          Buffer.from(String((msg as { audio?: string }).audio ?? ""), "base64"),
        );
        break;
      }
      case "input_audio_buffer.commit": {
        if (!this.manualTurns) {
          this.upstream.sendRaw(msg);
          break;
        }
        void this.commitManualTurn();
        break;
      }
      case "response.create": {
        if (this.manualTurns && this.pendingManualCommit) {
          // The transcript injection is async; hold the response until the
          // user item is actually upstream.
          this.pendingResponseCreate = true;
          break;
        }
        this.upstream.sendRaw(msg);
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
    if (process.env.TOKENMAXXER_WIRE_LOG && evt.type !== "response.output_audio.delta") {
      log("wire", `←upstream ${evt.type}${evt.type === "error" ? " " + JSON.stringify(evt.error) : ""}`);
    }
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
      this.capacityErrors = 0;
    }
    if (evt.type === "error" && this.handleCapacityError(evt)) {
      return; // handled — the client never sees transient capacity blips
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

  /**
   * Manual-turn commit: whisper the buffered audio, inject the transcript
   * upstream as a text item, surface the transcription event to the client
   * (the adapter records it as the user transcript), then release any held
   * response.create.
   */
  private async commitManualTurn(): Promise<void> {
    this.pendingManualCommit = true;
    const pcm = Buffer.concat(this.manualAudioBuf);
    this.manualAudioBuf = [];
    let text = "";
    try {
      text = await transcribePcm(pcm);
    } catch (err) {
      log("stt-shim", `transcription failed: ${(err as Error).message}`);
    }
    if (!text) text = "[inaudible]";
    log("gateway", `manual turn transcribed: "${text}"`);

    this.upstream.sendRaw({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    this.sendToClient({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: text,
    });
    // The injected item echoes back from upstream; captureTranscripts
    // broadcasts it from there, same as a plain text turn.

    this.pendingManualCommit = false;
    if (this.pendingResponseCreate) {
      this.pendingResponseCreate = false;
      this.upstream.sendRaw({ type: "response.create" });
    }
  }

  /** Returns true when the error was a capacity blip and is being handled. */
  private handleCapacityError(evt: RealtimeEvent): boolean {
    const message = String(
      (evt as { error?: { message?: string } }).error?.message ?? "",
    );
    if (!/at capacity|ResourceExhausted|temporarily/i.test(message)) {
      return false;
    }
    this.capacityErrors++;
    if (this.capacityErrors <= 2) {
      log("gateway", `model at capacity (attempt ${this.capacityErrors}) — retrying`);
      broadcast({
        type: "tokenmaxxer.status",
        message: "model at capacity — retrying",
      });
      setTimeout(() => this.upstream.sendRaw({ type: "response.create" }), 1200);
      return true;
    }
    if (!this.onFallbackModel) {
      this.onFallbackModel = true;
      log("gateway", `switching session to fallback model ${config.inworldFallbackModel}`);
      broadcast({
        type: "tokenmaxxer.status",
        message: `primary model at capacity — switched to ${config.inworldFallbackModel}`,
      });
      this.upstream.updateSession(
        buildSessionConfig(this.lastClientSessionRequest, config.inworldFallbackModel),
      );
      setTimeout(() => this.upstream.sendRaw({ type: "response.create" }), 500);
      return true;
    }
    return false; // fallback also failing — surface the error
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
      const outcome = await tracer.withActiveSpan(`tool.${name}`, async (span) => {
        span.setType("tool");
        span.setInput(args);
        const result = await executeTool(name, args);
        span.setOutput(result.output);
        return result;
      });
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
