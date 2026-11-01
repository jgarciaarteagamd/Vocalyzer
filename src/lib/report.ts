// Builds the parameter tables and the copy-to-clipboard summary from stored metrics.
import { NORMS, f0Range, f0Status, statusFor, type Status } from "./voice/norms";
import type { SessionInfo, VoiceEstimates, VoiceMetrics, ClinicianRating } from "./voice/types";

export interface ParamRow {
  key: string; // i18n key (param.*)
  value: string;
  ref: string;
  status: Status;
}

export interface ParamSection {
  key: string; // i18n key (report.section.*)
  rows: ParamRow[];
}

type T = (key: string, ...args: (string | number)[]) => string;

function fmt(v: number | null | undefined, digits: number, unit = "", lang: "es" | "en" = "es"): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = v.toLocaleString(lang === "es" ? "es-ES" : "en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return unit ? `${s} ${unit}` : s;
}

export function buildSections(m: VoiceMetrics, info: SessionInfo, t: T, lang: "es" | "en"): ParamSection[] {
  const f = (v: number | null | undefined, d: number, u = "") => fmt(v, d, u, lang);
  const lt = (n: number, d: number, u = "") => `< ${f(n, d, u)}`;
  const gt = (n: number, d: number, u = "") => `> ${f(n, d, u)}`;
  const v = m.vowel;
  const s = m.speech;
  const range = f0Range(info.sex);
  const rangeTxt = range ? `${range[0]}–${range[1]} Hz` : t("ref.info");

  const overall: ParamRow[] = [
    { key: "param.avqi", value: f(m.avqi?.value, 2), ref: lt(NORMS.avqi.limit, 2), status: statusFor("avqi", m.avqi?.value) },
    { key: "param.cppsVowel", value: f(v?.cpps, 2, "dB"), ref: gt(NORMS.cppsVowel.limit, 2, "dB"), status: statusFor("cppsVowel", v?.cpps) },
    {
      key: "param.cppsReading",
      value: f(s?.cppsReading, 2, "dB"),
      ref: gt(NORMS.cppsReading.limit, 2, "dB"),
      status: statusFor("cppsReading", s?.cppsReading),
    },
  ];
  const vowel: ParamRow[] = v
    ? [
        { key: "param.f0Mean", value: f(v.f0Mean, 1, "Hz"), ref: rangeTxt, status: f0Status(info.sex, v.f0Mean) },
        { key: "param.f0Sd", value: `${f(v.f0Sd, 2, "Hz")} (${f(v.f0SdSt, 2, "st")})`, ref: t("ref.info"), status: "info" },
        { key: "param.jitterLocal", value: f(v.jitterLocal, 3, "%"), ref: lt(NORMS.jitterLocal.limit, 2, "%"), status: statusFor("jitterLocal", v.jitterLocal) },
        { key: "param.jitterRap", value: f(v.jitterRap, 3, "%"), ref: lt(NORMS.jitterRap.limit, 2, "%"), status: statusFor("jitterRap", v.jitterRap) },
        { key: "param.jitterPpq5", value: f(v.jitterPpq5, 3, "%"), ref: lt(NORMS.jitterPpq5.limit, 2, "%"), status: statusFor("jitterPpq5", v.jitterPpq5) },
        { key: "param.shimmerLocal", value: f(v.shimmerLocal, 2, "%"), ref: lt(NORMS.shimmerLocal.limit, 2, "%"), status: statusFor("shimmerLocal", v.shimmerLocal) },
        { key: "param.shimmerDb", value: f(v.shimmerDb, 3, "dB"), ref: lt(NORMS.shimmerDb.limit, 2, "dB"), status: statusFor("shimmerDb", v.shimmerDb) },
        { key: "param.shimmerApq11", value: f(v.shimmerApq11, 2, "%"), ref: lt(NORMS.shimmerApq11.limit, 2, "%"), status: statusFor("shimmerApq11", v.shimmerApq11) },
        { key: "param.hnr", value: f(v.hnr, 1, "dB"), ref: gt(NORMS.hnr.limit, 0, "dB"), status: statusFor("hnr", v.hnr) },
        { key: "param.h1h2", value: f(v.h1h2, 1, "dB"), ref: t("ref.info"), status: "info" },
        { key: "param.voiceBreaks", value: f(v.voiceBreaksPct, 1, "%"), ref: t("ref.info"), status: "info" },
        { key: "param.intensitySd", value: f(v.intensitySd, 2, "dB"), ref: t("ref.info"), status: "info" },
      ]
    : [];
  const aero: ParamRow[] = [
    { key: "param.mpt", value: f(m.mptSeconds, 1, "s"), ref: `≥ ${f(NORMS.mpt.limit, 0, "s")}`, status: statusFor("mpt", m.mptSeconds) },
    { key: "param.sDur", value: f(m.sSeconds, 1, "s"), ref: t("ref.info"), status: "info" },
    { key: "param.zDur", value: f(m.zSeconds, 1, "s"), ref: t("ref.info"), status: "info" },
    { key: "param.sz", value: f(m.szRatio, 2), ref: `≤ ${f(NORMS.szRatio.limit, 1)}`, status: statusFor("szRatio", m.szRatio) },
  ];
  const speech: ParamRow[] = s
    ? [
        { key: "param.speechF0", value: f(s.f0Median, 1, "Hz"), ref: rangeTxt, status: f0Status(info.sex, s.f0Median) },
        { key: "param.speechF0Range", value: `${f(s.f0P5, 0)}–${f(s.f0P95, 0)} Hz (${f(s.f0RangeSt, 1, "st")})`, ref: t("ref.info"), status: "info" },
        { key: "param.speechF0Sd", value: f(s.f0SdSt, 2, "st"), ref: t("ref.info"), status: "info" },
        { key: "param.voicedPct", value: f(s.voicedPct, 1, "%"), ref: t("ref.info"), status: "info" },
        { key: "param.speechIntSd", value: f(s.intensitySd, 1, "dB"), ref: t("ref.info"), status: "info" },
        { key: "param.cppsSentences", value: f(s.cppsSentences, 2, "dB"), ref: t("ref.info"), status: "info" },
        { key: "param.readingDur", value: f(s.readingSeconds, 1, "s"), ref: t("ref.info"), status: "info" },
      ]
    : [];
  const q = m.quality;
  const quality: ParamRow[] = [
    { key: "param.noise", value: f(q.noiseFloorDb, 1, "dBFS"), ref: lt(-50, 0, "dBFS"), status: q.noiseFloorDb === null ? "info" : q.noiseFloorDb > -50 ? "abnormal" : "normal" },
    { key: "param.snr", value: f(q.snrVowelDb, 1, "dB"), ref: gt(30, 0, "dB"), status: q.snrVowelDb === null ? "info" : q.snrVowelDb < 25 ? "abnormal" : q.snrVowelDb < 30 ? "borderline" : "normal" },
    { key: "param.clipping", value: f(q.clippingPct, 2, "%"), ref: lt(0.1, 1, "%"), status: q.clippingPct > 0.1 ? "abnormal" : "normal" },
    { key: "param.sampleRate", value: `${q.sampleRate} Hz`, ref: "≥ 44100 Hz", status: q.sampleRate < 20000 ? "abnormal" : "normal" },
  ];
  if (m.avqi) {
    overall.push({
      key: "param.avqiComponents",
      value: `CPPS ${f(m.avqi.cpps, 1)} · HNR ${f(m.avqi.hnr, 1)} · Shim ${f(m.avqi.shimmerLocal, 1)}% · ShdB ${f(m.avqi.shimmerDb, 2)} · Slope ${f(m.avqi.slope, 1)} · Tilt ${f(m.avqi.tilt, 1)}`,
      ref: t("ref.info"),
      status: "info",
    });
  }
  return [
    { key: "report.section.overall", rows: overall },
    { key: "report.section.vowel", rows: vowel },
    { key: "report.section.aero", rows: aero },
    { key: "report.section.speech", rows: speech },
    { key: "report.section.quality", rows: quality },
  ];
}

