import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { useLang } from "@/lib/i18n";

export const OWNER = {
  name: "Juan Pablo García Arteaga",
  role: { es: "Médico Otorrinolaringólogo", en: "ENT physician" },
  colegiado: "212105263",
  city: "Huelva, España",
  email: "jgarciaarteaga.md@gmail.com",
};

export const LAST_UPDATED = { es: "31 de octubre de 2026", en: "31 October 2026" };

export function LegalLayout({ titleKey, children, other }: { titleKey: string; children: ReactNode; other: "terms" | "privacy" }) {
  const { lang, t } = useLang();
  return (
    <div className="min-h-screen bg-muted/30">
      <PublicHeader
        right={
          <Button size="sm" variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" /> {t("legal.back")}
            </Link>
          </Button>
        }
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("legal.updated")}: {LAST_UPDATED[lang]}
        </p>
        <article className="legal mt-6">{children}</article>
      </main>
      <footer className="border-t bg-background py-6 text-center text-xs text-muted-foreground">
        {other === "privacy" ? (
          <Link to="/legal/privacidad" className="hover:underline">{t("landing.legal.privacy")}</Link>
        ) : (
          <Link to="/legal/terminos" className="hover:underline">{t("landing.legal.terms")}</Link>
        )}
      </footer>
    </div>
  );
}
