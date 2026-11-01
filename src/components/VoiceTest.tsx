import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ConsentGate } from "@/components/ConsentGate";
import { LevelMeter } from "@/components/LevelMeter";
import { useLang } from "@/lib/i18n";
import { TASKS, taskText, type TaskDef } from "@/lib/protocol";
import { MicError, MicRecorder, playSamples, takeCheck } from "@/lib/voice/recorder";
import { runAnalysis, type AnalysisOutput } from "@/lib/voice/run";
import type { AgeGroup, RecordingSet, SessionInfo, Sex, TaskId } from "@/lib/voice/types";

export interface VoiceTestResult extends AnalysisOutput {
  info: SessionInfo;
  recordings: RecordingSet;
}

type Stage = "consent" | "setup" | "task" | "analyzing" | "error";
type Check = ReturnType<typeof takeCheck>;

const SEXES: Sex[] = ["female", "male", "unspecified"];
const AGES: AgeGroup[] = ["<18", "18-39", "40-59", "60+", "unspecified"];

export function VoiceTest({ onAnalyzed }: { onAnalyzed: (r: VoiceTestResult) => void }) {
  const { lang, t } = useLang();
  const [stage, setStage] = useState<Stage>("consent");
  const [sex, setSex] = useState<Sex>("unspecified");
  const [age, setAge] = useState<AgeGroup>("unspecified");
  const [micError, setMicError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [recorder, setRecorder] = useState<MicRecorder | null>(null);
  const [index, setIndex] = useState(0);
  const [recordings, setRecordings] = useState<RecordingSet>({});
  const [checks, setChecks] = useState<Partial<Record<TaskId, Check>>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState<TaskId | null>(null);
  const stopPlayRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const levelOffRef = useRef<(() => void) | null>(null);
  const recorderRef = useRef<MicRecorder | null>(null);
  recorderRef.current = recorder;

  const task: TaskDef = TASKS[index];
  const text = taskText(task.id, lang);

  // Release the microphone when leaving the component.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      levelOffRef.current?.();
      stopPlayRef.current?.();
      recorderRef.current?.close();
    },
    [],
  );

  async function enableMic() {
    setRequesting(true);
    setMicError(null);
    try {
      const rec = await MicRecorder.open();
      setRecorder(rec);
      setStage("task");
    } catch (e) {
      const code = e instanceof MicError ? e.code : "denied";
      setMicError(t(`mic.${code}`));
    } finally {
      setRequesting(false);
    }
  }

  const finishTake = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || !rec.isRecording) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    levelOffRef.current?.();
    levelOffRef.current = null;
    const samples = rec.stop();
    const check = takeCheck(samples, rec.sampleRate, task.expectSound);
    setRecordings((r) => ({ ...r, [task.id]: { samples, sampleRate: rec.sampleRate } }));
    setChecks((c) => ({ ...c, [task.id]: check }));
    setIsRecording(false);
  }, [task]);

  function startTake() {
    const rec = recorderRef.current;
    if (!rec) return;
    stopPlayRef.current?.();
    setChecks((c) => ({ ...c, [task.id]: undefined }));
    rec.start();
    setIsRecording(true);
    setElapsed(0);
    const limit = task.mode === "fixed" ? (task.seconds ?? task.maxSeconds) : task.maxSeconds;

    if (task.autoStopOnSilence) {
      const noise = checks.silence?.rmsDb ?? -60;
      const thr = Math.max(noise + 10, -58);
      let soundFor = 0;
      let quietFor = 0;
      let last = performance.now();
      levelOffRef.current = rec.onLevel((db) => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        if (db > thr + 4) {
          soundFor += dt;
          quietFor = 0;
        } else if (db < thr) {
          quietFor += dt;
        }
        if (soundFor > 0.8 && quietFor > 1.5) window.setTimeout(finishTake, 0);
      });
    }

    timerRef.current = window.setInterval(() => {
      const e = rec.elapsed();
      setElapsed(e);
      if (e >= limit) finishTake();
    }, 100);
  }

  function togglePlay(id: TaskId) {
    if (playing === id) {
      stopPlayRef.current?.();
      setPlaying(null);
      return;
    }
    stopPlayRef.current?.();
    const r = recordings[id];
    if (!r) return;
    setPlaying(id);
    stopPlayRef.current = playSamples(r.samples, r.sampleRate, () => setPlaying((p) => (p === id ? null : p)));
  }

  async function next() {
    stopPlayRef.current?.();
    setPlaying(null);
    if (index < TASKS.length - 1) {
      setIndex(index + 1);
      setElapsed(0);
      return;
    }
    // Last task: release the microphone and analyse.
    recorderRef.current?.close();
    setRecorder(null);
    setStage("analyzing");
    setProgress(0.02);
    const info: SessionInfo = { sex, ageGroup: age, lang };
    try {
      const out = await runAnalysis(recordings, info, (f) => setProgress(f));
      onAnalyzed({ ...out, info, recordings });
    } catch (e) {
      console.error("[analysis] error", e);
      setStage("error");
    }
  }

  // ------------------------------------------------------------------ render
  if (stage === "consent") return <ConsentGate onAccept={() => setStage("setup")} />;

  if (stage === "setup") {
    return (
      <Card>
        <CardContent className="space-y-6 pt-6">
          <h2 className="text-lg font-semibold">{t("setup.title")}</h2>
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">{t("setup.optional")}</p>
            <div className="space-y-2">
              <Label>{t("setup.sex")}</Label>
              <RadioGroup value={sex} onValueChange={(v) => setSex(v as Sex)} className="grid gap-2 sm:grid-cols-3">
                {SEXES.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50">
                    <RadioGroupItem value={s} />
                    {t(`setup.sex.${s}`)}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>{t("setup.age")}</Label>
              <RadioGroup value={age} onValueChange={(v) => setAge(v as AgeGroup)} className="grid gap-2 sm:grid-cols-3">
                {AGES.map((a) => (
                  <label key={a} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50">
                    <RadioGroupItem value={a} />
                    {t(`setup.age.${a}`)}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">{t("setup.tips.title")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {["setup.tip1", "setup.tip2", "setup.tip3", "setup.tip4"].map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{t("setup.duration")}</p>
          </div>

          {micError && (
            <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{micError}</p>
          )}

          <Button className="w-full" size="lg" onClick={enableMic} disabled={requesting}>
            {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
            {requesting ? t("setup.mic_requesting") : t("setup.mic_button")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stage === "analyzing") {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h2 className="text-lg font-semibold">{t("analyze.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("analyze.body")}</p>
          <Progress value={Math.round(progress * 100)} className="mx-auto max-w-xs" />
        </CardContent>
      </Card>
    );
  }

  if (stage === "error") {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <p className="text-sm">{t("analyze.error")}</p>
          <Button
            onClick={() => {
              setRecordings({});
              setChecks({});
              setIndex(0);
              setStage("setup");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("patient.repeat")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // stage === "task"
  const check = checks[task.id];
  const done = Boolean(recordings[task.id]) && !isRecording;
  const tooShort = check ? check.seconds < task.minSeconds : false;
  const canContinue = done && check && !check.noSound && !tooShort;
  const limit = task.mode === "fixed" ? (task.seconds ?? task.maxSeconds) : task.maxSeconds;
  const isReading = Boolean(text.lines);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{t("task.step", index + 1, TASKS.length)}</p>
        <Progress value={((index + (done ? 1 : 0)) / TASKS.length) * 100} className="mt-2" />
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div>
            <h2 className="text-xl font-semibold">{text.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text.instruction}</p>
            {text.note && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{text.note}</p>}
          </div>

          {isReading ? (
            <div className={`rounded-lg border bg-muted/30 p-4 ${isRecording ? "ring-2 ring-red-400" : ""}`}>
              {task.id === "sentences" ? (
                <ol className="reading-text list-decimal space-y-1 pl-6">
                  {text.lines!.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ol>
              ) : (
                <div className="reading-text space-y-3">
                  {text.lines!.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex h-24 items-center justify-center rounded-lg border bg-muted/30 text-3xl font-semibold tracking-widest ${
                isRecording ? "text-red-600 ring-2 ring-red-400" : "text-muted-foreground"
              }`}
            >
              {text.prompt}
            </div>
          )}

          <div className="space-y-2">
            <LevelMeter recorder={recorder} label={t("task.level")} />
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                {isRecording && <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" />}
                {isRecording ? t("task.recording") : done && check ? t("task.recorded", check.seconds.toFixed(1)) : ""}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {isRecording && task.mode === "fixed"
                  ? t("task.countdown", Math.max(0, Math.ceil(limit - elapsed)))
                  : isRecording
                    ? `${elapsed.toFixed(1)} s`
                    : ""}
              </span>
            </div>
          </div>

          {!isRecording && !done && (
            <Button className="w-full" size="lg" onClick={startTake}>
              <Mic className="mr-2 h-5 w-5" />
              {task.id === "silence" ? t("task.start_silence") : t("task.start")}
            </Button>
          )}
          {isRecording && task.mode === "free" && (
            <Button className="w-full" size="lg" variant="destructive" onClick={finishTake}>
              <Square className="mr-2 h-4 w-4" />
              {t("task.stop")}
            </Button>
          )}

          {done && check && (
            <div className="space-y-3">
              {(check.noSound || tooShort || check.clipped || check.noisy) && (
                <div className="flex gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {check.noSound
                      ? t("task.no_sound")
                      : tooShort
                        ? t("task.too_short")
                        : check.clipped
                          ? t("task.too_loud")
                          : t("task.too_noisy")}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {task.id !== "silence" && (
                  <Button variant="outline" onClick={() => togglePlay(task.id)}>
                    {playing === task.id ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {playing === task.id ? t("task.stop_listen") : t("task.listen")}
                  </Button>
                )}
                <Button variant="outline" onClick={startTake}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("task.retry")}
                </Button>
                <Button className="ml-auto" onClick={next} disabled={!canContinue}>
                  {canContinue && <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {index === TASKS.length - 1 ? t("task.analyze") : t("task.next")}
                  {index < TASKS.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
