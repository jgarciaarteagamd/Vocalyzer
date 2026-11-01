import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState({ first_name: "", last_name: "", license_number: "" });
  const [saving, setSaving] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    supabase
      .from("doctor_profiles")
      .select("first_name,last_name,license_number")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setProfile({
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            license_number: data.license_number ?? "",
          });
      });
  }, [user.id]);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase.from("doctor_profiles").upsert({ id: user.id, ...profile });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(t("settings.saved"));
  }

  async function changePassword() {
    if (newPass.length < 8) return toast.error(t("auth.pass_short"));
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error(error.message);
    else {
      toast.success(t("settings.pass_ok"));
      setNewPass("");
    }
  }

  async function deleteAccount() {
    if (confirm !== "DELETE") return;
    await supabase.from("voice_results").delete().eq("doctor_id", user.id);
    await supabase.from("doctor_profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    toast.success(t("settings.deleted"));
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profile")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("auth.first_name")}</Label>
              <Input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.last_name")}</Label>
              <Input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.license")}</Label>
              <Input value={profile.license_number} onChange={(e) => setProfile({ ...profile, license_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.email")}</Label>
              <Input value={user.email ?? ""} disabled readOnly />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={saveProfile} disabled={saving}>
                {t("settings.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.language")}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant={lang === "es" ? "default" : "outline"} size="sm" onClick={() => setLang("es")}>
              Español
            </Button>
            <Button variant={lang === "en" ? "default" : "outline"} size="sm" onClick={() => setLang("en")}>
              English
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.password")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder={t("settings.new_password")}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              autoComplete="new-password"
            />
            <Button onClick={changePassword}>{t("settings.change_pass")}</Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t("settings.danger")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("settings.delete_warn")}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">{t("settings.delete")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.delete_title")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("settings.delete_desc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <Input placeholder="DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirm("")}>{t("settings.cancel")}</AlertDialogCancel>
                  <AlertDialogAction disabled={confirm !== "DELETE"} onClick={deleteAccount}>
                    {t("settings.confirm_delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
