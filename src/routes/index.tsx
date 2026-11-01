import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { AppFooter } from "@/components/AppFooter";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { t } = useLang();
  const features = [
    { icon: ShieldCheck, title: "landing.f1.title", desc: "landing.f1.desc" },
    { icon: Mic, title: "landing.f2.title", desc: "landing.f2.desc" },
    { icon: ClipboardList, title: "landing.f3.title", desc: "landing.f3.desc" },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PublicHeader
        right={
          <Link to="/auth">
            <Button size="sm">{t("landing.access")}</Button>
          </Link>
        }
      />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("landing.title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t("landing.subtitle")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">{t("landing.cta")}</Button>
          </Link>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-6 text-left">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{t(title)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(desc)}</p>
            </div>
          ))}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
