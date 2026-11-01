// Compares the TypeScript analysis engine with Praat (parselmouth) on deterministic synthetic voices.
// Reference values: tests/praat-reference.json (regenerate with scripts/praat_reference.py).
import { describe, expect, it } from "vitest";
import ref from "./praat-reference.json";
import { FIXTURES } from "./synth";
import { trackPitch } from "../src/lib/voice/pitch";
import { detectPulses, perturbation } from "../src/lib/voice/perturbation";
import { harmonicity } from "../src/lib/voice/harmonicity";
import { cpps } from "../src/lib/voice/cepstrum";
import { ltasMeasures } from "../src/lib/voice/ltas";
import { resample } from "../src/lib/voice/signal";

type Ref = Record<string, number | null | number[]>;
const reference = (ref as { fixtures: Record<string, Ref> }).fixtures;

export function analyseFixture(x: Float64Array, fs: number) {
  const pitch = trackPitch(x, fs, { floor: 75, ceiling: 600, timeStep: 0.01 });
  const voiced = Array.from(pitch.f0).filter((v) => v > 0);
  const f0Mean = voiced.reduce((a, b) => a + b, 0) / voiced.length;
  const pulses = detectPulses(x, fs, pitch);
  const pert = perturbation(x, fs, pulses);
  const hnr = harmonicity(x, fs).meanDb;
  const c = cpps(x, fs).cpps;
  const l = ltasMeasures(x, fs);
  return { f0Mean, voicedFrames: voiced.length, pulses, pert, hnr, cpps: c, ltas: l };
}

const rows: string[] = [];

describe("agreement with Praat " + (ref as { praat_version: string }).praat_version, () => {
  for (const fx of FIXTURES) {
    it(fx.name, () => {
      const r = reference[fx.name] as Record<string, number>;
      const x = fx.signal();
      const m = analyseFixture(x, fx.fs);
      const line = {
        f0: [m.f0Mean, r.f0_mean],
        pulses: [m.pulses.length, r.pulses],
        jitt: [m.pert.jitterLocal, r.jitter_local],
        rap: [m.pert.jitterRap, r.jitter_rap],
        ppq5: [m.pert.jitterPpq5, r.jitter_ppq5],
        shim: [m.pert.shimmerLocal, r.shimmer_local],
        shdB: [m.pert.shimmerDb, r.shimmer_db],
        apq3: [m.pert.shimmerApq3, r.shimmer_apq3],
        apq11: [m.pert.shimmerApq11, r.shimmer_apq11],
        hnr: [m.hnr, r.hnr],
        cpps: [m.cpps, r.cpps],
        slope: [m.ltas.slope, r.ltas_slope],
        tilt: [m.ltas.tilt, r.ltas_tilt],
      };
      rows.push(
        fx.name.padEnd(17) +
          Object.entries(line)
            .map(([k, [a, b]]) => `${k} ${a.toFixed(2)}/${b.toFixed(2)}`)
            .join("  "),
      );
      if (process.env.PRAAT_VERBOSE) console.log(rows[rows.length - 1]);

      const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);
      expect(rel(m.f0Mean, r.f0_mean)).toBeLessThan(fx.kind === "speech" ? 0.03 : 0.005);
      expect(Math.abs(m.hnr - r.hnr)).toBeLessThan(fx.kind === "speech" ? 1.5 : 0.2);
      expect(Math.abs(m.cpps - r.cpps)).toBeLessThan(0.2);
      expect(Math.abs(m.ltas.slope - r.ltas_slope)).toBeLessThan(0.5);
      expect(Math.abs(m.ltas.tilt - r.ltas_tilt)).toBeLessThan(0.75);
      // Perturbation measures: small absolute values, compare with a mixed abs/rel tolerance.
      const close = (a: number, b: number, absTol: number, relTol: number) =>
        Math.abs(a - b) <= Math.max(absTol, relTol * Math.abs(b));
      expect(close(m.pert.jitterLocal, r.jitter_local, 0.08, 0.15)).toBe(true);
      expect(close(m.pert.jitterRap, r.jitter_rap, 0.06, 0.2)).toBe(true);
      expect(close(m.pert.shimmerLocal, r.shimmer_local, 0.4, 0.12)).toBe(true);
      expect(close(m.pert.shimmerDb, r.shimmer_db, 0.04, 0.12)).toBe(true);
    });
  }
});

// Optional: resampling sanity (used by CPPS and pitch tracking)
describe("resampler", () => {
  it("preserves a low-frequency sine when downsampling 48k → 10k", () => {
    const fs = 48000;
    const x = new Float64Array(fs).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / fs));
    const y = resample(x, fs, 10000);
    let peak = 0;
    for (let i = 200; i < y.length - 200; i++) peak = Math.max(peak, Math.abs(y[i]));
    expect(peak).toBeGreaterThan(0.97);
    expect(peak).toBeLessThan(1.03);
  });
});
