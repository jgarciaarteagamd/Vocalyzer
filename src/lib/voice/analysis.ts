// Full-session analysis: combines the protocol recordings into the acoustic parameter set.
// Runs entirely on the user's device (normally inside a Web Worker). No audio leaves the browser.

import { cpps } from "./cepstrum";
import { harmonicity } from "./harmonicity";
import { ltasMeasures } from "./ltas";
import { detectPulses, perturbation } from "./perturbation";
import { trackPitch, trackPitchAdaptive, voicedIntervals, type PitchTrack } from "./pitch";
import { nextPow2, powerSpectrum } from "./fft";
import {
  activeSegments,
  clippingRatio,
  concat,
  frameEnergy,
  hanning,
  highpass,
  median,
  percentile,
  resample,
  slice,
  stdev,
  type Segment,
} from "./signal";
import type {
  AvqiMetrics,
  QualityWarning,
  Recording,
  RecordingSet,
  SpeechMetrics,
  VoiceMetrics,
  VowelMetrics,
} from "./types";

const PITCH_FS = 16000;

const round = (v: number | null | undefined, d = 2): number | null =>
  v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d;

function longest(segs: Segment[]): Segment | null {
  let best: Segment | null = null;
  for (const s of segs) if (!best || s.end - s.start > best.end - best.start) best = s;
  return best;
}

function prepare(rec: Recording) {
  const x = highpass(rec.samples, rec.sampleRate, 34);
  return { x, fs: rec.sampleRate };
}

/** Noise floor (dBFS) from the silence recording (median of 30-ms frame levels). */
function noiseFloor(rec: Recording | undefined, band?: number): number | null {
  if (!rec || rec.samples.length < rec.sampleRate * 0.5) return null;
  let x = highpass(rec.samples, rec.sampleRate, band ?? 34);
  // discard the first 300 ms (button click / start transients)
  x = x.subarray(Math.floor(0.3 * rec.sampleRate));
  const e = frameEnergy(x, rec.sampleRate);
  return median(Array.from(e.db));
}

function activityThreshold(dbs: Float64Array, noise: number | null): number {
  const arr = Array.from(dbs);
  const floor = noise ?? percentile(arr, 10);
  const top = percentile(arr, 95);
  const span = top - floor;
  return floor + Math.max(6, Math.min(15, 0.3 * span));
}

/** Duration (s) of the longest sustained sound in a recording (MPT, /s/, /z/). */
export function sustainedDuration(rec: Recording | undefined, noise: number | null, band = 34): number | null {
  if (!rec || rec.samples.length < rec.sampleRate * 0.3) return null;
  const x = highpass(rec.samples, rec.sampleRate, band);
  const e = frameEnergy(x, rec.sampleRate, 0.03, 0.01);
  if (e.db.length === 0) return null;
  const thr = activityThreshold(e.db, noise);
  const seg = longest(activeSegments(e, thr, 0.3, 0.3));
  return seg ? seg.end - seg.start : 0;
}

function pitchStats(track: PitchTrack) {
  const v = Array.from(track.f0).filter((f) => f > 0);
  if (v.length === 0) return null;
  const meanF = v.reduce((a, b) => a + b, 0) / v.length;
  const st = v.map((f) => 12 * Math.log2(f / 100));
  return {
    mean: meanF,
    median: median(v),
    sd: stdev(v),
    sdSt: stdev(st),
    p5: percentile(v, 5),
    p95: percentile(v, 95),
    count: v.length,
  };
}

