import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canManage, isBoard, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { formatDate, today } from "@/lib/dates";
import { num, pct, rials, year } from "@/lib/format";
import { computeRecord, lastYearPerformance } from "@/lib/salaries";
import { Flash } from "@/components/Flash";
import { Modal } from "@/components/Modal";
import { EditIcon } from "@/components/EditIcon";
import { approveAllRecords, saveFigures, setYearClosed } from "../actions";

type Filter = "" | "missing" | "waiting" | "approved" | "above";

/** One salary year: the figures, then every person's factors, salary and bonus. */
export default async function SalaryYearPage({
  params,
  searchParams,
}: {
  params: Promise<{ yearId: string }>;
  searchParams: Promise<{ error?: string; notice?: string; dept?: string; show?: Filter }>;
}) {
  const user = await requireUser(canManage);
  const t = await getT();
  const sp = await searchParams;
  const { yearId } = await params;
  const sy = await db.salaryYear.findFirst({ where: { id: yearId, organizationId: user.org.id }, include: { records: true } });
  if (!sy) notFound();
  const [staff, departments, perf] = await Promise.all([
    db.employee.findMany({
      where: { organizationId: user.org.id, OR: [{ active: true }, { salaries: { some: { salaryYearId: sy.id } } }] },
      include: { department: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.department.findMany({ where: { organizationId: user.org.id }, orderBy: { name: "asc" } }),
    lastYearPerformance(user.org.id, sy.year),
  ]);
  const byEmp = new Map(sy.records.map((r) => [r.employeeId, r]));
  const rows = staff.map((e) => {
    const r = byEmp.get(e.id) ?? null;
    const res = computeRecord(r, sy, perf.get(e.id) ?? null);
    const state: Filter = !r || res.salary == null ? "missing" : r.approvedAt ? "approved" : "waiting";
    return { e, r, res, state, yearly: perf.get(e.id) ?? null };
  });
  const shown = rows.filter(
    (x) =>
      (!sp.dept || x.e.departmentId === sp.dept) &&
      (!sp.show || (sp.show === "above" ? x.res.aboveMax : x.state === sp.show)),
  );
  const count = (f: Filter) => rows.filter((x) => (f === "above" ? x.res.aboveMax : x.state === f)).length;
  const totalSalary = shown.reduce((s, x) => s + (x.res.salary ?? 0n), 0n);
  const totalBonus = shown.reduce((s, x) => s + x.res.bonus, 0n);
  const A = sy.maxSalary - sy.minWage;
  const board = isBoard(user);
  const ready = rows.filter((x) => x.state === "waiting").length;
  const late = !sy.closed && sy.deadline < today() && count("approved") < rows.length;
  const filters: { f: Filter; label: string }[] = [
    { f: "missing", label: t("Not complete") },
    { f: "waiting", label: t("Waiting for board") },
    { f: "approved", label: t("Approved") },
    { f: "above", label: t("Above the maximum") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="me-auto">
          <Link href="/salaries" className="text-sm text-slate-500 hover:text-brand-700">
            <span className="inline-block rtl:rotate-180" aria-hidden>←</span> {t("Salaries and bonus")}
          </Link>
          <h1 className="text-2xl font-semibold">{t("Salaries {year}", { year: year(t, sy.year) })}</h1>
          <p className={`text-sm ${late ? "font-medium text-red-700" : "text-slate-500"}`}>
            {late ? t("Was due {date}", { date: formatDate(sy.deadline, t.locale) }) : t("Due {date}", { date: formatDate(sy.deadline, t.locale) })}
            {sy.closed && ` · ${t("Closed")}`}
          </p>
        </div>
        {board && ready > 0 && !sy.closed && (
          <form action={approveAllRecords}>
            <input type="hidden" name="id" value={sy.id} />
            <button className="btn-success" type="submit">{t("Approve all {n} complete salaries", { n: num(t, ready) })}</button>
          </form>
        )}
        {board && (
          <form action={setYearClosed}>
            <input type="hidden" name="id" value={sy.id} />
            <input type="hidden" name="closed" value={sy.closed ? "0" : "1"} />
            <button className="btn-secondary" type="submit">{sy.closed ? t("Reopen") : t("Close the year")}</button>
          </form>
        )}
      </div>
      <Flash error={sp.error} notice={sp.notice} />

      <section className="card">
        <div className="flex flex-wrap items-start gap-6">
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">{t("Minimum wage")}</dt>
              <dd className="font-semibold">{rials(t, sy.minWage)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t("Maximum salary")}</dt>
              <dd className="font-semibold">{rials(t, sy.maxSalary)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t("Amount above the minimum (A)")}</dt>
              <dd className="font-semibold">{rials(t, A)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t("Bonus base")}</dt>
              <dd className="font-semibold">{rials(t, sy.bonusBase)}</dd>
            </div>
          </dl>
          {!sy.closed && (
            <Modal
              buttonLabel={<EditIcon />}
              buttonAriaLabel={t("Edit")}
              buttonClassName="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title={t("Figures for {year}", { year: year(t, sy.year) })}
            >
              <form action={saveFigures} className="space-y-3">
                <input type="hidden" name="id" value={sy.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">{t("Minimum wage (rials)")}</label>
                    <input className="input" name="minWage" inputMode="numeric" defaultValue={sy.minWage.toString()} dir="ltr" required />
                  </div>
                  <div>
                    <label className="label">{t("Maximum salary (rials)")}</label>
                    <input className="input" name="maxSalary" inputMode="numeric" defaultValue={sy.maxSalary.toString()} dir="ltr" required />
                  </div>
                  <div>
                    <label className="label">{t("Bonus base (rials)")}</label>
                    <input className="input" name="bonusBase" inputMode="numeric" defaultValue={sy.bonusBase.toString()} dir="ltr" />
                  </div>
                </div>
                <p className="text-sm text-slate-600">{t("Changing the figures changes every salary; the board approves them again.")}</p>
                <button className="btn-primary" type="submit">{t("Save")}</button>
              </form>
            </Modal>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {filters.map(({ f, label }) => (
          <Link
            key={f}
            href={`?show=${sp.show === f ? "" : f}${sp.dept ? `&dept=${sp.dept}` : ""}`}
            className={`card py-3 hover:shadow-md ${sp.show === f ? "ring-2 ring-brand-500" : ""}`}
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-2xl font-semibold ${f === "above" && count(f) ? "text-amber-700" : ""}`}>{num(t, count(f))}</p>
          </Link>
        ))}
      </div>

      {departments.length > 1 && (
        <form className="flex flex-wrap items-end gap-3">
          {sp.show && <input type="hidden" name="show" value={sp.show} />}
          <div>
            <label className="label">{t("Department")}</label>
            <select className="input" name="dept" defaultValue={sp.dept ?? ""}>
              <option value="">{t("All")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" type="submit">{t("Show")}</button>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="table table-stack">
          <thead>
            <tr>
              <th className="ps-4">{t("Name")}</th>
              <th className="text-end">{t("Education")}</th>
              <th className="text-end">{t("Experience")}</th>
              <th className="text-end">{t("Skill")}</th>
              <th className="text-end">{t("Difficulty")}</th>
              <th className="text-end">{t("Job grade")}</th>
              <th className="text-end">{t("Performance")}</th>
              <th className="text-end">{t("CEO")}</th>
              <th className="text-end">{t("Total")}</th>
              <th className="text-end">{t("Salary")}</th>
              <th className="text-end">{t("Bonus")}</th>
              <th>{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ e, r, res, state }) => (
              <tr key={e.id} className={e.active ? "" : "text-slate-400"}>
                <td data-label={t("Name")} className="ps-4">
                  <Link className="font-medium text-brand-700 hover:underline" href={`/salaries/${sy.id}/${e.id}`}>
                    {e.firstName} {e.lastName}
                  </Link>
                  <p className="text-xs text-slate-500">{[e.jobTitle, e.department?.name].filter(Boolean).join(" · ")}</p>
                </td>
                <td data-label={t("Education")} className="text-end">{pct(t, res.parts.education)}</td>
                <td data-label={t("Experience")} className="text-end">{pct(t, res.parts.experience)}</td>
                <td data-label={t("Skill")} className="text-end">{pct(t, res.parts.skill)}</td>
                <td data-label={t("Difficulty")} className="text-end">{pct(t, res.parts.difficulty)}</td>
                <td data-label={t("Job grade")} className="text-end">{pct(t, res.parts.grade)}</td>
                <td data-label={t("Performance")} className="text-end">{r ? pct(t, res.parts.performance) : ""}</td>
                <td data-label={t("CEO")} className="text-end">{r ? pct(t, res.parts.ceo) : ""}</td>
                <td data-label={t("Total")} className="text-end font-medium">{r?.probation ? t("Probation") : pct(t, res.totalPct)}</td>
                <td data-label={t("Salary")} className={`whitespace-nowrap text-end font-medium ${res.aboveMax ? "text-amber-700" : ""}`}>
                  {rials(t, res.salary)} {res.aboveMax && <span title={t("Above the maximum")}>⚠</span>}
                </td>
                <td data-label={t("Bonus")} className="whitespace-nowrap text-end">{r ? rials(t, res.bonus) : ""}</td>
                <td data-label={t("Status")}>
                  <span
                    className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
                      state === "approved" ? "bg-emerald-50 text-emerald-800" : state === "waiting" ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {state === "approved" ? t("Approved") : state === "waiting" ? t("Waiting for board") : t("Not complete")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="ps-4 pt-3" colSpan={9}>{t("Total ({n} people)", { n: num(t, shown.length) })}</td>
              <td className="whitespace-nowrap pt-3 text-end">{rials(t, totalSalary)}</td>
              <td className="whitespace-nowrap pt-3 text-end">{rials(t, totalBonus)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
