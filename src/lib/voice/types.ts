// Shared types for the voice evaluation protocol and its results.

export type Sex = "male" | "female" | "unspecified";
export type AgeGroup = "<18" | "18-39" | "40-59" | "60+" | "unspecified";

export type TaskId = "silence" | "vowel" | "mpt" | "s" | "z" | "sentences" | "reading";

export interface Recording {
  samples: Float32Array;
  sampleRate: number;
}

export type RecordingSet = Partial<Record<TaskId, Recording>>;

export interface VowelMetrics {
  analyzedSeconds: number;
  f0Mean: number;
  f0Sd: number;
  f0SdSt: number;
  jitterLocal: number;
  jitterAbsUs: number;
  jitterRap: number;
  jitterPpq5: number;
  shimmerLocal: number;
  shimmerDb: number;
  shimmerApq3: number;
  shimmerApq5: number;
  shimmerApq11: number;
  hnr: number;
  cpps: number;
  h1h2: number;
  intensitySd: number;
  voiceBreaksPct: number;
  pulses: number;
}

export interface SpeechMetrics {
  f0Mean: number;
  f0Median: number;
  f0Sd: number;
  f0SdSt: number;
  f0P5: number;
  f0P95: number;
  f0RangeSt: number;
  voicedPct: number;
  intensitySd: number;
  cppsReading: number | null;
  cppsSentences: number | null;
  readingSeconds: number | null;
}

export interface AvqiMetrics {
  value: number;
  cpps: number;
  hnr: number;
  shimmerLocal: number;
  shimmerDb: number;
  slope: number;
  tilt: number;
  voicedSpeechSeconds: number;
  vowelSeconds: number;
}

export interface QualityMetrics {
  sampleRate: number;
  noiseFloorDb: number | null; // dBFS
  snrVowelDb: number | null;
  snrSpeechDb: number | null;
  clippingPct: number;
  warnings: QualityWarning[];
}

export type QualityWarning =
  | "noisy_environment"
  | "low_snr"
  | "clipping"
  | "low_sample_rate"
  | "vowel_too_short"
  | "vowel_unvoiced"
  | "speech_too_short"
  | "missing_tasks";

export interface VoiceMetrics {
  version: 1;
  vowel: VowelMetrics | null;
  mptSeconds: number | null;
  sSeconds: number | null;
  zSeconds: number | null;
  szRatio: number | null;
  speech: SpeechMetrics | null;
  avqi: AvqiMetrics | null;
  quality: QualityMetrics;
}

export type Grade = 0 | 1 | 2 | 3;

export interface GrbasScores {
  G: Grade;
  R: Grade;
  B: Grade;
  A: Grade;
  S: Grade;
}

export interface CapeVScores {
  overall: number; // 0–100
  roughness: number;
  breathiness: number;
  strain: number;
  pitch: number | null;
  pitchDirection: "high" | "low" | null;
  loudness: number | null;
  loudnessDirection?: "soft" | "loud" | null;
  consistency?: "C" | "I" | null;
}

export interface VoiceEstimates {
  grbas: GrbasScores;
  continuous: { G: number; R: number; B: number; A: number; S: number };
  capev: CapeVScores;
  confidence: "high" | "medium" | "low";
  drivers: { G: string[]; R: string[]; B: string[]; A: string[]; S: string[] };
}

export interface ClinicianRating {
  grbas?: Partial<Record<keyof GrbasScores, Grade>>;
  capev?: Partial<CapeVScores>;
  ratedAt?: string;
}

export interface SessionInfo {
  sex: Sex;
  ageGroup: AgeGroup;
  lang: "es" | "en";
}

export interface SessionResult {
  metrics: VoiceMetrics;
  estimates: VoiceEstimates;
  info: SessionInfo;
  protocolVersion: string;
}
