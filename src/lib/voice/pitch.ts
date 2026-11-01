// Fundamental-frequency tracking modelled on Boersma (1993) / Praat "To Pitch (ac)":
// windowed, window-normalised autocorrelation, candidate selection and Viterbi path finding.

import { autocorrelation, nextPow2 } from "./fft";
import { hanning, type Signal } from "./signal";

export interface PitchOptions {
  timeStep?: number; // s (default 0.75 / floor, as Praat)
  floor?: number; // Hz
  ceiling?: number; // Hz
  maxCandidates?: number;
  silenceThreshold?: number;
  voicingThreshold?: number;
  octaveCost?: number;
  octaveJumpCost?: number;
  voicedUnvoicedCost?: number;
  periodsPerWindow?: number;
}

export interface PitchTrack {
  times: Float64Array; // frame centres (s)
  f0: Float64Array; // Hz, 0 = unvoiced
  strength: Float64Array; // normalised autocorrelation of the selected candidate
  timeStep: number;
}

interface Candidate {
  f: number; // Hz, 0 = unvoiced
  s: number; // strength
  r: number; // raw correlation
}

export function trackPitch(x: Signal, fs: number, opts: PitchOptions = {}): PitchTrack {
  const floor = opts.floor ?? 75;
  const ceiling = opts.ceiling ?? 600;
  const dt = opts.timeStep ?? 0.75 / floor;
  const maxCandidates = opts.maxCandidates ?? 15;
  const silenceThreshold = opts.silenceThreshold ?? 0.03;
  const voicingThreshold = opts.voicingThreshold ?? 0.45;
  const octaveCost = opts.octaveCost ?? 0.01;
  const periodsPerWindow = opts.periodsPerWindow ?? 3;
  const tsc = 0.01 / dt; // Praat's time-step correction
  const octaveJumpCost = (opts.octaveJumpCost ?? 0.35) * tsc;
  const vuvCost = (opts.voicedUnvoicedCost ?? 0.14) * tsc;

  const windowDur = periodsPerWindow / floor;
  const nWin = Math.max(8, Math.round(windowDur * fs));
  const maxLag = Math.min(nWin - 2, Math.floor(fs / floor) + 2);
  const minLag = Math.max(2, Math.floor(fs / ceiling));
  const nfft = nextPow2(Math.ceil(nWin * 1.5) + maxLag);

  const duration = x.length / fs;
  const nFrames = duration >= windowDur ? Math.floor((duration - windowDur) / dt) + 1 : 0;
  const t1 = 0.5 * (duration - (nFrames - 1) * dt);

  const window = hanning(nWin);
  const rw = autocorrelation(window, maxLag, nfft);
  const rw0 = rw[0];
  for (let i = 0; i <= maxLag; i++) rw[i] /= rw0;

  let globalMean = 0;
  for (let i = 0; i < x.length; i++) globalMean += x[i];
  globalMean /= Math.max(1, x.length);
  let globalPeak = 0;
  for (let i = 0; i < x.length; i++) globalPeak = Math.max(globalPeak, Math.abs(x[i] - globalMean));
  if (globalPeak === 0) globalPeak = 1;

  const frames: Candidate[][] = [];
  const frame = new Float64Array(nWin);

  for (let f = 0; f < nFrames; f++) {
    const centre = t1 + f * dt;
    const start = Math.round(centre * fs - nWin / 2);
    let m = 0;
    let cnt = 0;
    for (let i = 0; i < nWin; i++) {
      const k = start + i;
      if (k >= 0 && k < x.length) {
        m += x[k];
        cnt++;
      }
    }
    m = cnt ? m / cnt : 0;
    let localPeak = 0;
    for (let i = 0; i < nWin; i++) {
      const k = start + i;
      const v = k >= 0 && k < x.length ? x[k] - m : 0;
      if (Math.abs(v) > localPeak) localPeak = Math.abs(v);
      frame[i] = v * window[i];
    }

    const cands: Candidate[] = [];
    const unvoicedStrength =
      voicingThreshold +
      Math.max(0, 2 - localPeak / globalPeak / (silenceThreshold / (1 + voicingThreshold)));
    cands.push({ f: 0, s: unvoicedStrength, r: 0 });

    if (localPeak > 0) {
      const ra = autocorrelation(frame, maxLag + 1, nfft);
      const r0 = ra[0];
      if (r0 > 0) {
        const r = new Float64Array(maxLag + 2);
        for (let i = 0; i <= maxLag + 1 && i < ra.length; i++) {
          const w = i <= maxLag ? rw[i] : rw[maxLag];
          r[i] = w > 1e-6 ? ra[i] / r0 / w : 0;
        }
        const voiced: Candidate[] = [];
        for (let i = Math.max(minLag, 1); i <= maxLag && i + 1 < r.length; i++) {
          if (r[i] > 0.5 * voicingThreshold && r[i] > r[i - 1] && r[i] >= r[i + 1]) {
            const dr = 0.5 * (r[i + 1] - r[i - 1]);
            const d2r = 2 * r[i] - r[i - 1] - r[i + 1];
            let lag = i;
            let val = r[i];
            if (d2r > 0) {
              lag = i + dr / d2r;
              val = r[i] + (0.5 * dr * dr) / d2r;
            }
            if (val > 1) val = 1 / val;
            const freq = fs / lag;
            if (freq < floor || freq > ceiling) continue;
            const strength = val - octaveCost * Math.log2(floor / freq);
            voiced.push({ f: freq, s: strength, r: val });
          }
        }
        voiced.sort((a, b) => b.s - a.s);
        for (let i = 0; i < Math.min(voiced.length, maxCandidates - 1); i++) cands.push(voiced[i]);
      }
    }
    frames.push(cands);
  }

  // Viterbi path finding (maximise strengths minus transition costs).
  const n = frames.length;
  const times = new Float64Array(n);
  const f0 = new Float64Array(n);
  const strength = new Float64Array(n);
  if (n === 0) return { times, f0, strength, timeStep: dt };

  let delta = frames[0].map((c) => c.s);
  const psi: Int32Array[] = [new Int32Array(frames[0].length)];
  for (let f = 1; f < n; f++) {
    const prev = frames[f - 1];
    const cur = frames[f];
    const nd = new Array<number>(cur.length);
    const np = new Int32Array(cur.length);
    for (let j = 0; j < cur.length; j++) {
      let best = -Infinity;
      let bi = 0;
      for (let k = 0; k < prev.length; k++) {
        let cost: number;
        const a = prev[k].f;
        const b = cur[j].f;
        if (a === 0 && b === 0) cost = 0;
        else if (a === 0 || b === 0) cost = vuvCost;
        else cost = octaveJumpCost * Math.abs(Math.log2(a / b));
        const v = delta[k] - cost;
        if (v > best) {
          best = v;
          bi = k;
        }
      }
      nd[j] = best + cur[j].s;
      np[j] = bi;
    }
    delta = nd;
    psi.push(np);
  }
  let idx = 0;
  for (let j = 1; j < delta.length; j++) if (delta[j] > delta[idx]) idx = j;
  for (let f = n - 1; f >= 0; f--) {
    const c = frames[f][idx];
    times[f] = t1 + f * dt;
    f0[f] = c.f;
    strength[f] = c.r;
    idx = psi[f][idx];
  }
  return { times, f0, strength, timeStep: dt };
}