function h1h2(x: Float64Array, fs: number, f0: number): number {
  const n = Math.min(nextPow2(Math.round(0.08 * fs)), nextPow2(x.length) / 2);
  const w = hanning(n);
  const hop = n >> 1;
  const nb = n / 2 + 1;
  const acc = new Float64Array(nb);
  let frames = 0;
  const frame = new Float64Array(n);
  for (let s = 0; s + n <= x.length; s += hop) {
    for (let i = 0; i < n; i++) frame[i] = x[s + i] * w[i];
    const p = powerSpectrum(frame, n);
    for (let k = 0; k < nb; k++) acc[k] += p[k];
    frames++;
  }
  if (!frames) return NaN;
  const df = fs / n;
  const peak = (f: number) => {
    const a = Math.max(1, Math.floor((f * 0.85) / df));
    const b = Math.min(nb - 1, Math.ceil((f * 1.15) / df));
    let m = 0;
    for (let k = a; k <= b; k++) m = Math.max(m, acc[k]);
    return 10 * Math.log10(m / frames + 1e-30);
  };
  return peak(f0) - peak(2 * f0);
}

function analyzeVowel(rec: Recording, noise: number | null, warnings: Set<QualityWarning>) {
  const { x, fs } = prepare(rec);
  const e = frameEnergy(x, fs);
  if (e.db.length === 0) return null;
  const thr = activityThreshold(e.db, noise);
  const seg = longest(activeSegments(e, thr, 0.2, 0.5));
  if (!seg || seg.end - seg.start < 1.0) {
    warnings.add("vowel_too_short");
    return null;
  }
  const segDur = seg.end - seg.start;
  // AVQI-style mid-vowel selection: central 3 s (or the segment minus 0.25 s at each edge).
  let t0: number, t1: number;
  if (segDur >= 3.5) {
    const mid = (seg.start + seg.end) / 2;
    t0 = mid - 1.5;
    t1 = mid + 1.5;
  } else {
    t0 = seg.start + Math.min(0.25, segDur * 0.1);
    t1 = seg.end - Math.min(0.25, segDur * 0.1);
  }
  const ex = slice(x, fs, t0, t1);
  const exPitchSig = resample(ex, fs, PITCH_FS);
  const roughTrack = trackPitch(exPitchSig, PITCH_FS, { floor: 60, ceiling: 700, timeStep: 0.01 });
  const rough = pitchStats(roughTrack);
  if (!rough || rough.count < 20) {
    warnings.add("vowel_unvoiced");
    return null;
  }
  // Praat-like voice report settings, with the floor/ceiling adapted to the speaker.
  const floor = Math.max(60, Math.min(150, rough.median * 0.6));
  const ceiling = Math.min(900, Math.max(300, rough.median * 1.8));
  const track = trackPitch(ex, fs, { floor, ceiling, timeStep: 0.01 });
  const st = pitchStats(track);
  if (!st) {
    warnings.add("vowel_unvoiced");
    return null;
  }
  const pulses = detectPulses(ex, fs, track);
  const pert = perturbation(ex, fs, pulses);
  const hnr = harmonicity(ex, fs, { minPitch: Math.min(75, floor) });
  const cp = cpps(ex, fs);
  const ee = frameEnergy(ex, fs);
  const unvoiced = track.f0.length ? track.f0.filter((f) => f === 0).length / track.f0.length : 0;
  let sigPow = 0;
  for (let i = 0; i < ex.length; i++) sigPow += ex[i] * ex[i];
  const levelDb = 10 * Math.log10(sigPow / Math.max(1, ex.length) + 1e-12);

  const metrics: VowelMetrics = {
    analyzedSeconds: round(t1 - t0, 2)!,
    f0Mean: round(st.mean, 1)!,
    f0Sd: round(st.sd, 2)!,
    f0SdSt: round(st.sdSt, 2)!,
    jitterLocal: round(pert.jitterLocal, 3)!,
    jitterAbsUs: round(pert.jitterAbsUs, 1)!,
    jitterRap: round(pert.jitterRap, 3)!,
    jitterPpq5: round(pert.jitterPpq5, 3)!,
    shimmerLocal: round(pert.shimmerLocal, 2)!,
    shimmerDb: round(pert.shimmerDb, 3)!,
    shimmerApq3: round(pert.shimmerApq3, 2)!,
    shimmerApq5: round(pert.shimmerApq5, 2)!,
    shimmerApq11: round(pert.shimmerApq11, 2)!,
    hnr: round(hnr.meanDb, 2)!,
    cpps: round(cp.cpps, 2)!,
    h1h2: round(h1h2(ex, fs, st.median), 1)!,
    intensitySd: round(stdev(Array.from(ee.db)), 2)!,
    voiceBreaksPct: round(unvoiced * 100, 1)!,
    pulses: pulses.length,
  };
  return { metrics, excerpt: ex, fs, levelDb, segment: seg };
}

