import Link from "next/link";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { dateToJalali, formatDate, today } from "@/lib/dates";
import { num, rials, year } from "@/lib/format";
import { computeRecord, lastYearPerformance } from "@/lib/salaries";
import { Flash } from "@/components/Flash";
import { Modal } from "@/components/Modal";
import { openYear } from "./actions";

/** The salary years, newest first, with their payroll and how many salaries the board approved. */
export default async function SalariesPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser(canManage);
  const t = await getT();
  const years = await db.salaryYear.findMany({
    where: { organizationId: user.org.id },
    orderBy: { year: "desc" },
    include: { records: true },
  });
  const staff = await db.employee.count({ where: { organizationId: user.org.id, active: true } });
  const cards = await Promise.all(
    years.map(async (y) => {
      const perf = await lastYearPerformance(user.org.id, y.year);
      const results = y.records.map((r) => computeRecord(r, y, perf.get(r.employeeId) ?? null));
      return {
        y,
        payroll: results.reduce((s, r) => s + (r.salary ?? 0n), 0n),
        bonuses: results.reduce((s, r) => s + r.bonus, 0n),
        approved: y.records.filter((r) => r.approvedAt).length,
        aboveMax: results.filter((r) => r.aboveMax).length,
      };
    }),
  );
  const thisYear = dateToJalali(today()).jy;
  const nextYear = years.length ? Math.max(thisYear, years[0].year + 1) : thisYear;
  const last = years[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-2xl font-semibold">{t("Salaries and bonus")}</h1>
        <Modal buttonLabel={`+ ${t("Open a salary year")}`} title={t("Open a salary year")}>
          <form action={openYear} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t("Year")}</label>
                <input className="input" name="year" inputMode="numeric" defaultValue={nextYear} dir="ltr" required />
              </div>
              <div>
                <label className="label">{t("Bonus base (rials)")}</label>
                <input className="input" name="bonusBase" inputMode="numeric" defaultValue={last?.bonusBase.toString() ?? ""} dir="ltr" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t("Minimum wage (labour office, rials)")}</label>
                <input className="input" name="minWage" inputMode="numeric" defaultValue={last?.minWage.toString() ?? ""} dir="ltr" required />
              </div>
              <div>
                <label className="label">{t("Maximum salary (rials)")}</label>
                <input className="input" name="maxSalary" inputMode="numeric" defaultValue={last?.maxSalary.toString() ?? ""} dir="ltr" required />
              </div>
            </div>
            {last && <p className="text-sm text-slate-600">{t("Everyone's factors are copied from {year}, with one more year of experience.", { year: year(t, last.year) })}</p>}
            <button className="btn-primary" type="submit">{t("Open")}</button>
          </form>
        </Modal>
      </div>
      <Flash {...await searchParams} />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ y, payroll, bonuses, approved, aboveMax }) => {
          const late = !y.closed && y.deadline < today() && approved < staff;
          return (
            <Link key={y.id} href={`/salaries/${y.id}`} className="card space-y-2 hover:shadow-md">
              <div className="flex items-center gap-2">
                <h2 className="me-auto text-lg font-semibold">{t("Salaries {year}", { year: year(t, y.year) })}</h2>
                {y.closed && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t("Closed")}</span>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${staff ? Math.min(100, (approved / staff) * 100) : 0}%` }} />
              </div>
              <p className="text-sm text-slate-600">{t("{approved} of {total} approved", { approved: num(t, approved), total: num(t, staff) })}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-500">{t("Total of salaries")}</dt>
                <dd className="text-end font-medium">{rials(t, payroll)}</dd>
                <dt className="text-slate-500">{t("Bonuses")}</dt>
                <dd className="text-end font-medium">{rials(t, bonuses)}</dd>
              </dl>
              {aboveMax > 0 && <p className="text-sm text-amber-800">{t("{n} above the maximum salary", { n: num(t, aboveMax) })}</p>}
              <p className={`text-xs ${late ? "font-medium text-red-700" : "text-slate-500"}`}>
                {late ? t("Was due {date}", { date: formatDate(y.deadline, t.locale) }) : t("Due {date}", { date: formatDate(y.deadline, t.locale) })}
              </p>
            </Link>
          );
        })}
        {cards.length === 0 && <p className="text-slate-500">{t("No salary year has been opened yet.")}</p>}
      </div>
    </div>
  );
}
