import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { AppFooter } from "@/components/AppFooter";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: () => (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <AppFooter />
    </div>
  ),
});
