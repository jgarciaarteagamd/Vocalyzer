import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { VoiceTest, type VoiceTestResult } from "@/components/VoiceTest";
import { useLang } from "@/lib/i18n";
import { isUuid, submitPatientResult } from "@/lib/results";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/p/$doctorId")({
  component: PatientPage,
});

type Phase = "test" | "review" | "done";

function PatientPage() {
  const { doctorId } = Route.useParams();
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>("test");
  const [result, setResult] = useState<Omit<VoiceTestResult, "recordings"> | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const valid = isUuid(doctorId);

  function handleAnalyzed(r: VoiceTestResult) {
    // Drop the audio immediately: patients never need it after the analysis.
    const { recordings: _discarded, ...rest } = r;
    setResult(rest);
    setPhase("review");
  }

  async function send() {
    if (!result) return;
    setSending(true);
    setError(null);
    try {
      await submitPatientResult(doctorId, result.info, result.metrics, result.estimates);
      setResult(null);
      setPhase("done");
    } catch (e) {
      console.error("[patient submit] error", e);
      setError(t("submit.error"));
    } finally {
      setSending(false);
    }
  }

  const warnings = result?.metrics.quality.warnings ?? [];
  const qualityIssue = warnings.some((w) => w === "noisy_environment" || w === "low_snr" || w === "clipping");

  return (
    <div className="min-h-screen bg-muted/30">
      <PublicHeader suffix={t("patient.header")} linkHome={false} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {!valid || !isSupabaseConfigured ? (
          <Card>
            <CardContent className="flex gap-3 py-8 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <span>{!valid ? t("patient.invalid") : t("setup.not_configured")}</span>
            </CardContent>
          </Card>
        ) : phase === "test" ? (
          <>
            <h1 className="mb-6 text-xl font-bold">{t("patient.header")}</h1>
            <VoiceTest key={attempt} onAnalyzed={handleAnalyzed} />
          </>
        ) : phase === "review" ? (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                <h2 className="text-lg font-semibold">{t("submit.title")}</h2>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{t("submit.body")}</p>
              {qualityIssue && (
                <div className="flex gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t("patient.quality_warning")}</span>
                </div>
              )}
              {error && (
                <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setAttempt((a) => a + 1);
                    setPhase("test");
                  }}
                  disabled={sending}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("patient.repeat")}
                </Button>
                <Button className="ml-auto" size="lg" onClick={send} disabled={sending}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {sending ? t("submit.sending") : t("submit.button")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center">
            <CardContent className="space-y-3 py-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h1 className="text-xl font-semibold">{t("done.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("done.body")}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
