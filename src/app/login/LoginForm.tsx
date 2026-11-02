import Link from "next/link";
import { login } from "./actions";
import { getT } from "@/lib/i18n/server";
import { LangSwitch } from "@/components/LangSwitch";

/** Sign-in card; with `company` it is that company's own sign-in page. */
export async function LoginForm({ error, company }: { error?: string; company?: { slug: string; name: string } }) {
  const t = await getT();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 py-8">
      <div className="flex w-full max-w-sm items-center justify-between">
        <Link href="/" className="text-sm text-slate-600 hover:text-brand-700">
          <span aria-hidden className="inline-block rtl:rotate-180">←</span> TactHR
        </Link>
        <LangSwitch />
      </div>
      <form action={login} className="card w-full max-w-sm space-y-4">
        {company && <input type="hidden" name="company" value={company.slug} />}
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand-500">TactHR</p>
          <h1 className="text-xl font-semibold">{company ? company.name : t("Platform sign in")}</h1>
          {!company && (
            <p className="text-sm text-slate-500">
              {t("For DMBT platform admins. Company users sign in at their company's address.")}
            </p>
          )}
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error === "suspended" ? t("This company's account is suspended.") : t("Invalid email or password.")}
          </p>
        )}
        <div>
          <label className="label" htmlFor="email">{t("Email")}</label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" dir="ltr" required />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("Password")}</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required />
        </div>
        <button className="btn-primary w-full" type="submit">{t("Sign in")}</button>
      </form>
    </main>
  );
}
