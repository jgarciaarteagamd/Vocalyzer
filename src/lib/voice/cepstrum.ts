// Smoothed cepstral peak prominence (CPPS), modelled on Praat:
//   Sound: To PowerCepstrogram: 60, 0.002, 5000, 50
//   PowerCepstrogram: Get CPPS: no, 0.01, 0.001, 60, 330, 0.05, Parabolic, 0.001, 0, Straight, Robust
// This parameter set is the one used in AVQI and in Murton et al. (2020).

import { fft, nextPow2 } from "./fft";
import { gaussianWindow, preEmphasis, resample, type Signal } from "./signal";

export interface CppsOptions {
  pitchFloor?: number;
  timeStep?: number;
  maxFrequency?: number;
  preEmphasisFrom?: number;
  timeAveragingWindow?: number;
  quefrencyAveragingWindow?: number;
  peakMinPitch?: number;
  peakMaxPitch?: number;
  tiltQmin?: number;
}

export interface CppsResult {
  cpps: number; // dB
  frames: number;
}

// Median via in-place quickselect on a scratch copy (much faster than sorting with a comparator).
function median(arr: Float64Array): number {
  const a = Float64Array.from(arr);
  const n = a.length;
  const select = (k: number) => {
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const pivot = a[(lo + hi) >> 1];
      let i = lo;
      let j = hi;
      while (i <= j) {
        while (a[i] < pivot) i++;
        while (a[j] > pivot) j--;
        if (i <= j) {
          const t = a[i];
          a[i] = a[j];
          a[j] = t;
          i++;
          j--;
        }
      }
      if (k <= j) hi = j;
      else if (k >= i) lo = i;
      else return a[k];
    }
    return a[k];
  };
  if (n % 2) return select(n >> 1);
  const hiV = select(n >> 1);
  let loV = -Infinity;
  for (let i = 0; i < n >> 1; i++) if (a[i] > loV) loV = a[i];
  return 0.5 * (loV + hiV);
}

/** Theil–Sen "incomplete" robust line fit (Praat's NUMfitLine_theil with incompleteMethod = true). */
export function theilFit(x: Float64Array, y: Float64Array): { slope: number; intercept: number } {
  const n = x.length;
  const half = n >> 1;
  const slopes = new Float64Array(half);
  for (let i = 0; i < half; i++) slopes[i] = (y[i + half] - y[i]) / (x[i + half] - x[i]);
  const slope = median(slopes);
  const res = new Float64Array(n);
  for (let i = 0; i < n; i++) res[i] = y[i] - slope * x[i];
  return { slope, intercept: median(res) };
}

