// Glottal pulse detection and cycle-to-cycle perturbation measures (jitter / shimmer), following the
// algorithms of Praat's "To PointProcess (periodic, cc)" and its voice report.

import { pitchAt, voicedIntervals, type PitchTrack } from "./pitch";
import type { Signal } from "./signal";

function findExtremum(x: Signal, fs: number, tmin: number, tmax: number): number {
  const a = Math.max(1, Math.ceil(tmin * fs));
  const b = Math.min(x.length - 2, Math.floor(tmax * fs));
  if (b <= a) return (tmin + tmax) / 2;
  let bi = a;
  let bv = -1;
  for (let i = a; i <= b; i++) {
    const v = Math.abs(x[i]);
    if (v > bv) {
      bv = v;
      bi = i;
    }
  }
  // parabolic refinement on the signed signal
  const y0 = x[bi - 1];
  const y1 = x[bi];
  const y2 = x[bi + 1];
  const d2 = y0 - 2 * y1 + y2;
  const off = d2 !== 0 ? (0.5 * (y0 - y2)) / d2 : 0;
  return (bi + (Math.abs(off) < 1 ? off : 0)) / fs;
}

/** Port of Praat's Sound_findMaximumCorrelation. */
function findMaximumCorrelation(
  x: Signal,
  fs: number,
  t1: number,
  windowLength: number,
  tmin2: number,
  tmax2: number,
): { corr: number; t: number; peak: number } {
  const half = 0.5 * windowLength;
  const ileft1 = Math.round((t1 - half) * fs);
  const iright1 = Math.round((t1 + half) * fs);
  const ileft2min = Math.floor((tmin2 - half) * fs);
  const ileft2max = Math.ceil((tmax2 - half) * fs);
  let maxCorr = -1;
  let r1Best = 0;
  let r3Best = 0;
  let ir = 0;
  let peak = 0;
  let r1 = 0;
  let r2 = 0;
  let r3 = 0;
  for (let ileft2 = ileft2min; ileft2 <= ileft2max; ileft2++) {
    let norm1 = 0;
    let norm2 = 0;
    let product = 0;
    let localPeak = 0;
    for (let i1 = ileft1, i2 = ileft2; i1 <= iright1; i1++, i2++) {
      if (i1 < 0 || i1 >= x.length || i2 < 0 || i2 >= x.length) continue;
      const a1 = x[i1];
      const a2 = x[i2];
      norm1 += a1 * a1;
      norm2 += a2 * a2;
      product += a1 * a2;
      if (Math.abs(a2) > localPeak) localPeak = Math.abs(a2);
    }
    r1 = r2;
    r2 = r3;
    r3 = product !== 0 ? product / Math.sqrt(norm1 * norm2) : 0;
    if (r2 > maxCorr && r2 >= r1 && r2 >= r3) {
      r1Best = r1;
      maxCorr = r2;
      r3Best = r3;
      ir = ileft2 - 1;
      peak = localPeak;
    }
  }
  let t = t1;
  if (maxCorr > -1) {
    const d2r = 2 * maxCorr - r1Best - r3Best;
    let irf = ir;
    if (d2r !== 0) {
      const dr = 0.5 * (r3Best - r1Best);
      maxCorr += (0.5 * dr * dr) / d2r;
      irf += dr / d2r;
    }
    t = t1 + (irf - ileft1) / fs;
  }
  return { corr: maxCorr, t, peak };
}

