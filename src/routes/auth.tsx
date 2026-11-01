import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");
  const [su, setSu] = useState({ first_name: "", last_name: "", license_number: "", email: "", password: "", password2: "" });
  const [decl, setDecl] = useState(false);
  const [terms, setTerms] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const openedAt = useRef(Date.now());

  useEffect(() => {
    openedAt.current = Date.now();
  }, [mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPass });
      if (error) throw error;
      navigate({ to: "/panel" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (honeypot) return;
    if (Date.now() - openedAt.current < 3000) return setError(t("auth.too_fast"));
    if (!su.first_name || !su.last_name || !su.license_number) return setError(t("auth.missing_fields"));
    if (su.password !== su.password2) return setError(t("auth.pass_mismatch"));
    if (su.password.length < 8) return setError(t("auth.pass_short"));
    if (!decl || !terms) return setError(t("auth.must_accept"));
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.auth.signUp({
        email: su.email,
        password: su.password,
        options: {
          emailRedirectTo: `${window.location.origin}/panel`,
          data: {
            first_name: su.first_name,
            last_name: su.last_name,
            license_number: su.license_number,
            terms_accepted_at: now,
            professional_declaration_at: now,
          },
        },
      });
      if (error) throw error;
      setInfo(t("auth.check_email_verify"));
      setMode("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <PublicHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-xl">{mode === "signup" ? t("auth.signup") : t("auth.signin")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured && (
              <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">{t("setup.not_configured")}</p>
            )}
            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">{t("auth.email")}</Label>
                  <Input id="si-email" type="email" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pass">{t("auth.password")}</Label>
                  <Input id="si-pass" type="password" value={siPass} onChange={(e) => setSiPass(e.target.value)} required autoComplete="current-password" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-emerald-600">{info}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.enter")}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setMode("signup"); setError(""); setInfo(""); }}>
                  {t("auth.toSignUp")}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
                  aria-hidden
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("auth.first_name")}</Label>
                    <Input value={su.first_name} onChange={(e) => setSu({ ...su, first_name: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("auth.last_name")}</Label>
                    <Input value={su.last_name} onChange={(e) => setSu({ ...su, last_name: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("auth.license")}</Label>
                  <Input value={su.license_number} onChange={(e) => setSu({ ...su, license_number: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>{t("auth.email")}</Label>
                  <Input type="email" value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })} required autoComplete="email" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("auth.password")}</Label>
                    <Input type="password" value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })} required autoComplete="new-password" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("auth.password2")}</Label>
                    <Input type="password" value={su.password2} onChange={(e) => setSu({ ...su, password2: e.target.value })} required autoComplete="new-password" />
                  </div>
                </div>
                <label className="flex items-start gap-2 pt-2 text-sm">
                  <Checkbox checked={decl} onCheckedChange={(v) => setDecl(Boolean(v))} className="mt-0.5" />
                  <span>{t("auth.declaration")}</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={terms} onCheckedChange={(v) => setTerms(Boolean(v))} className="mt-0.5" />
                  <span>
                    {t("auth.accept_terms")}{" "}
                    <Link to="/legal/terminos" target="_blank" className="underline">{t("landing.legal.terms")}</Link>
                    {" · "}
                    <Link to="/legal/privacidad" target="_blank" className="underline">{t("landing.legal.privacy")}</Link>
                  </span>
                </label>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-emerald-600">{info}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.register")}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setMode("signin"); setError(""); setInfo(""); }}>
                  {t("auth.toSignIn")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
