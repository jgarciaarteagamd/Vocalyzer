import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

const STORAGE_KEY = "vocalyzer.cookies.accepted";

export function CookieBanner() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
        <Cookie className="hidden h-6 w-6 shrink-0 text-primary sm:block" />
        <p className="flex-1 text-xs text-muted-foreground sm:text-sm">
          {t("cookies.text")}{" "}
          <Link to="/legal/privacidad" className="underline hover:text-foreground">
            {t("cookies.more")}
          </Link>
        </p>
        <Button size="sm" onClick={accept}>
          {t("cookies.accept")}
        </Button>
      </div>
    </div>
  );
}