/** Glottal pulse times (s), cf. Praat "Sound & Pitch: To PointProcess (cc)". */
export function detectPulses(x: Signal, fs: number, pitch: PitchTrack): number[] {
  let globalPeak = 0;
  for (let i = 0; i < x.length; i++) globalPeak = Math.max(globalPeak, Math.abs(x[i]));
  const points: number[] = [];
  let addedRight = -Infinity;
  for (const iv of voicedIntervals(pitch)) {
    const tleft = iv.start;
    const tright = iv.end;
    const tmiddle = (tleft + tright) / 2;
    let f0middle = pitchAt(pitch, tmiddle);
    if (!(f0middle > 0)) {
      // fall back to the closest voiced frame
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < pitch.times.length; i++) {
        if (pitch.f0[i] > 0 && Math.abs(pitch.times[i] - tmiddle) < bd) {
          bd = Math.abs(pitch.times[i] - tmiddle);
          best = pitch.f0[i];
        }
      }
      f0middle = best;
    }
    if (!(f0middle > 0)) continue;
    const tstart = findExtremum(x, fs, tmiddle - 0.5 / f0middle, tmiddle + 0.5 / f0middle);
    const left: number[] = [];
    let tmax = tstart;
    // leftwards
    for (let guard = 0; guard < 100000; guard++) {
      const f0 = pitchAt(pitch, tmax);
      if (!(f0 > 0)) break;
      const res = findMaximumCorrelation(x, fs, tmax, 1 / f0, tmax - 1.25 / f0, tmax - 0.8 / f0);
      if (res.corr === -1) tmax -= 1 / f0;
      else tmax = res.t;
      if (tmax < tleft) {
        if (res.corr > 0.7 && res.peak > 0.023333 * globalPeak && tmax - addedRight > 0.8 / f0) {
          left.push(tmax);
        }
        break;
      }
      if (res.corr > 0.3 && (res.peak === 0 || res.peak > 0.01 * globalPeak)) {
        if (tmax - addedRight > 0.8 / f0) left.push(tmax);
      }
    }
    left.reverse();
    points.push(...left, tstart);
    tmax = tstart;
    // rightwards
    for (let guard = 0; guard < 100000; guard++) {
      const f0 = pitchAt(pitch, tmax);
      if (!(f0 > 0)) break;
      const res = findMaximumCorrelation(x, fs, tmax, 1 / f0, tmax + 0.8 / f0, tmax + 1.25 / f0);
      if (res.corr === -1) tmax += 1 / f0;
      else tmax = res.t;
      if (tmax > tright) {
        if (res.corr > 0.7 && res.peak > 0.023333 * globalPeak) {
          points.push(tmax);
          addedRight = tmax;
        }
        break;
      }
      if (res.corr > 0.3 && (res.peak === 0 || res.peak > 0.01 * globalPeak)) {
        points.push(tmax);
        addedRight = tmax;
      }
    }
  }
  points.sort((a, b) => a - b);
  // remove accidental duplicates
  const out: number[] = [];
  for (const p of points) if (out.length === 0 || p - out[out.length - 1] > 1e-5) out.push(p);
  return out;
}

export interface PerturbationOptions {
  pmin?: number;
  pmax?: number;
  maxPeriodFactor?: number;
  maxAmplitudeFactor?: number;
}

export interface Perturbation {
  pulses: number;
  periods: number;
  meanPeriodMs: number;
  jitterLocal: number; // %
  jitterAbsUs: number; // microseconds
  jitterRap: number; // %
  jitterPpq5: number; // %
  shimmerLocal: number; // %
  shimmerDb: number; // dB
  shimmerApq3: number; // %
  shimmerApq5: number; // %
  shimmerApq11: number; // %
}

/** Hann-windowed RMS around a pulse (Praat's per-period amplitude for shimmer). */
function hannWindowedRms(x: Signal, fs: number, tmid: number, wl: number, wr: number): number {
  const a = Math.max(0, Math.ceil((tmid - wl) * fs));
  const b = Math.min(x.length - 1, Math.floor((tmid + wr) * fs));
  if (b - a + 1 < 3) return NaN;
  let ss = 0;
  let ws = 0;
  for (let i = a; i <= b; i++) {
    const t = i / fs;
    const width = t < tmid ? wl : wr;
    const w = 0.5 + 0.5 * Math.cos((Math.PI * (t - tmid)) / width);
    const v = x[i] * w;
    ss += v * v;
    ws += w * w;
  }
  return ws > 0 ? Math.sqrt(ss / ws) : NaN;
}

