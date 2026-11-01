import type { QueryClient } from "@tanstack/react-query";
import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { CookieBanner } from "@/components/CookieBanner";
import { useLang } from "@/lib/i18n";

function NotFound() {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("notfound.title")}</h2>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("notfound.home")}
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <Outlet />
      <CookieBanner />
    </>
  ),
  notFoundComponent: NotFound,
});
