/**
 * The console's connection to the gateway: WebSocket events + mic capture +
 * speaker playback, all at PCM16 24kHz.
 */

export interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  at: number;
}

export interface ToolEntry {
  phase: "started" | "finished" | "failed";
  id: string;
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  elapsedMs?: number;
  at: number;
}

export interface FleetAgentView {
  slug: string;
  mission: string;
  topic: string;
  workspace: string;
  status: string;
  lastActivity: string;
  launchedAt: number;
}

export type ConnectionState = "idle" | "connecting" | "live" | "reconnecting";

export interface RoomState {
  connection: ConnectionState;
  agentTalking: boolean;
  muted: boolean;
  transcript: TranscriptEntry[];
  tools: ToolEntry[];
  fleet: FleetAgentView[];
  previewPath: string;
  statusMessage: string | null;
}

type Listener = (state: RoomState) => void;

const GATEWAY_URL = `ws://${window.location.hostname}:4870/realtime`;

export class RoomClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private playbackNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private listeners = new Set<Listener>();
  private shouldReconnect = false;

  state: RoomState = {
    connection: "idle",
    agentTalking: false,
    muted: false,
    transcript: [],
    tools: [],
    fleet: [],
    previewPath: "/",
    statusMessage: null,
  };

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private update(patch: Partial<RoomState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  async start(): Promise<void> {
    this.shouldReconnect = true;
    this.update({ connection: "connecting" });
    await this.initAudio();
    this.connect();
  }

  private connect() {
    const ws = new WebSocket(GATEWAY_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.update({ connection: "live", statusMessage: null });
    };
    ws.onclose = () => {
      if (!this.shouldReconnect) return;
      this.update({ connection: "reconnecting" });
      setTimeout(() => this.connect(), 1500);
    };
    ws.onmessage = (e) => this.onEvent(JSON.parse(e.data as string));
  }

  private async initAudio() {
    if (this.audioCtx) return;
    const ctx = new AudioContext({ sampleRate: 24000 });
    await ctx.audioWorklet.addModule("/worklets.js");
    this.audioCtx = ctx;

    // Speaker path
    const playback = new AudioWorkletNode(ctx, "tokenmaxxer-playback");
    playback.connect(ctx.destination);
    playback.port.onmessage = (e) => {
      const data = e.data as { playing?: boolean };
      if (typeof data.playing === "boolean") {
        this.update({ agentTalking: data.playing });
      }
    };
    this.playbackNode = playback;

    // Mic path — echo cancellation is on us in the WS architecture
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    this.mediaStream = stream;
    const source = ctx.createMediaStreamSource(stream);
    const capture = new AudioWorkletNode(ctx, "tokenmaxxer-capture");
    source.connect(capture);
    capture.port.onmessage = (e) => this.sendAudio(e.data as Float32Array);
  }

  private sendAudio(samples: Float32Array) {
    if (this.state.muted || this.ws?.readyState !== WebSocket.OPEN) return;
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const b64 = btoa(
      String.fromCharCode(...new Uint8Array(pcm.buffer)),
    );
    this.ws.send(
      JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }),
    );
  }

  private greeted = false;

  private onEvent(evt: Record<string, unknown>) {
    switch (evt.type) {
      case "session.created":
        // Voice convention: Max greets the room once it's actually live.
        if (!this.greeted) {
          this.greeted = true;
          this.ws?.send(JSON.stringify({ type: "tokenmaxxer.greet" }));
        }
        break;
      case "response.output_audio.delta": {
        const bytes = Uint8Array.from(atob(String(evt.delta ?? "")), (c) =>
          c.charCodeAt(0),
        );
        this.playbackNode?.port.postMessage(new Int16Array(bytes.buffer));
        break;
      }
      case "input_audio_buffer.speech_started":
        // barge-in: kill playback instantly
        this.playbackNode?.port.postMessage("flush");
        break;
      case "tokenmaxxer.transcript":
        this.update({
          transcript: [
            ...this.state.transcript,
            {
              role: evt.role as "user" | "agent",
              text: String(evt.text),
              at: Number(evt.at),
            },
          ].slice(-200),
        });
        break;
      case "tokenmaxxer.tool": {
        const entry: ToolEntry = {
          phase: evt.phase as ToolEntry["phase"],
          id: String(evt.id),
          tool: String(evt.tool),
          args: (evt.args ?? {}) as Record<string, unknown>,
          result: evt.result ? String(evt.result) : undefined,
          elapsedMs: evt.elapsedMs ? Number(evt.elapsedMs) : undefined,
          at: Date.now(),
        };
        const rest = this.state.tools.filter((t) => t.id !== entry.id);
        this.update({ tools: [entry, ...rest].slice(0, 50) });
        break;
      }
      case "tokenmaxxer.fleet":
        this.update({ fleet: evt.agents as FleetAgentView[] });
        break;
      case "tokenmaxxer.navigate":
        this.update({ previewPath: String(evt.path ?? "/") || "/" });
        break;
      case "tokenmaxxer.status":
        this.update({ statusMessage: String(evt.message) });
        break;
    }
  }

  stop() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    void this.audioCtx?.close();
    this.audioCtx = null;
    this.playbackNode = null;
    this.update({ connection: "idle", agentTalking: false, muted: false });
  }

  /**
   * Mute/unmute the mic. Muted = no audio reaches the gateway, so a noisy room
   * can't keep the VAD triggering on background sound; the mic track is disabled
   * too, so the OS shows the mic as off.
   */
  setMuted(muted: boolean) {
    this.mediaStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    this.update({ muted });
  }
}

export const room = new RoomClient();
