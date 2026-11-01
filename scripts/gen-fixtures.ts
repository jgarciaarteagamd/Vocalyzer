// Writes the synthetic fixtures as raw float64 files so Praat (via parselmouth) can analyse the exact
// same samples. Usage: npx vite-node scripts/gen-fixtures.ts && python3 scripts/praat_reference.py
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURES } from "../tests/synth";

const dir = join(process.cwd(), "tests", ".praat-cache");
mkdirSync(dir, { recursive: true });
const manifest = FIXTURES.map((f) => {
  const x = f.signal();
  writeFileSync(join(dir, `${f.name}.f64`), Buffer.from(x.buffer));
  return { name: f.name, fs: f.fs, kind: f.kind, samples: x.length };
});
writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`wrote ${manifest.length} fixtures to ${dir}`);
