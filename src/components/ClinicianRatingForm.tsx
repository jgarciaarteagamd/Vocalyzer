import { useState } from "react";
import { Save, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLang } from "@/lib/i18n";
import type { CapeVScores, ClinicianRating, Grade, GrbasScores, VoiceEstimates } from "@/lib/voice/types";

const KEYS = ["G", "R", "B", "A", "S"] as const;
const CAPEV_KEYS = ["overall", "roughness", "breathiness", "strain", "pitch", "loudness"] as const;
type CapeKey = (typeof CAPEV_KEYS)[number];

export function ClinicianRatingForm({
  initial,
  estimates,
  onSave,
  saving,
  saveLabel,
}: {
  initial: ClinicianRating | null;
  estimates: VoiceEstimates;
  onSave: (r: ClinicianRating | null) => void;
  saving?: boolean;
  saveLabel?: string;
}) {
  const { t } = useLang();
  const [grbas, setGrbas] = useState<Partial<GrbasScores>>(initial?.grbas ?? {});
  const [capev, setCapev] = useState<Partial<Record<CapeKey, number>>>(() => {
    const c = initial?.capev ?? {};
    const out: Partial<Record<CapeKey, number>> = {};
    for (const k of CAPEV_KEYS) if (typeof c[k] === "number") out[k] = c[k] as number;
    return out;
  });
  const [consistency, setConsistency] = useState<CapeVScores["consistency"]>(initial?.capev?.consistency ?? null);

  function fromEstimate() {
    setGrbas({ ...estimates.grbas });
    const e = estimates.capev;
    setCapev({
      overall: e.overall,
      roughness: e.roughness,
      breathiness: e.breathiness,
      strain: e.strain,
      ...(e.pitch !== null ? { pitch: e.pitch } : {}),
    });
  }

  function clear() {
    setGrbas({});
    setCapev({});
    setConsistency(null);
  }

  function save() {
    const hasAny = Object.keys(grbas).length > 0 || Object.keys(capev).length > 0 || consistency;
    if (!hasAny) {
      onSave(null);
      return;
    }
    onSave({
      grbas: grbas as Partial<Record<keyof GrbasScores, Grade>>,
      capev: { ...capev, consistency },
      ratedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-5 rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div>
        <h3 className="font-semibold">{t("rating.title")}</h3>
        <p className="text-xs text-muted-foreground">{t("rating.desc")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("rating.grbas")}</p>
        {KEYS.map((k) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{t(`report.grbas.${k}`)}</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((v) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  variant={grbas[k] === v ? "default" : "outline"}
                  className="h-8 w-9"
                  onClick={() => setGrbas((g) => ({ ...g, [k]: g[k] === v ? undefined : (v as Grade) }))}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{t("rating.capev")}</p>
        {CAPEV_KEYS.map((k) => (
          <div key={k} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
            <span className="text-sm text-muted-foreground">{t(`report.capev.${k}`)}</span>
            <Slider
              value={[capev[k] ?? 0]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => setCapev((c) => ({ ...c, [k]: v }))}
              className={capev[k] === undefined ? "opacity-40" : ""}
            />
            <span className="text-right text-sm tabular-nums">{capev[k] ?? "—"}</span>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm text-muted-foreground">{t("rating.consistency")}:</span>
          {(["C", "I"] as const).map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={consistency === c ? "default" : "outline"}
              onClick={() => setConsistency(consistency === c ? null : c)}
            >
              {c === "C" ? t("rating.consistent") : t("rating.intermittent")}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={fromEstimate}>
          <Wand2 className="mr-1 h-3.5 w-3.5" />
          {t("rating.copy_estimate")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          <X className="mr-1 h-3.5 w-3.5" />
          {t("rating.clear")}
        </Button>
        <Button type="button" size="sm" className="ml-auto" onClick={save} disabled={saving}>
          <Save className="mr-1 h-3.5 w-3.5" />
          {saving ? t("rating.saving") : (saveLabel ?? t("rating.save"))}
        </Button>
      </div>
    </div>
  );
}
