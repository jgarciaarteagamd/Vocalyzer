import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Brand } from "@/components/Brand";
import { LanguageToggle } from "@/components/LanguageToggle";

export function PublicHeader({ suffix, right, linkHome = true }: { suffix?: string; right?: ReactNode; linkHome?: boolean }) {
  return (
    <header className="border-b bg-background print:hidden">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
        {linkHome ? (
          <Link to="/">
            <Brand suffix={suffix} />
          </Link>
        ) : (
          <Brand suffix={suffix} />
        )}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {right}
        </div>
      </div>
    </header>
  );
}
