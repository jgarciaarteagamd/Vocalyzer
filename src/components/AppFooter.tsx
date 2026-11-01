import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";

export function AppFooter() {
  const { t } = useLang();
  return (
    <footer className="border-t bg-background py-6 text-center text-sm text-muted-foreground print:hidden">
      <p>{t("app.name")}</p>
      <p className="mt-2 flex flex-wrap justify-center gap-4">
        <Link to="/legal/terminos" className="hover:text-foreground hover:underline">
          {t("landing.legal.terms")}
        </Link>
        <Link to="/legal/privacidad" className="hover:text-foreground hover:underline">
          {t("landing.legal.privacy")}
        </Link>
      </p>
    </footer>
  );
}