function trimToActivity(x: Float64Array, fs: number, noise: number | null) {
  const e = frameEnergy(x, fs);
  if (e.db.length === 0) return null;
  const thr = activityThreshold(e.db, noise);
  const segs = activeSegments(e, thr, 0.5, 0.1);
  if (segs.length === 0) return null;
  const t0 = Math.max(0, segs[0].start - 0.1);
  const t1 = Math.min(x.length / fs, segs[segs.length - 1].end + 0.1);
  // Compacted copy for CPPS: natural short pauses are kept, but pauses longer than 0.4 s
  // (hesitations, lost place in the text…) are shortened to 0.3 s so they do not dilute CPPS.
  const phrases = activeSegments(e, thr, 0.4, 0.05);
  const dur = x.length / fs;
  const compact = concat(phrases.map((p) => slice(x, fs, Math.max(0, p.start - 0.15), Math.min(dur, p.end + 0.15))));
  return { x: slice(x, fs, t0, t1), compact, segs, thr, energy: e };
}

function analyzeSpeech(
  sentences: Recording | undefined,
  reading: Recording | undefined,
  noise: number | null,
  warnings: Set<QualityWarning>,
) {
  const parts: { name: "sentences" | "reading"; x: Float64Array; compact: Float64Array; fs: number }[] = [];
  for (const [name, rec] of [
    ["sentences", sentences],
    ["reading", reading],
  ] as const) {
    if (!rec) continue;
    const { x, fs } = prepare(rec);
    const t = trimToActivity(x, fs, noise);
    if (t && t.x.length > fs * 1.0) parts.push({ name, x: t.x, compact: t.compact, fs });
  }
  if (parts.length === 0) {
    warnings.add("speech_too_short");
    return null;
  }
  const fs = parts[0].fs;
  // Pitch on the downsampled concatenation (speaker-adapted range).
  const tracks = parts.map((p) => {
    const y = resample(p.x, p.fs, PITCH_FS);
    return { ...p, y, track: trackPitchAdaptive(y, PITCH_FS) };
  });
  const allF0: number[] = [];
  let voicedFrames = 0;
  let activeFrames = 0;
  const intensities: number[] = [];
  for (const t of tracks) {
    const e = frameEnergy(t.y, PITCH_FS, 0.03, 0.01);
    const thr = activityThreshold(e.db, noise);
    for (let i = 0; i < t.track.f0.length; i++) {
      const fi = Math.min(e.db.length - 1, Math.max(0, Math.round((t.track.times[i] - 0.015) / 0.01)));
      const active = e.db[fi] > thr;
      if (active) {
        activeFrames++;
        intensities.push(e.db[fi]);
      }
      if (t.track.f0[i] > 0) {
        allF0.push(t.track.f0[i]);
        if (active) voicedFrames++;
      }
    }
  }
  if (allF0.length < 30) {
    warnings.add("speech_too_short");
    return null;
  }
  const meanF = allF0.reduce((a, b) => a + b, 0) / allF0.length;
  const p5 = percentile(allF0, 5);
  const p95 = percentile(allF0, 95);
  const st = allF0.map((f) => 12 * Math.log2(f / 100));
  const readingPart = parts.find((p) => p.name === "reading");
  const sent = parts.find((p) => p.name === "sentences");
  const metrics: SpeechMetrics = {
    f0Mean: round(meanF, 1)!,
    f0Median: round(median(allF0), 1)!,
    f0Sd: round(stdev(allF0), 1)!,
    f0SdSt: round(stdev(st), 2)!,
    f0P5: round(p5, 1)!,
    f0P95: round(p95, 1)!,
    f0RangeSt: round(12 * Math.log2(p95 / p5), 1)!,
    voicedPct: round(activeFrames ? (100 * voicedFrames) / activeFrames : NaN, 1)!,
    intensitySd: round(stdev(intensities), 2)!,
    cppsReading: readingPart ? round(cpps(readingPart.compact, readingPart.fs).cpps, 2) : null,
    cppsSentences: sent ? round(cpps(sent.compact, sent.fs).cpps, 2) : null,
    readingSeconds: readingPart ? round(readingPart.x.length / readingPart.fs, 1) : null,
  };
  return { metrics, tracks, fs };
}

