import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Inbox,
  Pencil,
  Printer,
  Stethoscope,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { ResultReport } from "@/components/ResultReport";
import { ClinicianRatingForm } from "@/components/ClinicianRatingForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/lib/i18n";
import { grbasString, summaryText } from "@/lib/report";
import {
  deleteResult,
  listMyResults,
  markSeen,
  updateClinicianRating,
  updateLabel,
  type VoiceResultRow,
} from "@/lib/results";
import { supabase } from "@/lib/supabase";
import type { ClinicianRating } from "@/lib/voice/types";

export const Route = createFileRoute("/_authenticated/bandeja")({
  component: InboxPage,
});

type Filter = "all" | "patient" | "doctor";

function InboxPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useQuery({ queryKey: ["voice-results"], queryFn: listMyResults });

  useEffect(() => {
    const channel = supabase
      .channel("voice_results_inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_results" }, () =>
        qc.invalidateQueries({ queryKey: ["voice-results"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const all = data ?? [];
  const filtered = useMemo(() => (filter === "all" ? all : all.filter((r) => r.source === filter)), [all, filter]);
  const unseen = all.filter((r) => !r.seen).length;
  const counts = {
    all: all.length,
    patient: all.filter((r) => r.source === "patient").length,
    doctor: all.filter((r) => r.source === "doctor").length,
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["voice-results"] });

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Inbox className="h-6 w-6" />
              {t("inbox.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("inbox.subtitle")}</p>
          </div>
          {unseen > 0 && (
            <Badge>
              {unseen} {t("inbox.new")}
            </Badge>
          )}
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
          <TabsList>
            {(["all", "patient", "doctor"] as const).map((f) => (
              <TabsTrigger key={f} value={f}>
                {t(`inbox.filter.${f}`)} <span className="ml-1 text-xs text-muted-foreground">({counts[f]})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading && <p className="text-sm text-muted-foreground">{t("inbox.loading")}</p>}
        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">{t("inbox.empty")}</CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filtered.map((r) => (
            <ResultCard key={r.id} r={r} onChanged={refresh} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ResultCard({ r, onChanged }: { r: VoiceResultRow; onChanged: () => void }) {
  const { lang, t } = useLang();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(r.label ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const info = { sex: r.sex, ageGroup: r.age_group, lang: r.language };
  const num = (v: number | null | undefined, d: number) =>
    v === null || v === undefined || !Number.isFinite(v)
      ? "—"
      : v.toLocaleString(lang === "es" ? "es-ES" : "en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });

  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      onChanged();
    } catch (e) {
      console.error("[inbox]", e);
      toast.error(t("inbox.error"));
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText(r.metrics, r.estimates, r.clinician, lang));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("[inbox copy]", e);
    }
  }

  async function saveLabel() {
    setSaving(true);
    await act(() => updateLabel(r.id, value));
    setSaving(false);
    setEditing(false);
  }

  async function saveRating(c: ClinicianRating | null) {
    setRatingSaving(true);
    await act(() => updateClinicianRating(r.id, c));
    setRatingSaving(false);
    toast.success(t("rating.saved"));
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !r.seen) void act(() => markSeen(r.id, true));
  }

  const clinicianG = r.clinician?.grbas && Object.keys(r.clinician.grbas).length ? grbasString(r.clinician.grbas) : null;

  return (
    <Card className={r.seen && !open ? "opacity-75" : ""}>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{t("inbox.item")}</h3>
              {r.source === "doctor" ? (
                <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                  <Stethoscope className="h-3 w-3" />
                  {t("inbox.source.doctor")}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <User className="h-3 w-3" />
                  {t("inbox.source.patient")}
                </Badge>
              )}
              {!r.seen && <Badge className="text-xs">{t("inbox.new_badge")}</Badge>}
              {r.label && !editing && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Tag className="h-3 w-3" />
                  {r.label}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString(lang === "en" ? "en-GB" : "es-ES")}
              {r.sex !== "unspecified" && ` · ${t(`setup.sex.${r.sex}`)}`}
              {r.age_group !== "unspecified" && ` · ${t(`setup.age.${r.age_group}`)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={copied ? "default" : "outline"} onClick={handleCopy}>
              {copied ? <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              {copied ? t("inbox.copied") : t("inbox.copy")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => act(() => markSeen(r.id, !r.seen))}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {r.seen ? t("inbox.mark_unread") : t("inbox.mark_read")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="delete"
              onClick={() => {
                if (confirm(t("inbox.confirm_delete"))) void act(() => deleteResult(r.id));
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3">
          {editing ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value.slice(0, 60))}
                  placeholder={t("inbox.label.placeholder")}
                  maxLength={60}
                  className="h-8"
                />
                <Button size="sm" onClick={saveLabel} disabled={saving}>
                  {saving ? t("inbox.label.saving") : t("inbox.label.save")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValue(r.label ?? ""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">{t("inbox.label.hint")}</p>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" />
              {r.label ? t("inbox.label.edit") : t("inbox.label.add")}
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="AVQI" value={num(r.metrics.avqi?.value, 2)} />
          <Metric label="CPPS /a/ (dB)" value={num(r.metrics.vowel?.cpps, 1)} />
          <Metric label={`GRBAS (${t("inbox.estimated")})`} value={grbasString(r.estimates.grbas)} />
          <Metric label={`CAPE-V OS`} value={`${r.clinician?.capev?.overall ?? r.estimates.capev.overall}/100`} />
        </div>
        {clinicianG && (
          <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
            GRBAS ({t("inbox.clinician")}): {clinicianG}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={toggleOpen}>
            {open ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            {open ? t("inbox.details.hide") : t("inbox.details.show")}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/informe/$id" params={{ id: r.id }}>
              <Printer className="mr-1 h-4 w-4" />
              {t("inbox.print")}
            </Link>
          </Button>
        </div>

        {open && (
          <div className="mt-4 space-y-5">
            <ResultReport metrics={r.metrics} estimates={r.estimates} info={info} clinician={r.clinician} />
            <ClinicianRatingForm initial={r.clinician} estimates={r.estimates} onSave={saveRating} saving={ratingSaving} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