/** Linear interpolation of the pitch track at time t (Hz). Returns 0 when t falls in an unvoiced frame. */
export function pitchAt(track: PitchTrack, t: number): number {
  const n = track.times.length;
  if (n === 0) return 0;
  const pos = (t - track.times[0]) / track.timeStep;
  const i0 = Math.floor(pos);
  const nearest = Math.round(pos);
  if (nearest < 0 || nearest >= n) return 0;
  if (track.f0[nearest] === 0) return 0;
  const i1 = i0 + 1;
  if (i0 < 0 || i1 >= n || track.f0[i0] === 0 || track.f0[i1] === 0) return track.f0[nearest];
  const frac = pos - i0;
  return track.f0[i0] + (track.f0[i1] - track.f0[i0]) * frac;
}

export interface VoicedInterval {
  start: number;
  end: number;
}

export function voicedIntervals(track: PitchTrack): VoicedInterval[] {
  const out: VoicedInterval[] = [];
  const half = track.timeStep / 2;
  let cur: VoicedInterval | null = null;
  for (let i = 0; i < track.f0.length; i++) {
    if (track.f0[i] > 0) {
      if (cur) cur.end = track.times[i] + half;
      else cur = { start: track.times[i] - half, end: track.times[i] + half };
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Two-pass pitch tracking with speaker-adapted floor/ceiling (De Looze & Hirst heuristic). */
export function trackPitchAdaptive(x: Signal, fs: number, base: PitchOptions = {}): PitchTrack {
  const first = trackPitch(x, fs, { ...base, floor: 60, ceiling: 700, timeStep: 0.01 });
  const voiced = Array.from(first.f0).filter((v) => v > 0).sort((a, b) => a - b);
  if (voiced.length < 10) return first;
  const q = (p: number) => voiced[Math.min(voiced.length - 1, Math.floor(p * (voiced.length - 1)))];
  const floor = Math.max(50, Math.floor(q(0.25) * 0.75));
  const ceiling = Math.min(900, Math.ceil(q(0.75) * 1.5));
  if (ceiling <= floor * 1.5) return first;
  return trackPitch(x, fs, { ...base, floor, ceiling, timeStep: 0.01 });
}
