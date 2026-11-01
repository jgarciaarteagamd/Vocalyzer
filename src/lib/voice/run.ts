import type { RecordingSet, SessionInfo, VoiceEstimates, VoiceMetrics } from "./types";

export interface AnalysisOutput {
  metrics: VoiceMetrics;
  estimates: VoiceEstimates;
}

/** Runs the analysis in a Web Worker (recordings are copied, so they remain available for playback). */
export function runAnalysis(
  recordings: RecordingSet,
  info: SessionInfo,
  onProgress?: (fraction: number) => void,
): Promise<AnalysisOutput> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "progress") onProgress?.(msg.fraction);
      else if (msg.type === "result") {
        worker.terminate();
        resolve({ metrics: msg.metrics, estimates: msg.estimates });
      } else if (msg.type === "error") {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err instanceof ErrorEvent ? new Error(err.message) : new Error("worker error"));
    };
    worker.postMessage({ recordings, info });
  });
}
