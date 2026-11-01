/** Public origin used for patient links / QR codes. */
export function publicOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_ORIGIN?.replace(/\/+$/, "");
  if (configured) return configured;
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function patientUrl(doctorId: string): string {
  return `${publicOrigin()}/p/${doctorId}`;
}
