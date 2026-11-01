// Harmonics-to-noise ratio, modelled on Praat "To Harmonicity (cc)": forward cross-correlation
// with a one-period window; HNR = 10·log10(r / (1 − r)) per voiced frame, averaged in dB.

import { fft, nextPow2 } from "./fft";
import type { Signal } from "./signal";

export interface HnrOptions {
  timeStep?: number;
  minPitch?: number;
  silenceThreshold?: number;
  periodsPerWindow?: number;
}

export interface HnrResult {
  meanDb: number;
  frames: number; // voiced frames used
  values: Float64Array; // per-frame dB (NaN = unvoiced)
}

export function harmonicity(x: Signal, fs: number, opts: HnrOptions = {}): HnrResult {
  const dt = opts.timeStep ?? 0.01;
  const minPitch = opts.minPitch ?? 75;
  const silenceThreshold = opts.silenceThreshold ?? 0.1;
  const ppw = opts.periodsPerWindow ?? 1.0;

  const W = Math.max(4, Math.round((ppw / minPitch) * fs));
  const L = Math.ceil(fs / minPitch) + 1;
  const minLag = 2;
  const span = W + L;
  const nfft = nextPow2(span + 1);

  const duration = x.length / fs;
  const spanDur = span / fs;
  const nFrames = duration >= spanDur ? Math.floor((duration - spanDur) / dt) + 1 : 0;
  const t1 = 0.5 * (duration - (nFrames - 1) * dt);

  let gm = 0;
  for (let i = 0; i < x.length; i++) gm += x[i];
  gm /= Math.max(1, x.length);
  let globalPeak = 0;
  for (let i = 0; i < x.length; i++) globalPeak = Math.max(globalPeak, Math.abs(x[i] - gm));
  if (globalPeak === 0) globalPeak = 1;

  const values = new Float64Array(nFrames).fill(NaN);
  const are = new Float64Array(nfft);
  const aim = new Float64Array(nfft);
  const bre = new Float64Array(nfft);
  const bim = new Float64Array(nfft);
  const seg = new Float64Array(span);
  const cum = new Float64Array(span + 1);
  let sum = 0;
  let count = 0;

  for (let f = 0; f < nFrames; f++) {
    const centre = t1 + f * dt;
    const start = Math.round(centre * fs - span / 2);
    let m = 0;
    for (let i = 0; i < span; i++) {
      const k = start + i;
      seg[i] = k >= 0 && k < x.length ? x[k] : 0;
      m += seg[i];
    }
    m /= span;
    let localPeak = 0;
    for (let i = 0; i < span; i++) {
      seg[i] -= m;
      if (Math.abs(seg[i]) > localPeak) localPeak = Math.abs(seg[i]);
    }
    const unvoicedStrength = Math.max(0, 2 - localPeak / globalPeak / silenceThreshold);
    if (unvoicedStrength >= 1) continue;

    are.fill(0);
    aim.fill(0);
    bre.fill(0);
    bim.fill(0);
    let ea = 0;
    for (let i = 0; i < W; i++) {
      are[i] = seg[i];
      ea += seg[i] * seg[i];
    }
    for (let i = 0; i < span; i++) bre[i] = seg[i];
    cum[0] = 0;
    for (let i = 0; i < span; i++) cum[i + 1] = cum[i] + seg[i] * seg[i];
    if (ea <= 0) continue;
    fft(are, aim);
    fft(bre, bim);
    // conj(A)·B
    for (let i = 0; i < nfft; i++) {
      const rr = are[i] * bre[i] + aim[i] * bim[i];
      const ii = are[i] * bim[i] - aim[i] * bre[i];
      are[i] = rr;
      aim[i] = ii;
    }
    fft(are, aim, true);
    const r = new Float64Array(L + 1);
    for (let tau = 0; tau <= L; tau++) {
      const eb = cum[Math.min(span, tau + W)] - cum[tau];
      r[tau] = eb > 0 ? are[tau] / nfft / Math.sqrt(ea * eb) : 0;
    }
    let best = -1;
    for (let tau = Math.max(minLag, 1); tau < L; tau++) {
      if (r[tau] > r[tau - 1] && r[tau] >= r[tau + 1] && r[tau] > 0) {
        const dr = 0.5 * (r[tau + 1] - r[tau - 1]);
        const d2r = 2 * r[tau] - r[tau - 1] - r[tau + 1];
        let val = r[tau];
        if (d2r > 0) val = r[tau] + (0.5 * dr * dr) / d2r;
        if (val > 1) val = 1 / val;
        if (val > best) best = val;
      }
    }
    if (best <= unvoicedStrength || best <= 0) continue;
    const rr = Math.min(best, 1 - 1e-15);
    const db = 10 * Math.log10(rr / (1 - rr));
    values[f] = db;
    sum += db;
    count++;
  }
  return { meanDb: count ? sum / count : NaN, frames: count, values };
}