export function perturbation(
  x: Signal,
  fs: number,
  pulses: number[],
  opts: PerturbationOptions = {},
): Perturbation {
  const pmin = opts.pmin ?? 0.0001;
  const pmax = opts.pmax ?? 0.02;
  const mpf = opts.maxPeriodFactor ?? 1.3;
  const maf = opts.maxAmplitudeFactor ?? 1.6;
  const t = pulses;
  const nP = t.length;
  const per: number[] = [];
  for (let i = 1; i < nP; i++) per.push(t[i] - t[i - 1]);
  const okP = (p: number) => p >= pmin && p <= pmax;
  const ratio = (a: number, b: number) => (a > b ? a / b : b / a);

  // mean period: periods within range that have at least one compatible neighbour
  let sumP = 0;
  let cntP = 0;
  for (let i = 0; i < per.length; i++) {
    const p = per[i];
    if (!okP(p)) continue;
    const prevOk = i > 0 && okP(per[i - 1]) && ratio(p, per[i - 1]) <= mpf;
    const nextOk = i < per.length - 1 && okP(per[i + 1]) && ratio(p, per[i + 1]) <= mpf;
    if (prevOk || nextOk || per.length === 1) {
      sumP += p;
      cntP++;
    }
  }
  const meanP = cntP ? sumP / cntP : NaN;

  // jitter local / absolute
  let jSum = 0;
  let jCnt = 0;
  for (let i = 1; i < per.length; i++) {
    const p1 = per[i - 1];
    const p2 = per[i];
    if (okP(p1) && okP(p2) && ratio(p1, p2) <= mpf) {
      jSum += Math.abs(p1 - p2);
      jCnt++;
    }
  }
  const jitterAbs = jCnt ? jSum / jCnt : NaN;

  const ppq = (k: number) => {
    const half = (k - 1) / 2;
    let s = 0;
    let c = 0;
    for (let i = half; i < per.length - half; i++) {
      let ok = true;
      let avg = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (!okP(per[j])) ok = false;
        if (j > i - half && ratio(per[j], per[j - 1]) > mpf) ok = false;
        avg += per[j];
      }
      if (!ok) continue;
      avg /= k;
      s += Math.abs(per[i] - avg);
      c++;
    }
    return c ? s / c / meanP : NaN;
  };

  // amplitudes
  const amp: { t: number; a: number }[] = [];
  for (let i = 1; i < nP - 1; i++) {
    const p1 = t[i] - t[i - 1];
    const p2 = t[i + 1] - t[i];
    if (okP(p1) && okP(p2) && ratio(p1, p2) <= mpf) {
      const a = hannWindowedRms(x, fs, t[i], 0.2 * p1, 0.2 * p2);
      if (Number.isFinite(a) && a > 0) amp.push({ t: t[i], a });
    }
  }
  const meanA = amp.length ? amp.reduce((s, v) => s + v.a, 0) / amp.length : NaN;
  let sSum = 0;
  let sDb = 0;
  let sCnt = 0;
  for (let i = 1; i < amp.length; i++) {
    const p = amp[i].t - amp[i - 1].t;
    if (!okP(p)) continue;
    const a1 = amp[i - 1].a;
    const a2 = amp[i].a;
    if (ratio(a1, a2) <= maf) {
      sSum += Math.abs(a1 - a2);
      sDb += Math.abs(20 * Math.log10(a2 / a1));
      sCnt++;
    }
  }
  const apq = (k: number) => {
    const half = (k - 1) / 2;
    let s = 0;
    let c = 0;
    for (let i = half; i < amp.length - half; i++) {
      let ok = true;
      let avg = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j > i - half) {
          if (!okP(amp[j].t - amp[j - 1].t)) ok = false;
          if (ratio(amp[j].a, amp[j - 1].a) > maf) ok = false;
        }
        avg += amp[j].a;
      }
      if (!ok) continue;
      avg /= k;
      s += Math.abs(amp[i].a - avg);
      c++;
    }
    return c ? s / c / meanA : NaN;
  };

  return {
    pulses: nP,
    periods: cntP,
    meanPeriodMs: meanP * 1000,
    jitterLocal: (jitterAbs / meanP) * 100,
    jitterAbsUs: jitterAbs * 1e6,
    jitterRap: ppq(3) * 100,
    jitterPpq5: ppq(5) * 100,
    shimmerLocal: sCnt ? (sSum / sCnt / meanA) * 100 : NaN,
    shimmerDb: sCnt ? sDb / sCnt : NaN,
    shimmerApq3: apq(3) * 100,
    shimmerApq5: apq(5) * 100,
    shimmerApq11: apq(11) * 100,
  };
}
