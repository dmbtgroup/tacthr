import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { LangSwitch } from "@/components/LangSwitch";
import { db } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/session";

async function findCompany(form: FormData) {
  "use server";
  const q = String(form.get("q") ?? "").trim().toLowerCase();
  if (SLUG_PATTERN.test(q)) {
    const org = await db.organization.findUnique({ where: { slug: q }, select: { slug: true } });
    if (org) redirect(`/${org.slug}`);
  }
  const byName = q
    ? await db.organization.findMany({ where: { name: { contains: q, mode: "insensitive" }, active: true }, select: { slug: true }, take: 2 })
    : [];
  if (byName.length === 1) redirect(`/${byName[0].slug}`);
  redirect("/?notfound=1");
}

/** Public introduction with "Find your company". */
export default async function Home({ searchParams }: { searchParams: Promise<{ notfound?: string }> }) {
  const t = await getT();
  const user = await getCurrentUser();
  const { notfound } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-4">
        <span className="text-xl font-bold text-brand-500">TactHR</span>
        <span className="ms-auto" />
        <LangSwitch />
        {user ? (
          <Link className="btn-primary" href={user.isPlatformAdmin ? "/platform" : "/home"}>{t("Open the app")}</Link>
        ) : null}
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-10">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">
            {t("Fair, clear performance reviews and pay.")}
          </h1>
          <p className="text-lg text-slate-600">
            {t("Score your staff twice a year on weighted factors, then set each salary and bonus from education, experience, skill, job difficulty, job grade and performance.")}
          </p>
        </div>
        <form action={findCompany} className="card max-w-md space-y-3">
          <label className="label" htmlFor="q">{t("Find your company")}</label>
          <div className="flex gap-2">
            <input className="input" id="q" name="q" placeholder={t("Company name or address")} required />
            <button className="btn-primary shrink-0" type="submit">{t("Go")}</button>
          </div>
          {notfound && <p className="text-sm text-red-700">{t("No company found. Check the name or address.")}</p>}
        </form>
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-slate-500">
        <Link href="/login" className="hover:text-brand-700">{t("Platform login")}</Link>
        <span className="mx-2">·</span>
        <a href="mailto:support@dmbtgroup.com" dir="ltr">support@dmbtgroup.com</a>
      </footer>
    </div>
  );
}
