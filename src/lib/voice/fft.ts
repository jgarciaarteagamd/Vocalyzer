// Minimal radix-2 FFT utilities (no dependencies, works in browsers, workers and Node).

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

const twiddleCache = new Map<number, { cos: Float64Array; sin: Float64Array; rev: Uint32Array }>();

function getTables(n: number) {
  let t = twiddleCache.get(n);
  if (t) return t;
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = Math.sin((2 * Math.PI * i) / n);
  }
  const rev = new Uint32Array(n);
  let bits = 0;
  while (1 << bits < n) bits++;
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  t = { cos, sin, rev };
  if (twiddleCache.size > 16) twiddleCache.clear();
  twiddleCache.set(n, t);
  return t;
}

/** In-place complex FFT. `re`/`im` length must be a power of two. inverse=true computes the unscaled inverse. */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  if (n <= 1) return;
  const { cos, sin, rev } = getTables(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let tmp = re[i];
      re[i] = re[j];
      re[j] = tmp;
      tmp = im[i];
      im[i] = im[j];
      im[j] = tmp;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step];
        const wi = sign * sin[k * step];
        const a = start + k;
        const b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

/** Power spectrum |X|^2 of a real frame zero-padded to nfft (returns nfft/2+1 bins). */
export function powerSpectrum(frame: ArrayLike<number>, nfft: number): Float64Array {
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  const n = Math.min(frame.length, nfft);
  for (let i = 0; i < n; i++) re[i] = frame[i];
  fft(re, im);
  const out = new Float64Array(nfft / 2 + 1);
  for (let i = 0; i <= nfft / 2; i++) out[i] = re[i] * re[i] + im[i] * im[i];
  return out;
}

/** Linear autocorrelation r[0..maxLag] of a real frame via FFT. */
export function autocorrelation(frame: ArrayLike<number>, maxLag: number, nfft?: number): Float64Array {
  const size = nfft ?? nextPow2(frame.length + maxLag + 1);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < frame.length; i++) re[i] = frame[i];
  fft(re, im);
  for (let i = 0; i < size; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  fft(re, im, true);
  const out = new Float64Array(maxLag + 1);
  for (let i = 0; i <= maxLag; i++) out[i] = re[i] / size;
  return out;
}
