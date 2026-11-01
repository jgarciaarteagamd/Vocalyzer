// Generic signal-processing helpers used by the voice analysis engine.

export type Signal = Float32Array | Float64Array;

export function toFloat64(x: ArrayLike<number>): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i];
  return out;
}

export function mean(x: ArrayLike<number>, start = 0, end = x.length): number {
  let s = 0;
  for (let i = start; i < end; i++) s += x[i];
  return end > start ? s / (end - start) : 0;
}

export function rms(x: ArrayLike<number>, start = 0, end = x.length): number {
  let s = 0;
  for (let i = start; i < end; i++) s += x[i] * x[i];
  return end > start ? Math.sqrt(s / (end - start)) : 0;
}

export function toDb(value: number, floor = 1e-10): number {
  return 20 * Math.log10(Math.max(value, floor));
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function stdev(values: number[]): number {
  if (values.length < 2) return NaN;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  let s = 0;
  for (const v of values) s += (v - m) * (v - m);
  return Math.sqrt(s / (values.length - 1));
}

export function slice(x: Signal, fs: number, t0: number, t1: number): Float64Array {
  const a = Math.max(0, Math.floor(t0 * fs));
  const b = Math.min(x.length, Math.ceil(t1 * fs));
  const out = new Float64Array(Math.max(0, b - a));
  for (let i = a; i < b; i++) out[i - a] = x[i];
  return out;
}

export function concat(parts: ArrayLike<number>[]): Float64Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float64Array(total);
  let o = 0;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) out[o + i] = p[i];
    o += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Resampling (windowed-sinc, arbitrary ratio, table-driven kernel)

const KERNEL_ZEROS = 16;
const KERNEL_RES = 256; // table points per zero crossing
let kernelTable: Float64Array | null = null;

function getKernelTable(): Float64Array {
  if (kernelTable) return kernelTable;
  const n = KERNEL_ZEROS * KERNEL_RES + 2;
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / KERNEL_RES; // in zero crossings
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = x >= KERNEL_ZEROS ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * x) / KERNEL_ZEROS);
    t[i] = sinc * w;
  }
  kernelTable = t;
  return t;
}

/** Band-limited resampling from fsIn to fsOut (anti-aliasing included when downsampling). */
export function resample(x: Signal, fsIn: number, fsOut: number): Float64Array {
  if (Math.abs(fsIn - fsOut) < 1e-9) return toFloat64(x);
  const table = getKernelTable();
  const ratio = fsOut / fsIn;
  const cutoff = Math.min(1, ratio) * 0.95; // relative to the input Nyquist
  const halfWidth = KERNEL_ZEROS / cutoff; // in input samples
  const nOut = Math.floor(x.length * ratio);
  const out = new Float64Array(nOut);
  for (let n = 0; n < nOut; n++) {
    const tIn = n / ratio;
    const k0 = Math.max(0, Math.ceil(tIn - halfWidth));
    const k1 = Math.min(x.length - 1, Math.floor(tIn + halfWidth));
    let s = 0;
    for (let k = k0; k <= k1; k++) {
      const d = Math.abs(tIn - k) * cutoff * KERNEL_RES;
      const i = d | 0;
      const f = d - i;
      const h = table[i] + (table[i + 1] - table[i]) * f;
      s += x[k] * h;
    }
    out[n] = s * cutoff;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Filters

/** Praat-style first-order pre-emphasis ("pre-emphasis from F Hz"). */
export function preEmphasis(x: Float64Array, fs: number, fromHz: number): Float64Array {
  const out = Float64Array.from(x);
  const a = Math.exp((-2 * Math.PI * fromHz) / fs);
  for (let i = out.length - 1; i >= 1; i--) out[i] -= a * out[i - 1];
  return out;
}

function biquadHighpass(fc: number, fs: number) {
  const w0 = (2 * Math.PI * fc) / fs;
  const q = Math.SQRT1_2;
  const alpha = Math.sin(w0) / (2 * q);
  const cosw = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: (1 + cosw) / 2 / a0,
    b1: -(1 + cosw) / a0,
    b2: (1 + cosw) / 2 / a0,
    a1: (-2 * cosw) / a0,
    a2: (1 - alpha) / a0,
  };
}

function biquadRun(x: Float64Array, c: ReturnType<typeof biquadHighpass>): Float64Array {
  const y = new Float64Array(x.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = c.b0 * x[i] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** Zero-phase (forward-backward) 2nd-order Butterworth high-pass filter. Removes DC and rumble. */
export function highpass(x: Signal, fs: number, fc = 34): Float64Array {
  const c = biquadHighpass(fc, fs);
  const fwd = biquadRun(toFloat64(x), c);
  fwd.reverse();
  const back = biquadRun(fwd, c);
  back.reverse();
  return back;
}

// ---------------------------------------------------------------------------
// Windows

export function hanning(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / n);
  return w;
}

/** Praat's Gaussian window (exp(-48 (phase-0.5)^2), edge-corrected). */
export function gaussianWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  const edge = Math.exp(-12);
  for (let i = 0; i < n; i++) {
    const phase = (i + 0.5) / n;
    w[i] = (Math.exp(-48 * (phase - 0.5) * (phase - 0.5)) - edge) / (1 - edge);
  }
  return w;
}

// ---------------------------------------------------------------------------
// Intensity / activity detection

export interface FrameEnergy {
  times: Float64Array; // frame centre times (s)
  db: Float64Array; // RMS level in dBFS
  frameStep: number;
}

/** Short-term RMS level (dBFS) with a rectangular window. */
export function frameEnergy(x: Signal, fs: number, frameDur = 0.03, step = 0.01): FrameEnergy {
  const n = Math.round(frameDur * fs);
  const hop = Math.round(step * fs);
  const count = x.length >= n ? Math.floor((x.length - n) / hop) + 1 : 0;
  const times = new Float64Array(count);
  const db = new Float64Array(count);
  for (let f = 0; f < count; f++) {
    const a = f * hop;
    let s = 0;
    for (let i = a; i < a + n; i++) s += x[i] * x[i];
    db[f] = 10 * Math.log10(s / n + 1e-12);
    times[f] = (a + n / 2) / fs;
  }
  return { times, db, frameStep: step };
}

export interface Segment {
  start: number; // s
  end: number; // s
}

/**
 * Frames above `thresholdDb` grouped into segments; gaps shorter than `bridge` s are merged and
 * segments shorter than `minDur` s are dropped.
 */
export function activeSegments(
  e: FrameEnergy,
  thresholdDb: number,
  bridge = 0.25,
  minDur = 0.15,
): Segment[] {
  const segs: Segment[] = [];
  let cur: Segment | null = null;
  const half = e.frameStep / 2;
  for (let i = 0; i < e.db.length; i++) {
    if (e.db[i] > thresholdDb) {
      const t0 = e.times[i] - half;
      const t1 = e.times[i] + half;
      if (cur && t0 - cur.end <= bridge) cur.end = t1;
      else {
        if (cur) segs.push(cur);
        cur = { start: t0, end: t1 };
      }
    }
  }
  if (cur) segs.push(cur);
  return segs.filter((s) => s.end - s.start >= minDur);
}

export function clippingRatio(x: Signal, threshold = 0.985): number {
  if (x.length === 0) return 0;
  let c = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= threshold) c++;
  return c / x.length;
}

export function peakAbs(x: ArrayLike<number>): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > p) p = a;
  }
  return p;
}
