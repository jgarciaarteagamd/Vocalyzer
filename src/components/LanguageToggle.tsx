import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setLang(lang === "es" ? "en" : "es")}
      aria-label={t("lang.toggle")}
      className="px-2 text-xs font-semibold uppercase tracking-wide"
    >
      {lang}
    </Button>
  );
}
