import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cpu, DatabaseZap, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLang } from "@/lib/i18n";

/**
 * Consent screen shown before any recording: explains that the analysis runs in the browser and
 * that the voice is never stored. The checkbox (Terms + Privacy) enables the Accept button.
 */
export function ConsentGate({ onAccept }: { onAccept: () => void }) {
  const { t } = useLang();
  const [checked, setChecked] = useState(false);
  const id = useId();

  const items = [
    { icon: Cpu, text: t("consent.voice.local") },
    { icon: DatabaseZap, text: t("consent.voice.not_stored") },
    { icon: ShieldCheck, text: t("consent.voice.results") },
    { icon: Mic, text: t("consent.voice.mic") },
  ];

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-600" />
          <h2 className="text-lg font-semibold">{t("consent.title")}</h2>
        </div>

        <ul className="space-y-3">
          {items.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex gap-3 text-sm leading-6 text-muted-foreground">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox id={id} checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} className="mt-0.5" />
          <label htmlFor={id} className="cursor-pointer text-sm leading-5">
            {t("consent.accept_prefix")}{" "}
            <Link to="/legal/terminos" target="_blank" rel="noopener" className="font-medium underline hover:text-primary">
              {t("consent.terms_link")}
            </Link>{" "}
            {t("consent.and")}{" "}
            <Link to="/legal/privacidad" target="_blank" rel="noopener" className="font-medium underline hover:text-primary">
              {t("consent.privacy_link")}
            </Link>
            .
          </label>
        </div>

        <Button className="w-full" size="lg" disabled={!checked} onClick={onAccept}>
          {t("consent.accept_button")}
        </Button>
      </CardContent>
    </Card>
  );
}
