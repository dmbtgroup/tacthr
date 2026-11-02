import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/message";
import { roleName } from "@/lib/roles";
import { Flash } from "@/components/Flash";

async function changePassword(form: FormData) {
  "use server";
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const u = await db.user.findUnique({ where: { id: user.id } });
  if (!u || !(await bcrypt.compare(current, u.passwordHash)))
    redirect(`/account?error=${encodeURIComponent(msg("Your current password isn't right."))}`);
  if (next.length < 8) redirect(`/account?error=${encodeURIComponent(msg("Passwords need at least 8 characters."))}`);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  redirect(`/account?notice=${encodeURIComponent(msg("Password changed."))}`);
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser();
  const t = await getT();
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">{t("My account")}</h1>
      <Flash {...await searchParams} />
      <div className="card space-y-1 text-sm">
        <p className="font-medium">{user.name}</p>
        <p className="text-slate-500" dir="ltr">{user.email}</p>
        <p className="text-slate-500">{roleName(t, user.role)}</p>
      </div>
      <form action={changePassword} className="card space-y-3">
        <h2 className="font-semibold">{t("Change password")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("Current password")}</label>
            <input className="input" name="current" type="password" autoComplete="current-password" dir="ltr" required />
          </div>
          <div>
            <label className="label">{t("New password")}</label>
            <input className="input" name="next" type="password" minLength={8} autoComplete="new-password" dir="ltr" required />
          </div>
        </div>
        <button className="btn-primary" type="submit">{t("Save")}</button>
      </form>
    </div>
  );
}
