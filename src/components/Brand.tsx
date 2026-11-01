import { AudioLines } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Brand({ suffix }: { suffix?: string }) {
  const { t } = useLang();
  return (
    <span className="flex items-center gap-2 font-semibold text-primary">
      <AudioLines className="h-5 w-5" />
      <span>{t("app.name")}</span>
      {suffix && <span className="hidden font-normal text-muted-foreground sm:inline">· {suffix}</span>}
    </span>
  );
}
