// Data access for voice results (Supabase, protected by Row Level Security).
import { supabase, supabaseAnon } from "./supabase";
import { PROTOCOL_VERSION } from "./protocol";
import type { ClinicianRating, SessionInfo, VoiceEstimates, VoiceMetrics } from "./voice/types";

export interface VoiceResultRow {
  id: string;
  doctor_id: string;
  source: "patient" | "doctor";
  created_at: string;
  seen: boolean;
  label: string | null;
  sex: SessionInfo["sex"];
  age_group: SessionInfo["ageGroup"];
  language: SessionInfo["lang"];
  protocol_version: string;
  metrics: VoiceMetrics;
  estimates: VoiceEstimates;
  clinician: ClinicianRating | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID_RE.test(v);

export function sanitizeLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const t = label.trim().slice(0, 60);
  return t.length ? t : null;
}

/** PUBLIC — anonymous patient submission (numerical results only; never audio). */
export async function submitPatientResult(doctorId: string, info: SessionInfo, metrics: VoiceMetrics, estimates: VoiceEstimates) {
  if (!isUuid(doctorId)) throw new Error("invalid doctor id");
  const { error } = await supabaseAnon.from("voice_results").insert({
    doctor_id: doctorId,
    source: "patient",
    seen: false,
    label: null,
    clinician: null,
    sex: info.sex,
    age_group: info.ageGroup,
    language: info.lang,
    protocol_version: PROTOCOL_VERSION,
    metrics,
    estimates,
  });
  if (error) throw error;
}

/** AUTH — doctor saves an in-clinic assessment. */
export async function submitDoctorResult(
  info: SessionInfo,
  metrics: VoiceMetrics,
  estimates: VoiceEstimates,
  label: string | null,
  clinician: ClinicianRating | null,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("voice_results")
    .insert({
      doctor_id: u.user.id,
      source: "doctor",
      seen: true,
      label: sanitizeLabel(label),
      clinician,
      sex: info.sex,
      age_group: info.ageGroup,
      language: info.lang,
      protocol_version: PROTOCOL_VERSION,
      metrics,
      estimates,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string;
}

export async function listMyResults(): Promise<VoiceResultRow[]> {
  const { data, error } = await supabase
    .from("voice_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as VoiceResultRow[];
}

export async function getResult(id: string): Promise<VoiceResultRow | null> {
  const { data, error } = await supabase.from("voice_results").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as VoiceResultRow | null;
}

export async function markSeen(id: string, seen: boolean) {
  const { error } = await supabase.from("voice_results").update({ seen }).eq("id", id);
  if (error) throw error;
}

export async function updateLabel(id: string, label: string | null) {
  const { error } = await supabase.from("voice_results").update({ label: sanitizeLabel(label) }).eq("id", id);
  if (error) throw error;
}

export async function updateClinicianRating(id: string, clinician: ClinicianRating | null) {
  const { error } = await supabase.from("voice_results").update({ clinician }).eq("id", id);
  if (error) throw error;
}

export async function deleteResult(id: string) {
  const { error } = await supabase.from("voice_results").delete().eq("id", id);
  if (error) throw error;
}

/** Ensures the doctor's profile row exists (created from sign-up metadata on first login). */
export async function ensureProfile() {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return;
  const { data } = await supabase.from("doctor_profiles").select("id").eq("id", user.id).maybeSingle();
  if (data) return;
  const md = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const now = new Date().toISOString();
  await supabase.from("doctor_profiles").upsert({
    id: user.id,
    first_name: md.first_name ?? null,
    last_name: md.last_name ?? null,
    license_number: md.license_number ?? null,
    terms_accepted_at: md.terms_accepted_at ?? now,
    professional_declaration_at: md.professional_declaration_at ?? now,
    profile_completed: Boolean(md.first_name && md.license_number),
  });
}
