/**
 * Audio worklets for the meeting console. The AudioContext runs at 24kHz
 * to match the Inworld wire format, so no resampling is needed anywhere.
 */

/** Batches mic input into ~40ms Float32 chunks posted to the main thread. */
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(960); // 40ms @ 24kHz
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    let i = 0;
    while (i < channel.length) {
      const n = Math.min(channel.length - i, this.buffer.length - this.offset);
      this.buffer.set(channel.subarray(i, i + n), this.offset);
      this.offset += n;
      i += n;
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer.slice(0));
        this.offset = 0;
      }
    }
    return true;
  }
}

/**
 * Plays PCM16 chunks from a growing queue. "flush" empties it instantly
 * (barge-in). Posts {playing} transitions so the UI can show talk state.
 */
class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.current = null;
    this.offset = 0;
    this.wasPlaying = false;
    this.port.onmessage = (e) => {
      if (e.data === "flush") {
        this.queue = [];
        this.current = null;
        this.offset = 0;
      } else {
        this.queue.push(e.data);
      }
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    let filled = 0;
    while (filled < out.length) {
      if (!this.current || this.offset >= this.current.length) {
        this.current = this.queue.shift() ?? null;
        this.offset = 0;
        if (!this.current) break;
      }
      const n = Math.min(out.length - filled, this.current.length - this.offset);
      for (let i = 0; i < n; i++) {
        out[filled + i] = this.current[this.offset + i] / 32768;
      }
      filled += n;
      this.offset += n;
    }
    for (let i = filled; i < out.length; i++) out[i] = 0;

    const playing = filled > 0;
    if (playing !== this.wasPlaying) {
      this.wasPlaying = playing;
      this.port.postMessage({ playing });
    }
    return true;
  }
}

registerProcessor("tokenmaxxer-capture", CaptureProcessor);
registerProcessor("tokenmaxxer-playback", PlaybackProcessor);
