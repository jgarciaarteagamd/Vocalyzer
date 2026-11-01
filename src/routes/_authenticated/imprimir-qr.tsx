import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/QrCode";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n";
import { patientUrl } from "@/lib/links";

export const Route = createFileRoute("/_authenticated/imprimir-qr")({
  component: PrintQrPage,
});

function PrintQrPage() {
  const { t } = useLang();
  const { user } = Route.useRouteContext();
  const url = patientUrl(user.id);
  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/panel">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("print.back")}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            {t("print.print")}
          </Button>
        </div>
      </div>
      <main className="mx-auto max-w-3xl bg-white px-8 py-12 text-center text-slate-900 shadow-sm print:shadow-none">
        <p className="text-sm uppercase tracking-widest text-slate-500">{t("print.kicker")}</p>
        <h1 className="mt-2 text-3xl font-bold">{t("print.title")}</h1>
        <div className="mt-8 flex justify-center">
          <QrCode value={url} size={300} />
        </div>
        <p className="mx-auto mt-8 max-w-xl text-base leading-7">{t("print.instructions")}</p>
        <p className="mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 text-sm leading-6 text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          {t("print.privacy")}
        </p>
        <p className="mt-8 break-all font-mono text-[11px] text-slate-400">{url}</p>
      </main>
      <style>{`@media print { @page { size: A4; margin: 15mm; } }`}</style>
    </div>
  );
}
