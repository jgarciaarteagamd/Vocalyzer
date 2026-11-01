/// <reference lib="webworker" />
// Web Worker: runs the acoustic analysis off the main thread. Audio never leaves the device.
import { analyzeRecordings } from "./analysis";
import { estimateScales } from "./estimate";
import type { RecordingSet, SessionInfo } from "./types";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (e: MessageEvent<{ recordings: RecordingSet; info: SessionInfo }>) => {
  const { recordings, info } = e.data;
  try {
    const metrics = analyzeRecordings(recordings, (step, fraction) =>
      self.postMessage({ type: "progress", step, fraction }),
    );
    const estimates = estimateScales(metrics, info);
    self.postMessage({ type: "result", metrics, estimates });
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
