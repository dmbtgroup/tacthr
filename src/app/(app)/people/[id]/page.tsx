import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { coefficient, isPoor, performancePct, yearlyPercent } from "@/lib/calc";
import { formatDate } from "@/lib/dates";
import { num, pct, periodLabel, year } from "@/lib/format";
import { factorsFor, maySee } from "@/lib/evaluations";
import { LineChart, BarList } from "@/components/Charts";
import { ScorePct, StatusBadge } from "@/components/Score";

/** One person's results: every half-year, the yearly averages, and the factors of the latest approved score. */
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const t = await getT();
  const { id } = await params;
  if (!(await maySee(user, id))) redirect("/home");
  const self = id === user.employeeId;
  const p = await db.employee.findFirst({
    where: { id, organizationId: user.org.id },
    include: {
      department: true,
      manager: true,
      evaluations: {
        where: self ? { status: "APPROVED" } : undefined,
        include: { period: { include: { indicators: { orderBy: { position: "asc" } } } }, scores: true },
        orderBy: [{ period: { year: "asc" } }, { period: { half: "asc" } }],
      },
    },
  });
  if (!p) notFound();
  const evs = p.evaluations;
  const approved = evs.filter((e) => e.status === "APPROVED" && e.percent != null);
  const latest = approved[approved.length - 1];

  // Yearly averages of the approved half-years (they feed next year's salary).
  const years = [...new Set(approved.map((e) => e.period.year))].sort((a, b) => b - a);
  const yearly = years.map((y) => {
    const halves = [1, 2].map((h) => approved.find((e) => e.period.year === y && e.period.half === h)?.percent ?? null);
    const avg = yearlyPercent(halves);
    return { year: y, halves, avg };
  });

  let factors: { label: string; value: number; text: string; detail: string }[] = [];
  if (latest) {
    const { shared, own } = factorsFor(latest.period.indicators, latest.period.method, p.departmentId);
    const byId = new Map(latest.scores.map((s) => [s.indicatorId, s.score]));
    factors = [...shared, ...own].map((f) => {
      const s = byId.get(f.id) ?? 0;
      return { label: f.name, value: (s / 5) * 100, text: `${num(t, s)} / ${num(t, 5)}`, detail: t("Weight {w}", { w: num(t, f.weight) }) };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{p.firstName} {p.lastName}</h1>
        <p className="text-sm text-slate-500">
          {[
            p.jobTitle,
            p.department?.name,
            p.manager && t("Supervisor: {name}", { name: `${p.manager.firstName} ${p.manager.lastName}` }),
            p.startDate && t("Since {date}", { date: formatDate(p.startDate, t.locale) }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">{latest ? t("Latest: {period}", { period: periodLabel(t, latest.period.year, latest.period.half) }) : t("Latest")}</p>
          <p className="text-3xl font-semibold"><ScorePct t={t} value={latest?.percent} /></p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{yearly[0] ? t("Average {year}", { year: year(t, yearly[0].year) }) : t("Yearly average")}</p>
          <p className="text-3xl font-semibold"><ScorePct t={t} value={yearly[0]?.avg} /></p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t("Performance coefficient")}</p>
          <p className="text-3xl font-semibold">{yearly[0]?.avg != null ? num(t, coefficient(yearly[0].avg)) : "—"}</p>
          {yearly[0]?.avg != null && isPoor(yearly[0].avg) && <p className="text-xs text-red-700">{t("Under 50 %: no bonus")}</p>}
        </div>
      </div>

      {approved.length > 1 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">{t("Score over time")}</h2>
          <LineChart
            labels={approved.map((e) => periodLabel(t, e.period.year, e.period.half))}
            series={[{ name: `${p.firstName} ${p.lastName}`, values: approved.map((e) => e.percent) }]}
            locale={t.locale}
            floorLabel={t("50 % floor")}
          />
        </section>
      )}

      <section className="card overflow-x-auto p-0">
        <h2 className="px-4 pt-4 font-semibold">{t("Half-years")}</h2>
        <table className="table table-stack">
          <thead>
            <tr>
              <th className="ps-4">{t("Half-year")}</th>
              <th className="text-end">{t("Efficiency")}</th>
              <th className="text-end">{t("Effectiveness")}</th>
              <th className="text-end">{t("Score")}</th>
              <th className="text-end">{t("Percent")}</th>
              <th className="text-end">{t("Coefficient")}</th>
              <th>{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {[...evs].reverse().map((e) => (
              <tr key={e.id}>
                <td data-label={t("Half-year")} className="ps-4">
                  {self ? (
                    periodLabel(t, e.period.year, e.period.half)
                  ) : (
                    <Link className="text-brand-700 hover:underline" href={`/evaluations/${e.periodId}/${p.id}`}>
                      {periodLabel(t, e.period.year, e.period.half)}
                    </Link>
                  )}
                </td>
                <td data-label={t("Efficiency")} className="text-end">{num(t, e.efficiency)}</td>
                <td data-label={t("Effectiveness")} className="text-end">{num(t, e.effectiveness)}</td>
                <td data-label={t("Score")} className="text-end">
                  {e.total != null && `${num(t, e.total)} / ${num(t, e.period.method === "CURRENT" ? 100 : 650)}`}
                </td>
                <td data-label={t("Percent")} className="text-end"><ScorePct t={t} value={e.percent} /></td>
                <td data-label={t("Coefficient")} className="text-end">{num(t, e.coefficient)}</td>
                <td data-label={t("Status")}><StatusBadge t={t} status={e.status} /></td>
              </tr>
            ))}
            {evs.length === 0 && (
              <tr>
                <td colSpan={7} className="ps-4 text-slate-500">{t("No evaluations yet.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {yearly.length > 0 && (
        <section className="card overflow-x-auto p-0">
          <h2 className="px-4 pt-4 font-semibold">{t("Years")}</h2>
          <table className="table table-stack">
            <thead>
              <tr>
                <th className="ps-4">{t("Year")}</th>
                <th className="text-end">{t("First half")}</th>
                <th className="text-end">{t("Second half")}</th>
                <th className="text-end">{t("Average")}</th>
                <th className="text-end">{t("Coefficient")}</th>
                <th className="text-end">{t("Next year's salary share")}</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((y) => (
                <tr key={y.year}>
                  <td data-label={t("Year")} className="ps-4">{year(t, y.year)}</td>
                  <td data-label={t("First half")} className="text-end"><ScorePct t={t} value={y.halves[0]} /></td>
                  <td data-label={t("Second half")} className="text-end"><ScorePct t={t} value={y.halves[1]} /></td>
                  <td data-label={t("Average")} className="text-end"><ScorePct t={t} value={y.avg} /></td>
                  <td data-label={t("Coefficient")} className="text-end">{y.avg != null && num(t, coefficient(y.avg))}</td>
                  <td data-label={t("Next year's salary share")} className="text-end">{pct(t, performancePct(y.avg))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {latest && factors.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">{t("Factors in {period}", { period: periodLabel(t, latest.period.year, latest.period.half) })}</h2>
          <BarList rows={factors} />
        </section>
      )}
    </div>
  );
}
