import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManage, isBoard, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/message";
import { Flash } from "@/components/Flash";

async function saveSettings(form: FormData) {
  "use server";
  const user = await requireUser(canManage);
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect(`/settings?error=${encodeURIComponent(msg("Enter the company's name."))}`);
  const languages = ["fa", "en"].filter((l) => form.get(`lang_${l}`));
  const share = Number(form.get("efficiencyShare"));
  await db.organization.update({
    where: { id: user.org.id },
    data: {
      name,
      languages: languages.length ? languages : ["fa"],
      // The split between efficiency and effectiveness is the board's decision.
      ...(isBoard(user) && (share === 75 || share === 50) ? { efficiencyShare: share } : {}),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/settings?notice=${encodeURIComponent(msg("Settings saved."))}`);
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser(canManage);
  const t = await getT();
  const org = user.org;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("Settings")}</h1>
      <Flash {...await searchParams} />
      <form action={saveSettings} className="card space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("Company name")}</label>
            <input className="input" name="name" defaultValue={org.name} required />
          </div>
          <div>
            <label className="label">{t("Sign-in address")}</label>
            <p className="py-2 text-sm" dir="ltr">tacthr.dmbtgroup.com/{org.slug}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("Evaluation method")}</label>
            <p className="py-2 text-sm">
              {org.method === "CURRENT" ? t("Shared factors, out of 100") : t("Shared and department factors, out of 650")}
            </p>
          </div>
          {org.method === "CURRENT" && (
            <div>
              <label className="label">{t("Efficiency / effectiveness")}</label>
              <select className="input" name="efficiencyShare" defaultValue={org.efficiencyShare} disabled={!isBoard(user)}>
                <option value={75}>75 / 25</option>
                <option value={50}>50 / 50</option>
              </select>
            </div>
          )}
        </div>
        <div>
          <label className="label">{t("Languages")}</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="lang_fa" defaultChecked={org.languages.includes("fa")} /> فارسی
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="lang_en" defaultChecked={org.languages.includes("en")} /> English
            </label>
          </div>
        </div>
        <button className="btn-primary" type="submit">{t("Save")}</button>
      </form>
    </div>
  );
}
