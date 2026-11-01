import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n";
import { buildSections, grbasString } from "@/lib/report";
import { SOURCES, type Status } from "@/lib/voice/norms";
import type { ClinicianRating, GrbasScores, SessionInfo, VoiceEstimates, VoiceMetrics } from "@/lib/voice/types";

const GRADE_COLORS = ["bg-emerald-500", "bg-yellow-400", "bg-orange-500", "bg-red-600"];
const STATUS_CLASS: Record<Status, string> = {
  normal: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  borderline: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  abnormal: "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  info: "",
};

function Bar({ value, marker }: { value: number | null; marker?: number | null }) {
  return (
    <div className="relative h-2.5 w-full rounded-full bg-muted">
      {value !== null && (
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/80"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      )}
      {marker !== null && marker !== undefined && (
        <div
          className="absolute -top-1 h-4.5 w-0.5 bg-blue-600"
          style={{ left: `${Math.max(0, Math.min(100, marker))}%`, height: "18px" }}
          title="clinician"
        />
      )}
    </div>
  );
}

export function ResultReport({
  metrics,
  estimates,
  info,
  clinician,
  compact = false,
}: {
  metrics: VoiceMetrics;
  estimates: VoiceEstimates;
  info: SessionInfo;
  clinician?: ClinicianRating | null;
  compact?: boolean;
}) {
  const { lang, t } = useLang();
  const sections = buildSections(metrics, info, t, lang);
  const g = estimates.grbas;
  const c = estimates.capev;
  const lowRel = new Set<keyof GrbasScores>(["A", "S"]);

  const capevRows: { key: string; value: number | null; extra?: string; marker?: number | null; note?: string }[] = [
    { key: "overall", value: c.overall, marker: clinician?.capev?.overall ?? null },
    { key: "roughness", value: c.roughness, marker: clinician?.capev?.roughness ?? null },
    { key: "breathiness", value: c.breathiness, marker: clinician?.capev?.breathiness ?? null },
    { key: "strain", value: c.strain, marker: clinician?.capev?.strain ?? null, note: t("report.low_reliability") },
    {
      key: "pitch",
      value: c.pitch,
      extra: c.pitchDirection ? t(`report.capev.${c.pitchDirection}`) : undefined,
      marker: clinician?.capev?.pitch ?? null,
      note: c.pitch === null ? t("report.capev.pitch_unknown") : undefined,
    },
    { key: "loudness", value: null, marker: clinician?.capev?.loudness ?? null, note: t("report.capev.not_estimable") },
  ];

  return (
    <div className="space-y-5">
      {metrics.quality.warnings.length > 0 && (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {metrics.quality.warnings.map((w) => (
              <span key={w}>{t(`warning.${w}`)}</span>
            ))}
          </div>
        </div>
      )}

      {/* Estimates */}
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("report.estimates.title")}</h3>
          <Badge variant="outline" className="text-xs">
            {t("report.confidence")}: {t(`report.confidence.${estimates.confidence}`)}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {(["G", "R", "B", "A", "S"] as const).map((k) => (
            <div key={k} className="rounded-md border p-2 text-center">
              <p className="text-[11px] leading-tight text-muted-foreground">{t(`report.grbas.${k}`)}</p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${GRADE_COLORS[g[k]]}`} />
                <span className="text-2xl font-bold tabular-nums">{g[k]}</span>
              </div>
              {clinician?.grbas?.[k] !== undefined && (
                <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                  {t("inbox.clinician")}: {clinician.grbas[k]}
                </p>
              )}
              {lowRel.has(k) && <p className="text-[10px] leading-tight text-muted-foreground">*</p>}
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-sm">
          {grbasString(g)} <span className="text-xs text-muted-foreground">({t("inbox.estimated")})</span>
          {clinician?.grbas && Object.keys(clinician.grbas).length > 0 && (
            <span className="ml-3 text-blue-700 dark:text-blue-300">
              {grbasString(clinician.grbas)} <span className="text-xs">({t("inbox.clinician")})</span>
            </span>
          )}
        </p>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">CAPE-V</p>
          {capevRows.map((r) => (
            <div key={r.key} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{t(`report.capev.${r.key}`)}</span>
              {r.value === null && r.note ? (
                <span className="text-xs italic text-muted-foreground">{r.note}</span>
              ) : (
                <Bar value={r.value} marker={r.marker} />
              )}
              <span className="text-right tabular-nums">
                {r.value !== null ? `${r.value}/100` : "—"}
                {r.extra && <span className="block text-[11px] text-muted-foreground">{r.extra}</span>}
              </span>
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            {(["G", "R", "B"] as const).map(
              (k) =>
                estimates.drivers[k].length > 0 && (
                  <p key={k}>
                    <span className="font-medium">{k}</span> — {t("report.drivers")}: {estimates.drivers[k].join(", ")}
                  </p>
                ),
            )}
            <p>* {t("report.low_reliability")}</p>
          </div>
        )}
        <p className="mt-3 flex gap-2 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("report.estimates.disclaimer")}
        </p>
      </section>

      {/* Parameter tables */}
      {sections
        .filter((s) => s.rows.length > 0)
        .map((s) => (
          <section key={s.key} className="break-inside-avoid rounded-lg border p-4">
            <h3 className="font-semibold">{t(s.key)}</h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">{t("report.col.param")}</th>
                  <th className="py-1 pr-2 font-medium">{t("report.col.value")}</th>
                  <th className="hidden py-1 font-medium sm:table-cell">{t("report.col.ref")}</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.key} className="border-t align-top">
                    <td className="py-2 pr-2">{t(r.key)}</td>
                    <td className="py-2 pr-2">
                      <span className="tabular-nums">{r.value}</span>
                      {r.status !== "info" && (
                        <Badge variant="outline" className={`ml-2 px-1.5 py-0 text-[10px] ${STATUS_CLASS[r.status]}`}>
                          {t(`report.status.${r.status}`)}
                        </Badge>
                      )}
                      <span className="block text-xs text-muted-foreground sm:hidden">{r.ref}</span>
                    </td>
                    <td className="hidden py-2 text-xs text-muted-foreground sm:table-cell">{r.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

      {!compact && (
        <section className="space-y-2 text-xs text-muted-foreground">
          <p>{t("report.disclaimer")}</p>
          <details>
            <summary className="cursor-pointer font-medium">{t("report.sources")}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{SOURCES.murton}</li>
              <li>{SOURCES.avqiEs}</li>
              <li>{SOURCES.eckel}</li>
              <li>{SOURCES.praat}</li>
              <li>{SOURCES.snr}</li>
              <li>Kempster GB, Gerratt BR, Verdolini Abbott K, Barkmeier-Kraemer J, Hillman RE. Consensus Auditory-Perceptual Evaluation of Voice: development of a standardized clinical protocol. Am J Speech Lang Pathol. 2009;18(2):124-132.</li>
              <li>Núñez-Batalla F, et al. Validation of the Spanish adaptation of the CAPE-V. Acta Otorrinolaringol Esp. 2015;66(5):249-257. doi:10.1016/j.otorri.2014.07.007</li>
              <li>Hirano M. Clinical Examination of Voice. Springer; 1981 (GRBAS).</li>
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
