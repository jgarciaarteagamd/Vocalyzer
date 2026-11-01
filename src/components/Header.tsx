import { Link, useNavigate } from "@tanstack/react-router";
import { Inbox, LayoutDashboard, LogOut, Mic, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Brand } from "@/components/Brand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n";

const NAV = [
  { to: "/panel", icon: LayoutDashboard, key: "nav.panel" },
  { to: "/evaluar", icon: Mic, key: "nav.evaluate" },
  { to: "/bandeja", icon: Inbox, key: "nav.inbox" },
  { to: "/configuracion", icon: Settings, key: "nav.settings" },
] as const;

export function Header() {
  const navigate = useNavigate();
  const { t } = useLang();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <header className="border-b bg-background print:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/panel">
          <Brand />
        </Link>
        <TooltipProvider delayDuration={200}>
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, icon: Icon, key }) => (
              <Tooltip key={to}>
                <TooltipTrigger asChild>
                  <Link
                    to={to}
                    aria-label={t(key)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    activeProps={{ className: "rounded-md p-2 bg-muted text-foreground" }}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>{t(key)}</TooltipContent>
              </Tooltip>
            ))}
            <LanguageToggle />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label={t("nav.logout")}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("nav.logout")}</TooltipContent>
            </Tooltip>
          </nav>
        </TooltipProvider>
      </div>
    </header>
  );
}
