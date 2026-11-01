"""Compute Praat reference values (via parselmouth) for the synthetic fixtures.

Usage:
    npx vite-node scripts/gen-fixtures.ts
    python3 scripts/praat_reference.py

Writes tests/praat-reference.json, which tests/praat-agreement.test.ts compares against.
"""
import json
import os

import numpy as np
import parselmouth
from parselmouth.praat import call

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tests", ".praat-cache")


def measure(sound: parselmouth.Sound, kind: str) -> dict:
    out = {}
    pitch = call(sound, "To Pitch", 0.0, 75, 600)
    out["f0_mean"] = call(pitch, "Get mean", 0, 0, "Hertz")
    out["f0_sd"] = call(pitch, "Get standard deviation", 0, 0, "Hertz")
    out["voiced_frames"] = call(pitch, "Count voiced frames")
    pp = call([sound, pitch], "To PointProcess (cc)")
    out["pulses"] = call(pp, "Get number of points")
    out["jitter_local"] = call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3) * 100
    out["jitter_rap"] = call(pp, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3) * 100
    out["jitter_ppq5"] = call(pp, "Get jitter (ppq5)", 0, 0, 0.0001, 0.02, 1.3) * 100
    out["shimmer_local"] = call([sound, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6) * 100
    out["shimmer_db"] = call([sound, pp], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    out["shimmer_apq3"] = call([sound, pp], "Get shimmer (apq3)", 0, 0, 0.0001, 0.02, 1.3, 1.6) * 100
    out["shimmer_apq5"] = call([sound, pp], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6) * 100
    out["shimmer_apq11"] = call([sound, pp], "Get shimmer (apq11)", 0, 0, 0.0001, 0.02, 1.3, 1.6) * 100
    harm = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
    out["hnr"] = call(harm, "Get mean", 0, 0)
    cep = call(sound, "To PowerCepstrogram", 60, 0.002, 5000, 50)
    out["cpps"] = call(cep, "Get CPPS", "no", 0.01, 0.001, 60, 330, 0.05, "Parabolic", 0.001, 0, "Straight", "Robust")
    ltas = call(sound, "To Ltas", 1)
    out["ltas_slope"] = call(ltas, "Get slope", 0, 1000, 1000, 10000, "energy")
    trend = call(ltas, "Compute trend line", 1, 10000)
    out["ltas_tilt"] = call(trend, "Get slope", 0, 1000, 1000, 10000, "energy")
    return {k: (None if isinstance(v, float) and np.isnan(v) else v) for k, v in out.items()}


def main() -> None:
    with open(os.path.join(CACHE, "manifest.json")) as fh:
        manifest = json.load(fh)
    result = {"praat_version": parselmouth.PRAAT_VERSION, "fixtures": {}}
    for item in manifest:
        x = np.fromfile(os.path.join(CACHE, item["name"] + ".f64"), dtype="<f8")
        sound = parselmouth.Sound(x, sampling_frequency=item["fs"])
        result["fixtures"][item["name"]] = measure(sound, item["kind"])
        m = result["fixtures"][item["name"]]
        print(item["name"], {k: (round(v, 3) if isinstance(v, float) else v) for k, v in m.items()})
    with open(os.path.join(ROOT, "tests", "praat-reference.json"), "w") as fh:
        json.dump(result, fh, indent=1)


if __name__ == "__main__":
    main()
