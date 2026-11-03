import Link from "next/link";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n";
import { Flash } from "@/components/Flash";
import { Modal } from "@/components/Modal";
import { EditIcon } from "@/components/EditIcon";
import { TrashIcon } from "@/components/TrashIcon";
import { LangSwitch } from "@/components/LangSwitch";
import { logout } from "../login/actions";
import { addAdmin, addCompany, deleteCompany, demoData, editCompany, reloadDemo, removeAdmin } from "./actions";

type Company = { id: string; name: string; slug: string; method: string; languages: string[]; active: boolean };

function CompanyFields({ t, c }: { t: T; c?: Company }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("Company name")}</label>
          <input className="input" name="name" defaultValue={c?.name} required />
        </div>
        <div>
          <label className="label">{t("Address")}</label>
          <div className="flex items-center gap-1" dir="ltr">
            <span className="shrink-0 text-sm text-slate-500">tacthr.dmbtgroup.com/</span>
            <input className="input" name="slug" defaultValue={c?.slug} pattern="[a-z0-9][a-z0-9\-]{0,39}" required />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("Evaluation method")}</label>
          <select className="input" name="method" defaultValue={c?.method ?? "CURRENT"}>
            <option value="CURRENT">{t("Shared factors, out of 100")}</option>
            <option value="DEPARTMENT">{t("Shared and department factors, out of 650")}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("Languages")}</label>
          <div className="flex gap-4 py-2 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="lang_fa" defaultChecked={!c || c.languages.includes("fa")} /> فارسی
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="lang_en" defaultChecked={!c || c.languages.includes("en")} /> English
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function PlatformPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requirePlatformAdmin();
  const t = await getT();
  const [companies, admins] = await Promise.all([
    db.organization.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { employees: true, users: true } } } }),
    db.user.findMany({ where: { isPlatformAdmin: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center gap-3">
        <span className="text-xl font-bold text-brand-500">TactHR</span>
        <h1 className="text-xl font-semibold">{t("Platform")}</h1>
        <span className="ms-auto text-sm text-slate-500">{me.name}</span>
        <LangSwitch />
        <form action={logout}>
          <button className="btn-secondary" type="submit">{t("Sign out")}</button>
        </form>
      </header>
      <Flash {...await searchParams} />

      <section className="card space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="me-auto text-lg font-semibold">{t("Companies")}</h2>
          <Modal buttonLabel={`+ ${t("New company")}`} title={t("New company")}>
            <form action={addCompany} className="space-y-3">
              <CompanyFields t={t} />
              <p className="pt-2 text-sm font-medium text-slate-700">{t("First user (HR)")}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">{t("Name")}</label>
                  <input className="input" name="adminName" required />
                </div>
                <div>
                  <label className="label">{t("Email")}</label>
                  <input className="input" name="adminEmail" type="email" dir="ltr" required />
                </div>
                <div>
                  <label className="label">{t("Password")}</label>
                  <input className="input" name="adminPassword" type="password" minLength={8} dir="ltr" required />
                </div>
              </div>
              <button className="btn-primary" type="submit">{t("Create")}</button>
            </form>
          </Modal>
        </div>
        <table className="table table-stack">
          <thead>
            <tr>
              <th>{t("Company")}</th>
              <th>{t("Address")}</th>
              <th>{t("Method")}</th>
              <th>{t("Staff")}</th>
              <th>{t("Users")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className={c.active ? "" : "text-slate-400"}>
                <td data-label={t("Company")}>
                  {c.name} {!c.active && <span className="text-xs">({t("suspended")})</span>}
                </td>
                <td data-label={t("Address")} dir="ltr" className="text-start">
                  <Link className="text-brand-700 hover:underline" href={`/${c.slug}`}>/{c.slug}</Link>
                </td>
                <td data-label={t("Method")}>{c.method === "CURRENT" ? t("Out of 100") : t("Out of 650")}</td>
                <td data-label={t("Staff")}>{c._count.employees}</td>
                <td data-label={t("Users")}>{c._count.users}</td>
                <td className="whitespace-nowrap text-end">
                  <div className="inline-flex items-center gap-1">
                    {c._count.employees === 0 ? (
                      <form action={demoData}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="btn-secondary px-2 py-1 text-xs" type="submit">{t("Load demo data")}</button>
                      </form>
                    ) : (
                      <Modal buttonLabel={t("Reload demo data")} buttonClassName="btn-secondary px-2 py-1 text-xs" title={t("Reload demo data")}>
                        <form action={reloadDemo} className="space-y-3 text-start">
                          <input type="hidden" name="id" value={c.id} />
                          <p className="text-sm text-slate-600">
                            {t("Replaces this company's staff, departments, staff sign-ins, factors and evaluations with made-up demo data. Type its name to confirm.")}
                          </p>
                          <input className="input" name="confirm" placeholder={c.name} required />
                          <button className="btn-danger" type="submit">{t("Reload demo data")}</button>
                        </form>
                      </Modal>
                    )}
                    <Modal
                      buttonLabel={<EditIcon />}
                      buttonAriaLabel={t("Edit")}
                      buttonClassName="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title={t("Edit company")}
                    >
                      <form action={editCompany} className="space-y-3 text-start">
                        <input type="hidden" name="id" value={c.id} />
                        <CompanyFields t={t} c={c} />
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="active" defaultChecked={c.active} /> {t("Active (users can sign in)")}
                        </label>
                        <button className="btn-primary" type="submit">{t("Save")}</button>
                      </form>
                    </Modal>
                    <Modal
                      buttonLabel={<TrashIcon />}
                      buttonAriaLabel={t("Delete")}
                      buttonClassName="rounded p-1.5 text-red-600 hover:bg-red-50"
                      title={t("Delete {name}", { name: c.name })}
                    >
                      <form action={deleteCompany} className="space-y-3 text-start">
                        <input type="hidden" name="id" value={c.id} />
                        <p className="text-sm text-slate-600">
                          {t("This deletes the company and all its staff, scores and salaries for good. Type its name to confirm.")}
                        </p>
                        <input className="input" name="confirm" placeholder={c.name} required />
                        <button className="btn-danger" type="submit">{t("Delete")}</button>
                      </form>
                    </Modal>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="text-slate-500">{t("No companies yet.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="me-auto text-lg font-semibold">{t("Platform admins")}</h2>
          <Modal buttonLabel={`+ ${t("Add")}`} buttonClassName="btn-secondary" title={t("New platform admin")}>
            <form action={addAdmin} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">{t("Name")}</label>
                  <input className="input" name="name" required />
                </div>
                <div>
                  <label className="label">{t("Email")}</label>
                  <input className="input" name="email" type="email" dir="ltr" required />
                </div>
                <div>
                  <label className="label">{t("Password")}</label>
                  <input className="input" name="password" type="password" minLength={8} dir="ltr" required />
                </div>
              </div>
              <button className="btn-primary" type="submit">{t("Add")}</button>
            </form>
          </Modal>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <span>{a.name}</span>
              <span className="text-slate-500" dir="ltr">{a.email}</span>
              {a.id !== me.id && (
                <form action={removeAdmin} className="ms-auto">
                  <input type="hidden" name="id" value={a.id} />
                  <button className="rounded p-1.5 text-red-600 hover:bg-red-50" type="submit" aria-label={t("Delete")} title={t("Delete")}>
                    <TrashIcon />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
