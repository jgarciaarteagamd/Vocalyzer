// Acoustic estimation of GRBAS and CAPE-V dimensions.
//
// IMPORTANT: GRBAS and CAPE-V are auditory-perceptual scales. The values produced here are an
// orientative *acoustic approximation* built from validated acoustic correlates (AVQI and CPPS for
// overall severity; perturbation and noise measures for roughness/breathiness). They never replace
// the clinician's perceptual rating, which can be recorded alongside in the results inbox.

import { NORMS, f0Range } from "./norms";
import type { CapeVScores, Grade, SessionInfo, VoiceEstimates, VoiceMetrics } from "./types";

/** 0 inside the normal range, 1 at (or beyond) the "severe" anchor, linear in between. */
function dev(value: number | null | undefined, normal: number, severe: number): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const t = (value - normal) / (severe - normal);
  return Math.max(0, Math.min(1, t));
}

/** Piecewise-linear interpolation through [x, y] anchors (x ascending). */
function interp(x: number, anchors: [number, number][]): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1];
    const [x1, y1] = anchors[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return anchors[anchors.length - 1][1];
}

type Indicator = { value: number | null; weight: number; label: string };

function combine(indicators: Indicator[]): { score: number | null; drivers: string[] } {
  const avail = indicators.filter((i) => i.value !== null) as { value: number; weight: number; label: string }[];
  if (avail.length === 0) return { score: null, drivers: [] };
  const w = avail.reduce((a, b) => a + b.weight, 0);
  const score = avail.reduce((a, b) => a + b.value * b.weight, 0) / w;
  const drivers = avail
    .filter((i) => i.value >= 0.25)
    .sort((a, b) => b.value * b.weight - a.value * a.weight)
    .map((i) => i.label);
  return { score, drivers };
}

const toGrade = (x: number): Grade => Math.max(0, Math.min(3, Math.round(x))) as Grade;

/** Continuous 0–3 grade → CAPE-V-like 0–100 visual analogue value. */
export function gradeToCapeV(g: number): number {
  return Math.round(
    interp(g, [
      [0, 0],
      [0.5, 10],
      [1.5, 35],
      [2.5, 65],
      [3, 90],
    ]),
  );
}

