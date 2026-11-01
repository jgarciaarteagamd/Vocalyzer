import { describe, expect, it } from "vitest";
import { analyzeRecordings } from "../src/lib/voice/analysis";
import { estimateScales } from "../src/lib/voice/estimate";
import type { RecordingSet } from "../src/lib/voice/types";
import { mulberry32, synthSpeech, synthVowel } from "./synth";

const FS = 48000;

function noise(seconds: number, level: number, seed: number) {
  const r = mulberry32(seed);
  return new Float64Array(Math.round(seconds * FS)).map(() => (r() * 2 - 1) * level);
}

function withSilence(x: Float64Array, pre = 0.6, post = 0.8, seed = 99) {
  const a = noise(pre, 0.0006, seed);
  const b = noise(post, 0.0006, seed + 1);
  const out = new Float64Array(a.length + x.length + b.length);
  out.set(a, 0);
  out.set(x, a.length);
  out.set(b, a.length + x.length);
  // add background noise everywhere
  const bg = noise(out.length / FS, 0.0006, seed + 2);
  for (let i = 0; i < out.length; i++) out[i] += bg[i];
  return out;
}

function fricative(seconds: number, seed: number, amp = 0.08) {
  const r = mulberry32(seed);
  let prev = 0;
  return new Float64Array(Math.round(seconds * FS)).map(() => {
    const w = r() * 2 - 1;
    const v = (w - prev) * amp;
    prev = w;
    return v;
  });
}

const f32 = (x: Float64Array) => Float32Array.from(x);

function session(kind: "normal" | "dysphonic"): RecordingSet {
  const p =
    kind === "normal"
      ? { jitter: 0.003, shimmer: 0.02, noise: 0.01, f0: 120, mpt: 20, s: 16, z: 15 }
      : { jitter: 0.035, shimmer: 0.13, noise: 0.35, f0: 135, mpt: 7, s: 15, z: 7 };
  const vowel = (dur: number, seed: number) =>
    synthVowel({ fs: FS, duration: dur, f0: p.f0, jitter: p.jitter, shimmer: p.shimmer, noise: p.noise, seed, vibratoHz: 5, vibratoCents: 8, amplitude: 0.4 });
  const z = (() => {
    const v = vowel(p.z, 13);
    const fr = fricative(p.z, 14, 0.03);
    return v.map((s, i) => s * 0.5 + fr[i]);
  })();
  return {
    silence: { samples: f32(noise(3, 0.0006 * 1.7, 1)), sampleRate: FS },
    vowel: { samples: f32(withSilence(vowel(5, 11))), sampleRate: FS },
    mpt: { samples: f32(withSilence(vowel(p.mpt, 12))), sampleRate: FS },
    s: { samples: f32(withSilence(fricative(p.s, 15))), sampleRate: FS },
    z: { samples: f32(withSilence(z)), sampleRate: FS },
    sentences: { samples: f32(withSilence(synthSpeech(FS, 21, { jitter: p.jitter, shimmer: p.shimmer, noise: p.noise, f0: p.f0, syllables: 30 }))), sampleRate: FS },
    reading: { samples: f32(withSilence(synthSpeech(FS, 22, { jitter: p.jitter, shimmer: p.shimmer, noise: p.noise, f0: p.f0, syllables: 60 }))), sampleRate: FS },
  };
}

describe("full session analysis", () => {
  it("normal voice → G0, plausible parameters", () => {
    const t0 = performance.now();
    const m = analyzeRecordings(session("normal"));
    const ms = performance.now() - t0;
    const e = estimateScales(m, { sex: "male", ageGroup: "18-39", lang: "es" });
    if (process.env.SESSION_VERBOSE) console.log(JSON.stringify({ ms, m, e }, null, 1));
    expect(m.vowel).not.toBeNull();
    expect(m.vowel!.f0Mean).toBeGreaterThan(110);
    expect(m.vowel!.f0Mean).toBeLessThan(130);
    expect(m.vowel!.jitterLocal).toBeLessThan(1.04);
    expect(m.vowel!.cpps).toBeGreaterThan(14.45);
    expect(m.mptSeconds).toBeGreaterThan(18);
    expect(m.mptSeconds).toBeLessThan(22);
    expect(m.szRatio).toBeGreaterThan(0.8);
    expect(m.szRatio).toBeLessThan(1.4);
    expect(m.speech).not.toBeNull();
    expect(m.avqi).not.toBeNull();
    expect(m.avqi!.value).toBeLessThan(2.28);
    expect(e.grbas.G).toBe(0);
    expect(m.quality.warnings).not.toContain("noisy_environment");
    expect(ms).toBeLessThan(30000);
  });

  it("dysphonic voice → G ≥ 2 with roughness and breathiness", () => {
    const m = analyzeRecordings(session("dysphonic"));
    const e = estimateScales(m, { sex: "male", ageGroup: "40-59", lang: "es" });
    if (process.env.SESSION_VERBOSE) console.log(JSON.stringify({ m, e }, null, 1));
    expect(m.vowel!.jitterLocal).toBeGreaterThan(1.04);
    expect(m.vowel!.shimmerLocal).toBeGreaterThan(3.81);
    expect(m.mptSeconds).toBeLessThan(9);
    expect(m.szRatio).toBeGreaterThan(1.4);
    expect(m.avqi!.value).toBeGreaterThan(2.28);
    expect(e.grbas.G).toBeGreaterThanOrEqual(2);
    expect(e.grbas.R).toBeGreaterThanOrEqual(1);
    expect(e.grbas.B).toBeGreaterThanOrEqual(1);
    expect(e.capev.overall).toBeGreaterThan(35);
  });
});
