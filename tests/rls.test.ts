// Runs the Supabase migration on an in-memory Postgres (PGlite) with a minimal Supabase-like
// `auth` schema and checks the Row Level Security rules.
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const D1 = "11111111-1111-1111-1111-111111111111";
const D2 = "22222222-2222-2222-2222-222222222222";
const UNKNOWN = "33333333-3333-3333-3333-333333333333";
let db: PGlite;

async function as(role: "anon" | "authenticated", sub: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${sub ?? ""}', false); SET ROLE ${role};`);
  try {
    const r = await db.query<Record<string, unknown>>(sql, params);
    return { ok: true as const, rows: r.rows };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message, rows: [] };
  } finally {
    await db.exec("RESET ROLE;");
  }
}

const insert = (doctor: string) =>
  `INSERT INTO public.voice_results (doctor_id, source, seen, label, clinician, protocol_version, metrics, estimates)
   VALUES ('${doctor}', $1, $2, $3, $4, 'vocalyzer-1.0', '{"version":1}', '{"grbas":{}}')`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    REVOKE ALL ON SCHEMA public FROM PUBLIC; -- no implicit access: the migration must grant it
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE PUBLICATION supabase_realtime;
    INSERT INTO auth.users VALUES ('${D1}'), ('${D2}');
  `);
  const dir = join(__dirname, "..", "supabase", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    await db.exec(sql);
    await db.exec(sql); // every migration must be idempotent
  }
});

describe("voice_results RLS", () => {
  it("anonymous patient can submit a valid row for an existing doctor", async () => {
    expect((await as("anon", null, insert(D1), ["patient", false, null, null])).ok).toBe(true);
  });
  it("anonymous inserts with wrong doctor / label / source / seen / clinician are rejected", async () => {
    expect((await as("anon", null, insert(UNKNOWN), ["patient", false, null, null])).ok).toBe(false);
    expect((await as("anon", null, insert(D1), ["patient", false, "JP", null])).ok).toBe(false);
    expect((await as("anon", null, insert(D1), ["doctor", false, null, null])).ok).toBe(false);
    expect((await as("anon", null, insert(D1), ["patient", true, null, null])).ok).toBe(false);
    expect((await as("anon", null, insert(D1), ["patient", false, null, '{"grbas":{}}'])).ok).toBe(false);
  });
  it("anonymous users cannot read results; oversized payloads are rejected", async () => {
    expect((await as("anon", null, "SELECT * FROM public.voice_results")).ok).toBe(false);
    const big = await as(
      "anon",
      null,
      `INSERT INTO public.voice_results (doctor_id, protocol_version, metrics, estimates)
       VALUES ('${D1}', 'v', jsonb_build_object('x', repeat('a', 25000)), '{}')`,
    );
    expect(big.ok).toBe(false);
  });
  it("doctors insert/read only their own rows", async () => {
    expect((await as("authenticated", D1, insert(D1), ["doctor", true, "JP", '{"grbas":{"G":1}}'])).ok).toBe(true);
    expect((await as("authenticated", D1, insert(D2), ["doctor", true, null, null])).ok).toBe(false);
    expect((await as("authenticated", D1, "SELECT id FROM public.voice_results")).rows).toHaveLength(2);
    expect((await as("authenticated", D2, "SELECT id FROM public.voice_results")).rows).toHaveLength(0);
  });
  it("doctors may update seen/label/clinician but never the measurements", async () => {
    expect(
      (await as("authenticated", D1, `UPDATE public.voice_results SET seen = true, label = 'AB', clinician = '{"grbas":{"G":2}}'`)).ok,
    ).toBe(true);
    expect((await as("authenticated", D1, "UPDATE public.voice_results SET metrics = '{}'")).ok).toBe(false);
    expect((await as("authenticated", D1, "UPDATE public.voice_results SET label = repeat('x', 61)")).ok).toBe(false);
    expect((await as("authenticated", D2, "UPDATE public.voice_results SET seen = false RETURNING id")).rows).toHaveLength(0);
  });
  it("doctors delete only their own rows", async () => {
    expect((await as("authenticated", D2, "DELETE FROM public.voice_results RETURNING id")).rows).toHaveLength(0);
    expect((await as("authenticated", D1, "DELETE FROM public.voice_results RETURNING id")).rows).toHaveLength(2);
  });
});

describe("keepalive", () => {
  it("anonymous clients can call keepalive() (used by the scheduled Netlify function)", async () => {
    const r = await as("anon", null, "SELECT public.keepalive() AS t");
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(1);
  });
});