export function estimateScales(m: VoiceMetrics, info: SessionInfo): VoiceEstimates {
  const v = m.vowel;
  const s = m.speech;

  // --- G: overall severity (continuous 0–3) ---------------------------------------------
  const avqiThr = NORMS.avqi.limit;
  const gAvqi =
    m.avqi !== null
      ? interp(m.avqi.value, [
          [avqiThr - 1.0, 0],
          [avqiThr, 0.5],
          [avqiThr + 1.3, 1.5],
          [avqiThr + 2.7, 2.5],
          [avqiThr + 4.0, 3],
        ])
      : null;
  const cv = NORMS.cppsVowel.limit;
  const gCppsV =
    v && Number.isFinite(v.cpps)
      ? interp(-v.cpps, [
          [-(cv + 3), 0],
          [-cv, 0.5],
          [-(cv - 3.5), 1.5],
          [-(cv - 6.5), 2.5],
          [-(cv - 8.5), 3],
        ])
      : null;
  const cr = NORMS.cppsReading.limit;
  const gCppsS =
    s && s.cppsReading !== null
      ? interp(-s.cppsReading, [
          [-(cr + 2), 0],
          [-cr, 0.5],
          [-(cr - 1.8), 1.5],
          [-(cr - 3.8), 2.5],
          [-(cr - 4.8), 3],
        ])
      : null;
  const gParts: Indicator[] = [
    { value: gAvqi !== null ? gAvqi / 3 : null, weight: 0.5, label: "AVQI" },
    { value: gCppsS !== null ? gCppsS / 3 : null, weight: 0.25, label: "CPPS (lectura)" },
    { value: gCppsV !== null ? gCppsV / 3 : null, weight: 0.25, label: "CPPS (/a/)" },
  ];
  const gComb = combine(gParts);
  const G = gComb.score !== null ? gComb.score * 3 : 0;

  // --- R: roughness ----------------------------------------------------------------------
  const rComb = combine([
    { value: dev(v?.jitterLocal, NORMS.jitterLocal.limit, 3.5), weight: 0.35, label: "Jitter" },
    { value: dev(v?.shimmerLocal, NORMS.shimmerLocal.limit, 12), weight: 0.35, label: "Shimmer" },
    { value: dev(v ? -v.hnr : null, -NORMS.hnr.limit, -7), weight: 0.2, label: "HNR" },
    { value: dev(v?.voiceBreaksPct, 2, 25), weight: 0.1, label: "Interrupciones de sonoridad" },
  ]);
  const R = Math.min((rComb.score ?? 0) * 3, G + 0.75);

  // --- B: breathiness --------------------------------------------------------------------
  const bComb = combine([
    { value: dev(v ? -v.cpps : null, -NORMS.cppsVowel.limit, -7), weight: 0.35, label: "CPPS (/a/)" },
    { value: dev(v ? -v.hnr : null, -NORMS.hnr.limit, -7), weight: 0.25, label: "HNR" },
    { value: dev(v?.h1h2, 8, 18), weight: 0.1, label: "H1–H2" },
    { value: dev(m.szRatio, NORMS.szRatio.limit, 2.5), weight: 0.15, label: "Cociente s/z" },
    { value: dev(m.mptSeconds !== null ? -m.mptSeconds : null, -15, -5), weight: 0.15, label: "TMF" },
  ]);
  const B = Math.min((bComb.score ?? 0) * 3, G + 0.75);

  // --- A: asthenia (low reliability) ------------------------------------------------------
  const aComb = combine([
    { value: dev(m.mptSeconds !== null ? -m.mptSeconds : null, -15, -5), weight: 0.4, label: "TMF" },
    { value: dev(v?.intensitySd, 1.5, 5), weight: 0.2, label: "Inestabilidad de intensidad" },
    { value: dev(m.avqi ? -m.avqi.slope : null, 28, 38), weight: 0.2, label: "Pendiente espectral" },
    { value: dev(s?.cppsReading != null ? -s.cppsReading : null, -NORMS.cppsReading.limit, -5), weight: 0.2, label: "CPPS (lectura)" },
  ]);
  const A = Math.min((aComb.score ?? 0) * 3, G + 0.5);

  // --- S: strain (low reliability) ---------------------------------------------------------
  const range = f0Range(info.sex);
  const f0 = s?.f0Median ?? v?.f0Mean ?? null;
  const stAbove = range && f0 ? 12 * Math.log2(f0 / range[1]) : null;
  const sComb = combine([
    { value: stAbove !== null ? dev(stAbove, 0, 6) : null, weight: 0.3, label: "F0 elevada" },
    { value: dev(m.avqi?.slope, -18, -8), weight: 0.35, label: "Energía espectral aguda" },
    { value: dev(v ? -v.h1h2 : null, 0, 10), weight: 0.35, label: "H1–H2 bajo (voz presionada)" },
  ]);
  const S = Math.min((sComb.score ?? 0) * 3, G + 0.5);

  // --- CAPE-V pitch: deviation from the typical range for the reported sex ----------------
  let pitch: number | null = null;
  let pitchDirection: CapeVScores["pitchDirection"] = null;
  if (range && f0) {
    const below = 12 * Math.log2(range[0] / f0);
    const above = 12 * Math.log2(f0 / range[1]);
    const d = Math.max(below, above, 0);
    pitch = Math.round(Math.min(100, d * 12));
    pitchDirection = d === 0 ? null : above > below ? "high" : "low";
  }

  // Confidence from recording quality and completeness
  const w = m.quality.warnings;
  let confidence: VoiceEstimates["confidence"] = "high";
  if (w.includes("low_snr") || w.includes("clipping") || w.includes("missing_tasks")) confidence = "medium";
  if (
    w.includes("noisy_environment") ||
    w.includes("vowel_too_short") ||
    w.includes("vowel_unvoiced") ||
    w.includes("speech_too_short") ||
    m.avqi === null
  )
    confidence = "low";

  const r1 = (x: number) => Math.round(x * 100) / 100;
  return {
    grbas: { G: toGrade(G), R: toGrade(R), B: toGrade(B), A: toGrade(A), S: toGrade(S) },
    continuous: { G: r1(G), R: r1(R), B: r1(B), A: r1(A), S: r1(S) },
    capev: {
      overall: gradeToCapeV(G),
      roughness: gradeToCapeV(R),
      breathiness: gradeToCapeV(B),
      strain: gradeToCapeV(S),
      pitch,
      pitchDirection,
      loudness: null, // not measurable with an uncalibrated microphone
    },
    confidence,
    drivers: { G: gComb.drivers, R: rComb.drivers, B: bComb.drivers, A: aComb.drivers, S: sComb.drivers },
  };
}
