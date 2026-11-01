import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Copy, Inbox, Mic, Printer } from "lucide-react";
import { Header } from "@/components/Header";
import { QrCode } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { patientUrl } from "@/lib/links";
import { ensureProfile, listMyResults } from "@/lib/results";

export const Route = createFileRoute("/_authenticated/panel")({
  component: PanelPage,
});

function PanelPage() {
  const { t } = useLang();
  const { user } = Route.useRouteContext();
  const url = patientUrl(user.id);
  const [copied, setCopied] = useState(false);
  const { data: results } = useQuery({ queryKey: ["voice-results"], queryFn: listMyResults });
  const unseen = (results ?? []).filter((r) => !r.seen).length;

  useEffect(() => {
    void ensureProfile().catch((e) => console.error("[profile]", e));
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">{t("panel.title")}</h1>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("panel.qr.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <QrCode value={url} size={180} className="mx-auto rounded border bg-white p-2 sm:mx-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">{t("panel.qr.desc")}</p>
                <p className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{url}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={copied ? "default" : "outline"} onClick={copy}>
                    {copied ? <ClipboardCheck className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                    {copied ? t("panel.qr.copied") : t("panel.qr.copy")}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/imprimir-qr">
                      <Printer className="mr-1 h-4 w-4" />
                      {t("panel.qr.print")}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  {t("nav.evaluate")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("panel.evaluate.desc")}</p>
                <Button asChild>
                  <Link to="/evaluar">{t("panel.evaluate.button")}</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  {t("inbox.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("panel.inbox.desc", unseen)}</p>
                <Button variant="outline" asChild>
                  <Link to="/bandeja">{t("panel.inbox.button")}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
