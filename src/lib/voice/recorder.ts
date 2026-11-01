// Microphone capture in the browser. Audio stays in memory (Float32 chunks) and is never uploaded.

const WORKLET_SOURCE = `
class VzCaptureProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.size = 2048; this.buf = new Float32Array(this.size); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.size) {
          this.port.postMessage(this.buf, [this.buf.buffer]);
          this.buf = new Float32Array(this.size);
          this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("vz-capture", VzCaptureProcessor);
`;

export type MicErrorCode = "denied" | "unsupported" | "insecure";

export class MicError extends Error {
  constructor(public code: MicErrorCode) {
    super(code);
  }
}

export class MicRecorder {
  private chunks: Float32Array[] = [];
  private recording = false;
  private levelListeners = new Set<(db: number) => void>();
  private constructor(
    public readonly ctx: AudioContext,
    private readonly stream: MediaStream,
    private readonly nodes: AudioNode[],
  ) {}

  get sampleRate() {
    return this.ctx.sampleRate;
  }

  get isRecording() {
    return this.recording;
  }

  static async open(): Promise<MicRecorder> {
    if (typeof window !== "undefined" && !window.isSecureContext) throw new MicError("insecure");
    if (!navigator.mediaDevices?.getUserMedia) throw new MicError("unsupported");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      });
    } catch {
      throw new MicError("denied");
    }
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    if (ctx.state === "suspended") await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    mute.connect(ctx.destination);

    let rec: MicRecorder;
    if (ctx.audioWorklet && typeof AudioWorkletNode !== "undefined") {
      const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "vz-capture", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
      source.connect(node);
      node.connect(mute);
      rec = new MicRecorder(ctx, stream, [source, node, mute]);
      node.port.onmessage = (e: MessageEvent<Float32Array>) => rec.handleChunk(e.data);
    } else {
      // Fallback for older browsers.
      const node = ctx.createScriptProcessor(4096, 1, 1);
      source.connect(node);
      node.connect(mute);
      rec = new MicRecorder(ctx, stream, [source, node, mute]);
      node.onaudioprocess = (e) => rec.handleChunk(new Float32Array(e.inputBuffer.getChannelData(0)));
    }
    return rec;
  }

  private handleChunk(chunk: Float32Array) {
    if (this.recording) this.chunks.push(chunk);
    if (this.levelListeners.size) {
      let s = 0;
      for (let i = 0; i < chunk.length; i++) s += chunk[i] * chunk[i];
      const db = 10 * Math.log10(s / chunk.length + 1e-12);
      this.levelListeners.forEach((fn) => fn(db));
    }
  }

  onLevel(fn: (db: number) => void): () => void {
    this.levelListeners.add(fn);
    return () => this.levelListeners.delete(fn);
  }

  start() {
    this.chunks = [];
    this.recording = true;
  }

  /** Current recording length in seconds. */
  elapsed(): number {
    let n = 0;
    for (const c of this.chunks) n += c.length;
    return n / this.ctx.sampleRate;
  }

  stop(): Float32Array {
    this.recording = false;
    let n = 0;
    for (const c of this.chunks) n += c.length;
    const out = new Float32Array(n);
    let o = 0;
    for (const c of this.chunks) {
      out.set(c, o);
      o += c.length;
    }
    this.chunks = [];
    return out;
  }

  close() {
    this.recording = false;
    this.chunks = [];
    this.levelListeners.clear();
    this.stream.getTracks().forEach((t) => t.stop());
    this.nodes.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        // ignore
      }
    });
    void this.ctx.close().catch(() => {});
  }
}

/** Local playback of a recording (never leaves the device). Returns a stop function. */
export function playSamples(samples: Float32Array, sampleRate: number, onEnded?: () => void): () => void {
  const Ctx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(new Float32Array(samples), 0);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.onended = () => {
    void ctx.close().catch(() => {});
    onEnded?.();
  };
  src.start();
  return () => {
    try {
      src.stop();
    } catch {
      // ignore
    }
  };
}

/** Quick checks right after a take, so the user can repeat it immediately. */
export function takeCheck(samples: Float32Array, sampleRate: number, expectSound: boolean) {
  let peak = 0;
  let clipped = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    if (a >= 0.985) clipped++;
    sum += samples[i] * samples[i];
  }
  const rmsDb = 10 * Math.log10(sum / Math.max(1, samples.length) + 1e-12);
  const peakDb = 20 * Math.log10(peak + 1e-12);
  return {
    seconds: samples.length / sampleRate,
    peakDb,
    rmsDb,
    noSound: expectSound && peakDb < -42,
    clipped: clipped / Math.max(1, samples.length) > 0.001,
    noisy: !expectSound && rmsDb > -50,
  };
}
