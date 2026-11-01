// Long-term average spectrum measures used by AVQI (Praat: To Ltas: 1; Get slope: 0, 1000, 1000,
// 10000, "energy"; Compute trend line: 1, 10000).

import { fft, nextPow2 } from "./fft";
import type { Signal } from "./signal";

export interface LtasResult {
  slope: number; // dB: energy 1–10 kHz minus energy 0–1 kHz
  tilt: number; // dB: same, measured on the regression (trend) line
}

export function ltasMeasures(x: Signal, fs: number): LtasResult {
  const nyquist = fs / 2;
  if (nyquist < 10000) {
    // Not enough bandwidth for the 1–10 kHz band; compute on what is available.
  }
  const nfft = nextPow2(x.length);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let i = 0; i < x.length; i++) re[i] = x[i];
  fft(re, im);
  const df = fs / nfft;
  // 1-Hz bands: mean power density per band
  const nBands = Math.floor(nyquist);
  const bandPow = new Float64Array(nBands);
  const bandCnt = new Float64Array(nBands);
  for (let k = 0; k <= nfft / 2; k++) {
    const f = k * df;
    const b = Math.min(nBands - 1, Math.floor(f));
    bandPow[b] += re[k] * re[k] + im[k] * im[k];
    bandCnt[b]++;
  }
  const bandDb = new Float64Array(nBands);
  for (let b = 0; b < nBands; b++) {
    const p = bandCnt[b] > 0 ? bandPow[b] / bandCnt[b] : 0;
    bandDb[b] = 10 * Math.log10(p + 1e-30);
  }
  const hiEnd = Math.min(10000, nBands);
  const energyDb = (vals: Float64Array, a: number, b: number) => {
    let s = 0;
    let c = 0;
    for (let i = a; i < b; i++) {
      s += Math.pow(10, vals[i] / 10);
      c++;
    }
    return 10 * Math.log10(s / Math.max(1, c) + 1e-30);
  };
  const slope = energyDb(bandDb, 1000, hiEnd) - energyDb(bandDb, 0, 1000);

  // Trend line: least-squares regression of band dB on frequency between 1 Hz and 10 kHz.
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0,
    n = 0;
  for (let b = 1; b < hiEnd; b++) {
    const f = b + 0.5;
    sx += f;
    sy += bandDb[b];
    sxx += f * f;
    sxy += f * bandDb[b];
    n++;
  }
  const a1 = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a0 = (sy - a1 * sx) / n;
  const trend = new Float64Array(nBands);
  for (let b = 0; b < nBands; b++) trend[b] = a0 + a1 * (b + 0.5);
  const tilt = energyDb(trend, 1000, hiEnd) - energyDb(trend, 0, 1000);
  return { slope, tilt };
}