/** Voiced stretches (native-rate samples) of a speech part, using the pitch track and intensity. */
function voicedSpeech(p: { x: Float64Array; fs: number; track: PitchTrack }, maxSeconds: number) {
  const out: Float64Array[] = [];
  let total = 0;
  const e = frameEnergy(p.x, p.fs, 0.03, 0.01);
  const peak = Math.max(...Array.from(e.db));
  for (const iv of voicedIntervals(p.track)) {
    if (iv.end - iv.start < 0.06) continue;
    // drop intervals that are more than 25 dB below the loudest frame (AVQI silence criterion)
    const i0 = Math.max(0, Math.floor(iv.start / 0.01));
    const i1 = Math.min(e.db.length - 1, Math.ceil(iv.end / 0.01));
    let lvl = -Infinity;
    for (let i = i0; i <= i1; i++) lvl = Math.max(lvl, e.db[i]);
    if (lvl < peak - 25) continue;
    let seg = slice(p.x, p.fs, iv.start, iv.end);
    if (total + seg.length / p.fs > maxSeconds) {
      seg = seg.subarray(0, Math.max(0, Math.round((maxSeconds - total) * p.fs)));
    }
    out.push(seg);
    total += seg.length / p.fs;
    if (total >= maxSeconds - 1e-3) break;
  }
  return { parts: out, seconds: total };
}

/** AVQI v03.01: 3 s of voiced continuous speech + 3 s mid-vowel, concatenated. */
function computeAvqi(
  vowel: { excerpt: Float64Array; fs: number } | null,
  speech: { tracks: { name: string; x: Float64Array; fs: number; track: PitchTrack }[] } | null,
): AvqiMetrics | null {
  if (!vowel || !speech) return null;
  const src = speech.tracks.find((t) => t.name === "reading") ?? speech.tracks[0];
  if (!src) return null;
  // Pitch track was computed on the 16-kHz copy; its times are valid for the native signal too.
  const vs = voicedSpeech({ x: src.x, fs: src.fs, track: src.track }, 3);
  if (vs.seconds < 1.5) return null;
  const fs = vowel.fs;
  const speechParts = src.fs === fs ? vs.parts : vs.parts.map((p) => resample(p, src.fs, fs));
  const sig = concat([...speechParts, vowel.excerpt]);
  const c = cpps(sig, fs).cpps;
  const h = harmonicity(sig, fs).meanDb;
  const track = trackPitch(sig, fs, { floor: 75, ceiling: 600, timeStep: 0.01 });
  const pert = perturbation(sig, fs, detectPulses(sig, fs, track));
  const l = ltasMeasures(sig, fs);
  const value =
    (4.152 -
      0.177 * c -
      0.006 * h -
      0.037 * pert.shimmerLocal +
      0.941 * pert.shimmerDb +
      0.01 * l.slope +
      0.093 * l.tilt) *
    2.8902;
  if (![c, h, pert.shimmerLocal, pert.shimmerDb, l.slope, l.tilt].every(Number.isFinite)) return null;
  return {
    value: round(Math.max(0, Math.min(10, value)), 2)!, // AVQI is defined on a 0–10 scale
    cpps: round(c, 2)!,
    hnr: round(h, 2)!,
    shimmerLocal: round(pert.shimmerLocal, 2)!,
    shimmerDb: round(pert.shimmerDb, 3)!,
    slope: round(l.slope, 2)!,
    tilt: round(l.tilt, 2)!,
    voicedSpeechSeconds: round(vs.seconds, 2)!,
    vowelSeconds: round(vowel.excerpt.length / fs, 2)!,
  };
}