export function grbasString(g: { G?: number; R?: number; B?: number; A?: number; S?: number }): string {
  const c = (v?: number) => (v === undefined || v === null ? "–" : String(v));
  return `G${c(g.G)}R${c(g.R)}B${c(g.B)}A${c(g.A)}S${c(g.S)}`;
}

/** Short text for pasting into the clinical record. */
export function summaryText(
  m: VoiceMetrics,
  e: VoiceEstimates,
  clinician: ClinicianRating | null,
  lang: "es" | "en",
): string {
  const f = (v: number | null | undefined, d: number) => fmt(v, d, "", lang);
  const parts: string[] = [];
  parts.push(lang === "es" ? "Análisis acústico de la voz (Vocalyzer)" : "Acoustic voice analysis (Vocalyzer)");
  if (m.avqi) parts.push(`AVQI ${f(m.avqi.value, 2)}`);
  if (m.vowel) {
    parts.push(`CPPS /a/ ${f(m.vowel.cpps, 1)} dB`);
    parts.push(`F0 ${f(m.vowel.f0Mean, 0)} Hz`);
    parts.push(`Jitter ${f(m.vowel.jitterLocal, 2)}%`);
    parts.push(`Shimmer ${f(m.vowel.shimmerLocal, 2)}%`);
    parts.push(`HNR ${f(m.vowel.hnr, 1)} dB`);
  }
  if (m.speech?.cppsReading != null) parts.push(`CPPS ${lang === "es" ? "lectura" : "reading"} ${f(m.speech.cppsReading, 1)} dB`);
  if (m.mptSeconds != null) parts.push(`${lang === "es" ? "TMF" : "MPT"} ${f(m.mptSeconds, 1)} s`);
  if (m.szRatio != null) parts.push(`s/z ${f(m.szRatio, 2)}`);
  parts.push(`${grbasString(e.grbas)} (${lang === "es" ? "estimación acústica" : "acoustic estimate"})`);
  if (clinician?.grbas && Object.keys(clinician.grbas).length) {
    parts.push(`${grbasString(clinician.grbas)} (${lang === "es" ? "valoración perceptual" : "perceptual rating"})`);
  }
  if (clinician?.capev?.overall != null) parts.push(`CAPE-V OS ${clinician.capev.overall}/100`);
  return parts.join(" · ") + ".";
}
