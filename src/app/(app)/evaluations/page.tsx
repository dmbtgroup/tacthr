import Link from "next/link";
import { db } from "@/lib/db";
import { canManage, canScore, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { dateToJalali, formatDate, halfRange, today } from "@/lib/dates";
import { num, periodLabel } from "@/lib/format";
import { teamOf } from "@/lib/evaluations";
import { Flash } from "@/components/Flash";
import { Modal } from "@/components/Modal";
import { openHalf } from "./actions";

/** The half-years, newest first, with how far each has got. */
export default async function EvaluationsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser(canScore);
  const t = await getT();
  const manage = canManage(user);
  const team = manage ? null : await teamOf(user.org.id, user.employeeId);
  const periods = await db.period.findMany({
    where: { organizationId: user.org.id },
    orderBy: [{ year: "desc" }, { half: "desc" }],
    include: { evaluations: { select: { status: true, employeeId: true } } },
  });

  // Half-years that have started and aren't open yet: this year's and last year's.
  const now = today();
  const y = dateToJalali(now).jy;
  const open = new Set(periods.map((p) => `${p.year}-${p.half}`));
  const choices = [y, y - 1]
    .flatMap((yy) => [2, 1].map((h) => ({ year: yy, half: h })))
    .filter((c) => halfRange(c.year, c.half as 1 | 2).start <= now && !open.has(`${c.year}-${c.half}`));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-2xl font-semibold">{t("Evaluations")}</h1>
        {manage && choices.length > 0 && (
          <Modal buttonLabel={`+ ${t("Open a half-year")}`} title={t("Open a half-year")}>
            <form action={openHalf} className="space-y-3">
              <div>
                <label className="label">{t("Half-year")}</label>
                <select className="input" name="period">
                  {choices.map((c) => (
                    <option key={`${c.year}-${c.half}`} value={`${c.year}-${c.half}`}>{periodLabel(t, c.year, c.half)}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" type="submit">{t("Open")}</button>
            </form>
          </Modal>
        )}
      </div>
      <Flash {...await searchParams} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {periods.map((p) => {
          const evs = team ? p.evaluations.filter((e) => team.has(e.employeeId)) : p.evaluations;
          const approved = evs.filter((e) => e.status === "APPROVED").length;
          const waiting = evs.filter((e) => e.status === "SUBMITTED" || e.status === "MANAGER_APPROVED").length;
          const share = evs.length ? (approved / evs.length) * 100 : 0;
          return (
            <Link key={p.id} href={`/evaluations/${p.id}`} className="card space-y-2 hover:shadow-md">
              <div className="flex items-center gap-2">
                <h2 className="me-auto font-semibold">{periodLabel(t, p.year, p.half)}</h2>
                {p.closed && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t("Closed")}</span>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${share}%` }} />
              </div>
              <p className="text-sm text-slate-600">
                {t("{approved} of {total} approved, {waiting} waiting", { approved: num(t, approved), total: num(t, evs.length), waiting: num(t, waiting) })}
              </p>
              <p className="text-xs text-slate-500">{t("Due {date}", { date: formatDate(p.deadline, t.locale) })}</p>
            </Link>
          );
        })}
        {periods.length === 0 && <p className="text-slate-500">{t("No half-year has been opened yet.")}</p>}
      </div>
    </div>
  );
}
