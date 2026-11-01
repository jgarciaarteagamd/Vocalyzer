// Deterministic synthetic voice generator used to validate the analysis engine against Praat.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const VOWELS: Record<string, [number, number][]> = {
  a: [
    [730, 90],
    [1090, 110],
    [2440, 170],
    [3400, 250],
  ],
  e: [
    [530, 80],
    [1840, 120],
    [2480, 170],
    [3500, 250],
  ],
  i: [
    [290, 60],
    [2250, 130],
    [3000, 180],
    [3700, 250],
  ],
  o: [
    [570, 80],
    [840, 100],
    [2410, 170],
    [3400, 250],
  ],
  u: [
    [300, 60],
    [870, 100],
    [2240, 170],
    [3400, 250],
  ],
};

function resonatorCascade(x: Float64Array, fs: number, formants: [number, number][]) {
  let y = x;
  for (const [f, bw] of formants) {
    const r = Math.exp((-Math.PI * bw) / fs);
    const theta = (2 * Math.PI * f) / fs;
    const a1 = -2 * r * Math.cos(theta);
    const a2 = r * r;
    const g = 1 + a1 + a2;
    const out = new Float64Array(y.length);
    let y1 = 0,
      y2 = 0;
    for (let i = 0; i < y.length; i++) {
      const v = g * y[i] - a1 * y1 - a2 * y2;
      y2 = y1;
      y1 = v;
      out[i] = v;
    }
    y = out;
  }
  return y;
}

/** Rosenberg glottal flow shape for phase in [0,1). */
function rosenberg(phase: number) {
  const tp = 0.4;
  const tn = 0.16;
  if (phase < tp) return 0.5 * (1 - Math.cos((Math.PI * phase) / tp));
  if (phase < tp + tn) return Math.cos((Math.PI * (phase - tp)) / (2 * tn));
  return 0;
}

export interface VowelSpec {
  fs: number;
  duration: number;
  f0: number;
  jitter: number; // relative SD of periods
  shimmer: number; // relative SD of cycle amplitudes
  noise: number; // aspiration noise level relative to voiced RMS
  vowel?: keyof typeof VOWELS;
  seed: number;
  vibratoHz?: number;
  vibratoCents?: number;
  f0Contour?: (t: number) => number; // optional absolute contour (Hz)
  amplitude?: number; // output peak
}

export function synthVowel(s: VowelSpec): Float64Array {
  const rand = mulberry32(s.seed);
  const n = Math.round(s.duration * s.fs);
  const flow = new Float64Array(n);
  let tStart = 0;
  const f0At = (t: number) => {
    const base = s.f0Contour ? s.f0Contour(t) : s.f0;
    const vib = s.vibratoHz ? Math.pow(2, ((s.vibratoCents ?? 0) / 1200) * Math.sin(2 * Math.PI * s.vibratoHz * t)) : 1;
    return base * vib;
  };
  let period = (1 / f0At(0)) * (1 + s.jitter * gaussian(rand));
  let amp = Math.max(0.05, 1 + s.shimmer * gaussian(rand));
  for (let i = 0; i < n; i++) {
    const t = i / s.fs;
    while (t >= tStart + period) {
      tStart += period;
      period = (1 / f0At(tStart)) * (1 + s.jitter * gaussian(rand));
      amp = Math.max(0.05, 1 + s.shimmer * gaussian(rand));
    }
    flow[i] = amp * rosenberg((t - tStart) / period);
  }
  // radiation (differentiation) of the flow
  const src = new Float64Array(n);
  for (let i = 1; i < n; i++) src[i] = flow[i] - flow[i - 1];
  let voiced = resonatorCascade(src, s.fs, VOWELS[s.vowel ?? "a"]);
  let r = 0;
  for (let i = 0; i < n; i++) r += voiced[i] * voiced[i];
  r = Math.sqrt(r / n);
  if (s.noise > 0) {
    const noise = new Float64Array(n);
    for (let i = 0; i < n; i++) noise[i] = gaussian(rand);
    let nr = 0;
    for (let i = 0; i < n; i++) nr += noise[i] * noise[i];
    nr = Math.sqrt(nr / n);
    voiced = Float64Array.from(voiced, (v, i) => v + (noise[i] / nr) * r * s.noise);
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(voiced[i]));
  const target = s.amplitude ?? 0.5;
  return Float64Array.from(voiced, (v) => (v / peak) * target);
}

