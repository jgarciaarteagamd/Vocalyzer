// Reference values used to flag parameters. All thresholds refer to Praat-compatible measurements
// (our engine is validated against Praat 6.1.38; see tests/praat-agreement.test.ts).

import type { Sex } from "./types";

export type Status = "normal" | "borderline" | "abnormal" | "info";

export interface Norm {
  /** "min": values below `limit` are abnormal; "max": values above `limit` are abnormal. */
  direction: "min" | "max";
  limit: number;
  /** optional borderline margin (same units) on the abnormal side's opposite. */
  borderline?: number;
  source: string;
}

export const SOURCES = {
  praat:
    "Boersma P, Weenink D. Praat: doing phonetics by computer. Umbrales de patología MDVP citados en el manual de Praat (Voice report).",
  murton:
    "Murton O, Hillman R, Mehta D. Cepstral Peak Prominence Values for Clinical Voice Evaluation. Am J Speech Lang Pathol. 2020;29(3):1596-1607. doi:10.1044/2020_AJSLP-20-00001",
  avqiEs:
    "Delgado Hernández J, et al. Validation of the AVQI v03.01 and the ABI in the Spanish language. Ann Otol Rhinol Laryngol. 2018;127(5):317-326. doi:10.1177/0003489418761096",
  eckel:
    "Eckel FC, Boone DR. The S/Z ratio as an indicator of laryngeal pathology. J Speech Hear Disord. 1981;46(2):147-149. doi:10.1044/jshd.4602.147",
  hnr: "Valor orientativo habitual para /a/ sostenida medida con Praat (HNR cc).",
  mpt: "Valores de referencia clínicos habituales para adultos (TMF < 10 s se considera reducido).",
  f0: "Rangos habituales de F0 conversacional en adultos (Baken RJ, Orlikoff RF. Clinical Measurement of Speech and Voice).",
  snr: "Deliyski DD, et al. Adverse effects of environmental noise on acoustic voice quality measurements. J Voice. 2005;19(1):15-28.",
} as const;

export const NORMS = {
  jitterLocal: { direction: "max", limit: 1.04, borderline: 0.2, source: SOURCES.praat },
  jitterRap: { direction: "max", limit: 0.68, borderline: 0.1, source: SOURCES.praat },
  jitterPpq5: { direction: "max", limit: 0.84, borderline: 0.1, source: SOURCES.praat },
  shimmerLocal: { direction: "max", limit: 3.81, borderline: 0.5, source: SOURCES.praat },
  shimmerDb: { direction: "max", limit: 0.35, borderline: 0.05, source: SOURCES.praat },
  shimmerApq11: { direction: "max", limit: 3.07, borderline: 0.4, source: SOURCES.praat },
  hnr: { direction: "min", limit: 20, borderline: 2, source: SOURCES.hnr },
  cppsVowel: { direction: "min", limit: 14.45, borderline: 1, source: SOURCES.murton },
  cppsReading: { direction: "min", limit: 9.33, borderline: 0.7, source: SOURCES.murton },
  avqi: { direction: "max", limit: 2.28, borderline: 0.3, source: SOURCES.avqiEs },
  szRatio: { direction: "max", limit: 1.4, borderline: 0.15, source: SOURCES.eckel },
  mpt: { direction: "min", limit: 10, borderline: 5, source: SOURCES.mpt },
} satisfies Record<string, Norm>;

export type NormKey = keyof typeof NORMS;

export function statusFor(key: NormKey, value: number | null | undefined): Status {
  if (value === null || value === undefined || !Number.isFinite(value)) return "info";
  const n: Norm = NORMS[key];
  const b = n.borderline ?? 0;
  if (n.direction === "max") {
    if (value > n.limit) return "abnormal";
    if (value > n.limit - b) return "borderline";
    return "normal";
  }
  if (value < n.limit) return "abnormal";
  if (value < n.limit + b) return "borderline";
  return "normal";
}

/** Typical conversational F0 range (Hz) for adults. */
export function f0Range(sex: Sex): [number, number] | null {
  if (sex === "male") return [85, 155];
  if (sex === "female") return [165, 255];
  return null;
}

export function f0Status(sex: Sex, f0: number | null | undefined): Status {
  const r = f0Range(sex);
  if (!r || f0 === null || f0 === undefined || !Number.isFinite(f0)) return "info";
  if (f0 < r[0] * 0.94 || f0 > r[1] * 1.06) return "abnormal";
  if (f0 < r[0] || f0 > r[1]) return "borderline";
  return "normal";
}
