import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canManage, canScore, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { daysBetween, formatDate, today } from "@/lib/dates";
import { num, periodLabel } from "@/lib/format";
import { mayBoardApprove, mayManagerApprove, mayScore, previousHalf, teamOf } from "@/lib/evaluations";
import { ScorePct } from "@/components/Score";

async function resolveAlert(form: FormData) {
  "use server";
  const user = await requireUser(canManage);
  await db.alert.updateMany({ where: { id: String(form.get("id")), organizationId: user.org.id }, data: { resolved: true } });
  revalidatePath("/home");
}

/** The start page: what's waiting for the user, the current half-year's progress, and alerts for HR. */
export default async function HomePage() {
  const user = await requireUser();
  const t = await getT();
  const orgId = user.org.id;
  const manage = canManage(user);
  const period = await db.period.findFirst({
    where: { organizationId: orgId, closed: false },
    orderBy: [{ year: "desc" }, { half: "desc" }],
    include: { evaluations: { include: { employee: { include: { manager: { select: { managerId: true } } } } } } },
  });
  const team = manage ? null : await teamOf(orgId, user.employeeId);
  const evs = period ? (team ? period.evaluations.filter((e) => team.has(e.employeeId)) : period.evaluations) : [];

  const toScore = evs.filter((e) => e.status === "DRAFT" && e.employee.managerId === user.employeeId && mayScore(user, e.employee));
  const toApprove = evs.filter((e) => e.status === "SUBMITTED" && mayManagerApprove(user, e.employee) && user.role !== "CEO");
  const toBoard = evs.filter((e) => e.status === "MANAGER_APPROVED" && mayBoardApprove(user, e.employee));
  const approved = evs.filter((e) => e.status === "APPROVED").length;

  const alerts = manage
    ? await db.alert.findMany({ where: { organizationId: orgId, resolved: false }, include: { employee: true }, orderBy: { createdAt: "desc" } })
    : [];
  // The two half-years behind each "two in a row under 50" alert.
  const lows = await Promise.all(
    alerts.map(async (a) => {
      const [y, h] = a.key.split(":")[0].split("-").map(Number);
      const prev = previousHalf(y, h);
      const pair = await db.evaluation.findMany({
        where: { employeeId: a.employeeId ?? "", OR: [{ period: { year: y, half: h } }, { period: { year: prev.year, half: prev.half } }] },
        include: { period: true },
        orderBy: [{ period: { year: "asc" } }, { period: { half: "asc" } }],
      });
      return pair;
    }),
  );
  const days = period ? daysBetween(today(), period.deadline) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("Welcome, {name}", { name: user.name })}</h1>

      {period && canScore(user) && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="me-auto font-semibold">{periodLabel(t, period.year, period.half)}</h2>
            <span className={`text-sm ${days != null && days < 0 ? "font-medium text-red-700" : "text-slate-500"}`}>
              {days != null && days < 0
                ? t("Was due {date}", { date: formatDate(period.deadline, t.locale) })
                : t("Due {date} ({n} days left)", { date: formatDate(period.deadline, t.locale), n: num(t, days ?? 0) })}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${evs.length ? (approved / evs.length) * 100 : 0}%` }} />
          </div>
          <p className="text-sm text-slate-600">{t("{approved} of {total} approved", { approved: num(t, approved), total: num(t, evs.length) })}</p>
          <div className="flex flex-wrap gap-2">
            {toScore.length > 0 && (
              <Link className="btn-primary" href={`/evaluations/${period.id}?status=DRAFT`}>
                {t("Score your team ({n})", { n: num(t, toScore.length) })}
              </Link>
            )}
            {toApprove.length > 0 && (
              <Link className="btn-primary" href={`/evaluations/${period.id}?status=SUBMITTED`}>
                {t("Approve as manager ({n})", { n: num(t, toApprove.length) })}
              </Link>
            )}
            {toBoard.length > 0 && (
              <Link className="btn-primary" href={`/evaluations/${period.id}?status=MANAGER_APPROVED`}>
                {t("Approve as board ({n})", { n: num(t, toBoard.length) })}
              </Link>
            )}
            <Link className="btn-secondary" href={`/evaluations/${period.id}`}>{t("Open the half-year")}</Link>
          </div>
        </section>
      )}

      {alerts.length > 0 && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-semibold">{t("Two half-years under 50 %")}</h2>
            <p className="text-sm text-slate-500">{t("HR meeting with the supervisor, manager and CEO on continuing employment.")}</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {alerts.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                {a.employee && (
                  <Link className="font-medium text-brand-700 hover:underline" href={`/people/${a.employee.id}`}>
                    {a.employee.firstName} {a.employee.lastName}
                  </Link>
                )}
                <span className="flex gap-2 text-slate-600">
                  {lows[i].map((e) => (
                    <span key={e.id}>
                      {periodLabel(t, e.period.year, e.period.half)}: <ScorePct t={t} value={e.percent} />
                    </span>
                  ))}
                </span>
                <form action={resolveAlert} className="ms-auto">
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">{t("Done")}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!period && manage && (
        <section className="card space-y-2">
          <p className="text-slate-600">{t("No half-year is open.")}</p>
          <Link className="btn-primary" href="/evaluations">{t("Open a half-year")}</Link>
        </section>
      )}
    </div>
  );
}
