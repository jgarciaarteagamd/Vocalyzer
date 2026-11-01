import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Inbox, Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { VoiceTest, type VoiceTestResult } from "@/components/VoiceTest";
import { ResultReport } from "@/components/ResultReport";
import { ClinicianRatingForm } from "@/components/ClinicianRatingForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/lib/i18n";
import { TASKS, taskText } from "@/lib/protocol";
import { submitDoctorResult } from "@/lib/results";
import { playSamples } from "@/lib/voice/recorder";
import type { ClinicianRating, TaskId } from "@/lib/voice/types";

export const Route = createFileRoute("/_authenticated/evaluar")({
  component: EvaluatePage,
});

function EvaluatePage() {
  const { lang, t } = useLang();
  const qc = useQueryClient();
  const [result, setResult] = useState<VoiceTestResult | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState<TaskId | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  function reset() {
    stopRef.current?.();
    setResult(null); // releases the audio held in memory
    setLabel("");
    setSavedId(null);
    setAttempt((a) => a + 1);
  }

  function toggle(id: TaskId) {
    stopRef.current?.();
    if (playing === id) {
      setPlaying(null);
      return;
    }
    const r = result?.recordings[id];
    if (!r) return;
    setPlaying(id);
    stopRef.current = playSamples(r.samples, r.sampleRate, () => setPlaying((p) => (p === id ? null : p)));
  }

  async function save(clinician: ClinicianRating | null) {
    if (!result) return;
    setSaving(true);
    try {
      const id = await submitDoctorResult(result.info, result.metrics, result.estimates, label, clinician);
      setSavedId(id);
      stopRef.current?.();
      setResult((r) => (r ? { ...r, recordings: {} } : r)); // audio no longer needed
      qc.invalidateQueries({ queryKey: ["voice-results"] });
      toast.success(t("evaluate.saved"));
    } catch (e) {
      console.error("[doctor save]", e);
      toast.error(t("inbox.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">{t("evaluate.title")}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{t("evaluate.subtitle")}</p>

        {!result ? (
          <VoiceTest key={attempt} onAnalyzed={setResult} />
        ) : savedId ? (
          <Card className="text-center">
            <CardContent className="space-y-4 py-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="text-lg font-semibold">{t("evaluate.saved")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" asChild>
                  <Link to="/bandeja">
                    <Inbox className="mr-2 h-4 w-4" />
                    {t("panel.inbox.button")}
                  </Link>
                </Button>
                <Button onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("evaluate.new")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm font-medium">{t("evaluate.recordings")}</p>
                <div className="flex flex-wrap gap-2">
                  {TASKS.filter((k) => k.id !== "silence" && result.recordings[k.id]).map((k) => (
                    <Button key={k.id} size="sm" variant={playing === k.id ? "default" : "outline"} onClick={() => toggle(k.id)}>
                      {playing === k.id ? <Square className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                      {taskText(k.id, lang).title}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <ResultReport metrics={result.metrics} estimates={result.estimates} info={result.info} />

            <div className="space-y-1">
              <Label htmlFor="label">{t("report.label")}</Label>
              <Input
                id="label"
                value={label}
                maxLength={60}
                onChange={(e) => setLabel(e.target.value.slice(0, 60))}
                placeholder={t("inbox.label.placeholder")}
              />
              <p className="text-[11px] text-muted-foreground">{t("inbox.label.hint")}</p>
            </div>

            <ClinicianRatingForm
              initial={null}
              estimates={result.estimates}
              onSave={save}
              saving={saving}
              saveLabel={saving ? t("evaluate.saving") : t("evaluate.save")}
            />

            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("evaluate.new")}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
