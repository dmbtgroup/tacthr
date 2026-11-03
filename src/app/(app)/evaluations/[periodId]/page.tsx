import Link from "next/link";
import { notFound } from "next/navigation";
import type { EvalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { canManage, canScore, isBoard, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { formatDate, today } from "@/lib/dates";
import { num, periodLabel } from "@/lib/format";
import { teamOf } from "@/lib/evaluations";
import { Flash } from "@/components/Flash";
import { ScorePct, StatusBadge, statusName } from "@/components/Score";
import { addNewPeople, boardApproveAll, setClosed } from "../actions";

const STATUSES: EvalStatus[] = ["DRAFT", "SUBMITTED", "MANAGER_APPROVED", "APPROVED"];

export default async function PeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ periodId: string }>;
  searchParams: Promise<{ error?: string; notice?: string; dept?: string; status?: string }>;
}) {
  const user = await requireUser(canScore);
  const t = await getT();
  const sp = await searchParams;
  const { periodId } = await params;
  const period = await db.period.findFirst({
    where: { id: periodId, organizationId: user.org.id },
    include: {
      evaluations: {
        include: { employee: { include: { department: true, manager: true } } },
        orderBy: [{ employee: { lastName: "asc" } }, { employee: { firstName: "asc" } }],
      },
    },
  });
  if (!period) notFound();
  const manage = canManage(user);
  const team = manage ? null : await teamOf(user.org.id, user.employeeId);
  const mine = team ? period.evaluations.filter((e) => team.has(e.employeeId)) : period.evaluations;
  const shown = mine.filter((e) => (!sp.dept || e.employee.departmentId === sp.dept) && (!sp.status || e.status === sp.status));
  const departments = [...new Map(mine.filter((e) => e.employee.department).map((e) => [e.employee.department!.id, e.employee.department!])).values()].sort(
    (a, b) => a.name.localeCompare(b.name, "fa"),
  );
  const count = (s: EvalStatus) => mine.filter((e) => e.status === s).length;
  const late = !period.closed && period.deadline < today() && count("APPROVED") < mine.length;
  const outOf = period.method === "CURRENT" ? 100 : 650;
  const readyForBoard = isBoard(user) ? mine.filter((e) => e.status === "MANAGER_APPROVED" && e.employeeId !== user.employeeId).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="me-auto">
          <Link href="/evaluations" className="text-sm text-slate-500 hover:text-brand-700">
            <span className="inline-block rtl:rotate-180" aria-hidden>←</span> {t("Evaluations")}
          </Link>
          <h1 className="text-2xl font-semibold">{periodLabel(t, period.year, period.half)}</h1>
          <p className={`text-sm ${late ? "font-medium text-red-700" : "text-slate-500"}`}>
            {late ? t("Was due {date}", { date: formatDate(period.deadline, t.locale) }) : t("Due {date}", { date: formatDate(period.deadline, t.locale) })}
            {period.closed && ` · ${t("Closed")}`}
          </p>
        </div>
        {readyForBoard > 0 && !period.closed && (
          <form action={boardApproveAll}>
            <input type="hidden" name="periodId" value={period.id} />
            <button className="btn-success" type="submit">{t("Approve all {n} waiting for board", { n: num(t, readyForBoard) })}</button>
          </form>
        )}
        {manage && !period.closed && (
          <form action={addNewPeople}>
            <input type="hidden" name="periodId" value={period.id} />
            <button className="btn-secondary" type="submit">{t("Add new staff")}</button>
          </form>
        )}
        {manage && (
          <form action={setClosed}>
            <input type="hidden" name="periodId" value={period.id} />
            <input type="hidden" name="closed" value={period.closed ? "0" : "1"} />
            <button className="btn-secondary" type="submit">{period.closed ? t("Reopen") : t("Close half-year")}</button>
          </form>
        )}
      </div>
      <Flash error={sp.error} notice={sp.notice} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`?status=${sp.status === s ? "" : s}${sp.dept ? `&dept=${sp.dept}` : ""}`}
            className={`card py-3 hover:shadow-md ${sp.status === s ? "ring-2 ring-brand-500" : ""}`}
          >
            <p className="text-xs text-slate-500">{statusName(t, s)}</p>
            <p className="text-2xl font-semibold">{num(t, count(s))}</p>
          </Link>
        ))}
      </div>

      {departments.length > 1 && (
        <form className="flex flex-wrap items-end gap-3">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
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
              <th>{t("Department")}</th>
              <th>{t("Supervisor")}</th>
              <th className="text-end">{t("Efficiency")}</th>
              <th className="text-end">{t("Effectiveness")}</th>
              <th className="text-end">{t("Score (of {max})", { max: num(t, outOf) })}</th>
              <th className="text-end">{t("Percent")}</th>
              <th>{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td data-label={t("Name")} className="ps-4 font-medium">
                  <Link className="text-brand-700 hover:underline" href={`/evaluations/${period.id}/${e.employeeId}`}>
                    {e.employee.firstName} {e.employee.lastName}
                  </Link>
                </td>
                <td data-label={t("Department")}>{e.employee.department?.name}</td>
                <td data-label={t("Supervisor")}>{e.employee.manager && `${e.employee.manager.firstName} ${e.employee.manager.lastName}`}</td>
                <td data-label={t("Efficiency")} className="text-end">{num(t, e.efficiency)}</td>
                <td data-label={t("Effectiveness")} className="text-end">{num(t, e.effectiveness)}</td>
                <td data-label={t("Score (of {max})", { max: num(t, outOf) })} className="text-end">{num(t, e.total)}</td>
                <td data-label={t("Percent")} className="text-end"><ScorePct t={t} value={e.percent} /></td>
                <td data-label={t("Status")}><StatusBadge t={t} status={e.status} /></td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="ps-4 text-slate-500">{t("No one to show.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
