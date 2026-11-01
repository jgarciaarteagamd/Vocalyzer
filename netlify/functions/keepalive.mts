// Scheduled keep-alive: calls the `keepalive()` database function a few times a day so the
// Supabase Free-plan project registers activity and is not paused after 7 idle days.
// Runs only on the published production deploy. Times are UTC.

declare const Netlify: { env: { get(key: string): string | undefined } };

export default async () => {
  const url = Netlify.env.get("VITE_SUPABASE_URL");
  const key = Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    console.error("[keepalive] Supabase environment variables are missing");
    return new Response("missing configuration", { status: 500 });
  }
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/keepalive`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await res.text();
  console.log(`[keepalive] ${res.status} ${body.slice(0, 80)}`);
  return new Response(res.ok ? "ok" : "error", { status: res.ok ? 200 : 502 });
};

export const config = {
  // Every 6 hours, at minute 17 (UTC).
  schedule: "17 */6 * * *",
};