export function cpps(x: Signal, fs: number, opts: CppsOptions = {}): CppsResult {
  const pitchFloor = opts.pitchFloor ?? 60;
  const dt = opts.timeStep ?? 0.002;
  const fmax = opts.maxFrequency ?? 5000;
  const preFrom = opts.preEmphasisFrom ?? 50;
  const tAvg = opts.timeAveragingWindow ?? 0.01;
  const qAvg = opts.quefrencyAveragingWindow ?? 0.001;
  const pMin = opts.peakMinPitch ?? 60;
  const pMax = opts.peakMaxPitch ?? 330;
  const tiltQmin = opts.tiltQmin ?? 0.001;

  const sr = 2 * fmax;
  let y = resample(x, fs, sr);
  y = preEmphasis(y, sr, preFrom);

  const windowDur = (2 * 3) / pitchFloor; // Gaussian window, twice the 3-period analysis width
  const n = Math.round(windowDur * sr);
  const nfft = nextPow2(n);
  const nq = nfft / 2 + 1;
  const dq = 1 / sr;
  const duration = y.length / sr;
  const nFrames = duration >= windowDur ? Math.floor((duration - windowDur) / dt) + 1 : 0;
  if (nFrames <= 0) return { cpps: NaN, frames: 0 };
  const t1 = 0.5 * (duration - (nFrames - 1) * dt);
  const win = gaussianWindow(n);

  // Power cepstrogram
  const cep: Float64Array[] = [];
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let f = 0; f < nFrames; f++) {
    const centre = t1 + f * dt;
    const start = Math.round((centre - windowDur / 2) * sr);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const k = start + i;
      m += k >= 0 && k < y.length ? y[k] : 0;
    }
    m /= n;
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < n; i++) {
      const k = start + i;
      re[i] = ((k >= 0 && k < y.length ? y[k] : 0) - m) * win[i];
    }
    fft(re, im);
    for (let i = 0; i < nfft; i++) {
      re[i] = Math.log(re[i] * re[i] + im[i] * im[i] + 1e-300);
      im[i] = 0;
    }
    fft(re, im, true);
    const pc = new Float64Array(nq);
    for (let q = 0; q < nq; q++) {
      const v = re[q] / nfft;
      pc[q] = v * v;
    }
    cep.push(pc);
  }

  // Smoothing: running mean over time frames, then over quefrency bins (on power values).
  const nt = Math.max(1, Math.round(tAvg / dt));
  const ntHalf = Math.floor(nt / 2);
  // Moving average over ~`nqa` quefrency bins. For an even width the two outermost bins of the
  // (nqa + 1)-bin window get a reduced weight; 0.75 was calibrated empirically so that CPPS matches
  // Praat 6.1.38 within ±0.15 dB on the validation fixtures (tests/praat-agreement.test.ts).
  const nqa = Math.max(1, Math.round(qAvg / dq));
  const nqHalf = Math.ceil(nqa / 2);
  const edgeWeight = nqa % 2 === 0 ? 0.75 : 1;
  const smoothT: Float64Array[] = [];
  for (let f = 0; f < nFrames; f++) {
    const out = new Float64Array(nq);
    let c = 0;
    for (let g = f - ntHalf; g <= f + ntHalf; g++) {
      if (g < 0 || g >= nFrames) continue;
      const src = cep[g];
      for (let q = 0; q < nq; q++) out[q] += src[q];
      c++;
    }
    for (let q = 0; q < nq; q++) out[q] /= c;
    smoothT.push(out);
  }

  const qStart = Math.max(1, Math.round(tiltQmin / dq));
  const fitN = nq - qStart;
  const fx = new Float64Array(fitN);
  for (let i = 0; i < fitN; i++) fx[i] = (qStart + i) * dq;
  const fy = new Float64Array(fitN);
  const peakLo = Math.max(1, Math.floor(1 / pMax / dq));
  const peakHi = Math.min(nq - 2, Math.ceil(1 / pMin / dq));
  const db = new Float64Array(nq);

  let sum = 0;
  for (let f = 0; f < nFrames; f++) {
    const src = smoothT[f];
    for (let q = 0; q < nq; q++) {
      let s = 0;
      let c = 0;
      for (let k = q - nqHalf; k <= q + nqHalf; k++) {
        if (k < 0 || k >= nq) continue;
        const w = k === q - nqHalf || k === q + nqHalf ? edgeWeight : 1;
        s += w * src[k];
        c += w;
      }
      db[q] = 10 * Math.log10(s / c + 1e-30);
    }
    for (let i = 0; i < fitN; i++) fy[i] = db[qStart + i];
    const { slope, intercept } = theilFit(fx, fy);
    let bi = peakLo;
    for (let q = peakLo; q <= peakHi; q++) if (db[q] > db[bi]) bi = q;
    let qPeak = bi;
    let vPeak = db[bi];
    if (bi > 0 && bi < nq - 1) {
      const y0 = db[bi - 1];
      const y1 = db[bi];
      const y2 = db[bi + 1];
      const d2 = 2 * y1 - y0 - y2;
      if (d2 > 0) {
        const off = (0.5 * (y2 - y0)) / d2;
        qPeak = bi + off;
        vPeak = y1 + 0.25 * (y2 - y0) * off;
      }
    }
    sum += vPeak - (intercept + slope * qPeak * dq);
  }
  return { cpps: sum / nFrames, frames: nFrames };
}