/** Speech-like signal: voiced syllables with varying vowels and F0, fricative noise and pauses. */
export function synthSpeech(fs: number, seed: number, opts: { jitter: number; shimmer: number; noise: number; f0: number; syllables?: number }) {
  const rand = mulberry32(seed);
  const parts: Float64Array[] = [];
  const vowels = ["a", "e", "i", "o", "u"] as const;
  const nSyl = opts.syllables ?? 24;
  const silence = (d: number) => new Float64Array(Math.round(d * fs)).map(() => 0.0005 * gaussian(rand));
  parts.push(silence(0.3));
  for (let k = 0; k < nSyl; k++) {
    const dur = 0.16 + 0.14 * rand();
    const start = opts.f0 * (1.1 - (0.25 * k) / nSyl) * (1 + 0.08 * gaussian(rand));
    const end = start * (0.9 + 0.15 * rand());
    const v = synthVowel({
      fs,
      duration: dur,
      f0: start,
      f0Contour: (t) => start + ((end - start) * t) / dur,
      jitter: opts.jitter,
      shimmer: opts.shimmer,
      noise: opts.noise,
      vowel: vowels[Math.floor(rand() * vowels.length)],
      seed: seed * 100 + k,
      amplitude: 0.3 + 0.2 * rand(),
    });
    // 10 ms fades
    const fade = Math.round(0.01 * fs);
    for (let i = 0; i < fade; i++) {
      v[i] *= i / fade;
      v[v.length - 1 - i] *= i / fade;
    }
    parts.push(v);
    if (rand() < 0.5) {
      // fricative burst (high-passed noise)
      const len = Math.round((0.06 + 0.06 * rand()) * fs);
      const fr = new Float64Array(len);
      let prev = 0;
      for (let i = 0; i < len; i++) {
        const w = gaussian(rand);
        fr[i] = 0.05 * (w - prev);
        prev = w;
      }
      parts.push(fr);
    }
    if (k % 6 === 5) parts.push(silence(0.25 + 0.15 * rand()));
    else parts.push(silence(0.03));
  }
  parts.push(silence(0.3));
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float64Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export interface Fixture {
  name: string;
  fs: number;
  kind: "vowel" | "speech";
  signal: () => Float64Array;
}

export const FIXTURES: Fixture[] = [
  { name: "male_normal", fs: 44100, kind: "vowel", signal: () => synthVowel({ fs: 44100, duration: 3, f0: 118, jitter: 0.003, shimmer: 0.02, noise: 0.01, seed: 1, vibratoHz: 5, vibratoCents: 10 }) },
  { name: "female_normal", fs: 48000, kind: "vowel", signal: () => synthVowel({ fs: 48000, duration: 3, f0: 215, jitter: 0.004, shimmer: 0.025, noise: 0.02, seed: 2, vibratoHz: 5.5, vibratoCents: 12 }) },
  { name: "rough", fs: 44100, kind: "vowel", signal: () => synthVowel({ fs: 44100, duration: 3, f0: 130, jitter: 0.02, shimmer: 0.09, noise: 0.03, seed: 3 }) },
  { name: "breathy", fs: 44100, kind: "vowel", signal: () => synthVowel({ fs: 44100, duration: 3, f0: 160, jitter: 0.007, shimmer: 0.04, noise: 0.25, seed: 4 }) },
  { name: "severe", fs: 48000, kind: "vowel", signal: () => synthVowel({ fs: 48000, duration: 3, f0: 140, jitter: 0.04, shimmer: 0.15, noise: 0.35, seed: 5 }) },
  { name: "child_high", fs: 44100, kind: "vowel", signal: () => synthVowel({ fs: 44100, duration: 3, f0: 290, jitter: 0.005, shimmer: 0.03, noise: 0.05, seed: 6, vowel: "e" }) },
  { name: "speech_normal", fs: 44100, kind: "speech", signal: () => synthSpeech(44100, 7, { jitter: 0.004, shimmer: 0.03, noise: 0.02, f0: 125 }) },
  { name: "speech_dysphonic", fs: 48000, kind: "speech", signal: () => synthSpeech(48000, 8, { jitter: 0.03, shimmer: 0.12, noise: 0.3, f0: 200 }) },
];