export type ProgressFn = (step: string, fraction: number) => void;

export function analyzeRecordings(recs: RecordingSet, onProgress?: ProgressFn): VoiceMetrics {
  const warnings = new Set<QualityWarning>();
  const progress = onProgress ?? (() => {});
  const anyRec = Object.values(recs).find(Boolean);
  const sampleRate = anyRec?.sampleRate ?? 0;
  if (sampleRate && sampleRate < 20000) warnings.add("low_sample_rate");

  progress("noise", 0.05);
  const noise = noiseFloor(recs.silence);
  const noiseS = noiseFloor(recs.silence, 2000);
  if (noise !== null && noise > -50) warnings.add("noisy_environment");

  progress("vowel", 0.15);
  const vowel = recs.vowel ? analyzeVowel(recs.vowel, noise, warnings) : null;

  progress("durations", 0.4);
  const mptSeconds = sustainedDuration(recs.mpt, noise);
  const sSeconds = sustainedDuration(recs.s, noiseS, 2000);
  const zSeconds = sustainedDuration(recs.z, noise);
  const szRatio = sSeconds && zSeconds && zSeconds > 0.5 ? sSeconds / zSeconds : null;

  progress("speech", 0.55);
  const speech = analyzeSpeech(recs.sentences, recs.reading, noise, warnings);

  progress("avqi", 0.8);
  let avqi: AvqiMetrics | null = null;
  try {
    avqi = computeAvqi(vowel, speech);
  } catch {
    avqi = null;
  }

  // Quality
  let clip = 0;
  for (const r of Object.values(recs)) if (r) clip = Math.max(clip, clippingRatio(r.samples));
  if (clip > 0.001) warnings.add("clipping");
  const snrVowel = vowel && noise !== null ? vowel.levelDb - noise : null;
  let snrSpeech: number | null = null;
  if (speech && noise !== null) {
    const lv: number[] = [];
    for (const t of speech.tracks) {
      const e = frameEnergy(t.x, t.fs);
      lv.push(percentile(Array.from(e.db), 90));
    }
    snrSpeech = Math.max(...lv) - noise;
  }
  if ((snrVowel !== null && snrVowel < 25) || (snrSpeech !== null && snrSpeech < 25)) warnings.add("low_snr");
  const expected: (keyof RecordingSet)[] = ["silence", "vowel", "mpt", "s", "z", "sentences", "reading"];
  if (expected.some((k) => !recs[k])) warnings.add("missing_tasks");
  progress("done", 1);

  return {
    version: 1,
    vowel: vowel?.metrics ?? null,
    mptSeconds: round(mptSeconds, 1),
    sSeconds: round(sSeconds, 1),
    zSeconds: round(zSeconds, 1),
    szRatio: round(szRatio, 2),
    speech: speech?.metrics ?? null,
    avqi,
    quality: {
      sampleRate,
      noiseFloorDb: round(noise, 1),
      snrVowelDb: round(snrVowel, 1),
      snrSpeechDb: round(snrSpeech, 1),
      clippingPct: round(clip * 100, 3)!,
      warnings: Array.from(warnings),
    },
  };
}
