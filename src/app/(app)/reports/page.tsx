import Link from "next/link";
import { db } from "@/lib/db";
import { canManage, canScore, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { coefficient, GOOD_FROM, isPoor, round2, yearlyPercent } from "@/lib/calc";
import { num, pct, periodLabel, periodShort, year } from "@/lib/format";
import { teamOf } from "@/lib/evaluations";
import { BarList, LineChart } from "@/components/Charts";
import { ScorePct } from "@/components/Score";

const avg = (l: number[]) => (l.length ? round2(l.reduce((s, x) => s + x, 0) / l.length) : null);

/**
 * Results across the company, from approved evaluations: departments side by side, the trend over
 * half-years, a ranking of everyone, and each department's average per factor.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; scope?: string; dept?: string; trend?: string }>;
}) {
  const user = await requireUser(canScore);
  const t = await getT();
  const sp = await searchParams;
  const team = canManage(user) ? null : await teamOf(user.org.id, user.employeeId);
  const [periods, departments] = await Promise.all([
    db.period.findMany({
      where: { organizationId: user.org.id },
      orderBy: [{ year: "asc" }, { half: "asc" }],
      include: {
        indicators: { where: { departmentId: null }, orderBy: { position: "asc" } },
        evaluations: {
          where: { status: "APPROVED", percent: { not: null }, ...(team ? { employeeId: { in: [...team] } } : {}) },
          include: { employee: { include: { department: true } }, scores: true },
        },
      },
    }),
    db.department.findMany({ where: { organizationId: user.org.id }, orderBy: { name: "asc" } }),
  ]);
  const withData = periods.filter((p) => p.evaluations.length);
  if (!withData.length)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{t("Reports")}</h1>
        <p className="text-slate-500">{t("Reports show once evaluations are approved.")}</p>
      </div>
    );
  // By default the latest closed half-year, whose scores are final; else the latest with results.
  const period =
    withData.find((p) => p.id === sp.period) ?? [...withData].reverse().find((p) => p.closed) ?? withData[withData.length - 1];
  const evs = period.evaluations;
  const label = (p: { year: number; half: number }) => periodLabel(t, p.year, p.half);

  // ---- Departments in the chosen half-year
  const deptRows = departments
    .map((d) => {
      const list = evs.filter((e) => e.employee.departmentId === d.id).map((e) => e.percent!);
      return {
        d,
        n: list.length,
        avg: avg(list),
        max: list.length ? Math.max(...list) : null,
        min: list.length ? Math.min(...list) : null,
        good: list.filter((x) => x >= GOOD_FROM).length,
        poor: list.filter((x) => isPoor(x)).length,
      };
    })
    .filter((r) => r.n > 0)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  const all = evs.map((e) => e.percent!);

  // ---- Trend: the company (or team) and one department
  const trendDept = departments.find((d) => d.id === sp.trend);
  const series = [
    { name: team ? t("My team") : t("Company"), values: withData.map((p) => avg(p.evaluations.map((e) => e.percent!))) },
    ...(trendDept
      ? [{ name: trendDept.name, values: withData.map((p) => avg(p.evaluations.filter((e) => e.employee.departmentId === trendDept.id).map((e) => e.percent!))) }]
      : []),
  ];

  // ---- Ranking: the half-year, or the year's average of both halves
  const byYear = sp.scope === "year";
  const people = new Map<string, { e: (typeof evs)[number]["employee"]; value: number | null }>();
  if (byYear) {
    for (const p of withData.filter((p) => p.year === period.year))
      for (const e of p.evaluations) people.set(e.employeeId, { e: e.employee, value: null });
    for (const [id, row] of people) {
      const halves = [1, 2].map((h) => withData.find((p) => p.year === period.year && p.half === h)?.evaluations.find((e) => e.employeeId === id)?.percent ?? null);
      row.value = yearlyPercent(halves);
    }
  } else for (const e of evs) people.set(e.employeeId, { e: e.employee, value: e.percent });
  const ranking = [...people.values()]
    .filter((r) => r.value != null && (!sp.dept || r.e.departmentId === sp.dept))
    .sort((a, b) => b.value! - a.value!);
  // Equal scores share a rank (1, 2, 2, 4).
  const ranks = ranking.map((r, i) => (i > 0 && ranking[i - 1].value === r.value ? null : i + 1));
  for (let i = 0; i < ranks.length; i++) if (ranks[i] == null) ranks[i] = ranks[i - 1];

  // ---- Average score per shared factor and department
  const factors = period.indicators;
  const matrixDepts = deptRows.map((r) => r.d);
  const cell = (factorId: string, deptId: string | null) => {
    const list = evs
      .filter((e) => deptId == null || e.employee.departmentId === deptId)
      .map((e) => e.scores.find((s) => s.indicatorId === factorId)?.score)
      .filter((x): x is number => x != null);
    return avg(list);
  };

  const query = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { period: period.id, scope: sp.scope, dept: sp.dept, trend: sp.trend, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `?${q}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="me-auto text-2xl font-semibold">{t("Reports")}</h1>
        <form className="flex items-end gap-2">
          {sp.scope && <input type="hidden" name="scope" value={sp.scope} />}
          {sp.dept && <input type="hidden" name="dept" value={sp.dept} />}
          {sp.trend && <input type="hidden" name="trend" value={sp.trend} />}
          <div>
            <label className="label">{t("Half-year")}</label>
            <select className="input" name="period" defaultValue={period.id}>
              {[...withData].reverse().map((p) => (
                <option key={p.id} value={p.id}>{label(p)}</option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" type="submit">{t("Show")}</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">{t("Approved evaluations")}</p>
          <p className="text-3xl font-semibold">{num(t, all.length)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t("Average")}</p>
          <p className="text-3xl font-semibold"><ScorePct t={t} value={avg(all)} /></p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t("75 % and over")}</p>
          <p className="text-3xl font-semibold text-emerald-700">{num(t, all.filter((x) => x >= GOOD_FROM).length)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t("Under 50 %")}</p>
          <p className="text-3xl font-semibold text-red-700">{num(t, all.filter((x) => isPoor(x)).length)}</p>
        </div>
      </div>

      {deptRows.length > 0 && (
        <section className="card space-y-4">
          <h2 className="font-semibold">{t("Departments in {period}", { period: label(period) })}</h2>
          <BarList
            rows={deptRows.map((r) => ({
              label: r.d.name,
              value: r.avg ?? 0,
              text: pct(t, r.avg, 1),
              detail: t("{n} people · lowest {min} · highest {max}", { n: num(t, r.n), min: pct(t, r.min, 1), max: pct(t, r.max, 1) }),
            }))}
          />
          <div className="overflow-x-auto">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th>{t("Department")}</th>
                  <th className="text-end">{t("People")}</th>
                  <th className="text-end">{t("Average")}</th>
                  <th className="text-end">{t("Highest")}</th>
                  <th className="text-end">{t("Lowest")}</th>
                  <th className="text-end">{t("75 % and over")}</th>
                  <th className="text-end">{t("Under 50 %")}</th>
                </tr>
              </thead>
              <tbody>
                {deptRows.map((r) => (
                  <tr key={r.d.id}>
                    <td data-label={t("Department")} className="font-medium">{r.d.name}</td>
                    <td data-label={t("People")} className="text-end">{num(t, r.n)}</td>
                    <td data-label={t("Average")} className="text-end"><ScorePct t={t} value={r.avg} /></td>
                    <td data-label={t("Highest")} className="text-end"><ScorePct t={t} value={r.max} /></td>
                    <td data-label={t("Lowest")} className="text-end"><ScorePct t={t} value={r.min} /></td>
                    <td data-label={t("75 % and over")} className="text-end">{num(t, r.good)}</td>
                    <td data-label={t("Under 50 %")} className="text-end">{num(t, r.poor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {withData.length > 1 && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <h2 className="me-auto font-semibold">{t("Average over time")}</h2>
            <form className="flex items-end gap-2">
              <input type="hidden" name="period" value={period.id} />
              {sp.scope && <input type="hidden" name="scope" value={sp.scope} />}
              {sp.dept && <input type="hidden" name="dept" value={sp.dept} />}
              <select className="input" name="trend" defaultValue={sp.trend ?? ""} aria-label={t("Compare with")}>
                <option value="">{t("Compare with a department…")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button className="btn-secondary" type="submit">{t("Show")}</button>
            </form>
          </div>
          <LineChart labels={withData.map((p) => periodShort(t, p.year, p.half))} series={series} locale={t.locale} floorLabel={t("50 % floor")} />
        </section>
      )}

      <section className="card space-y-3 p-0">
        <div className="flex flex-wrap items-end gap-3 px-4 pt-4">
          <h2 className="me-auto font-semibold">
            {byYear ? t("Ranking for {year}", { year: year(t, period.year) }) : t("Ranking for {period}", { period: label(period) })}
          </h2>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
            <Link href={query({ scope: undefined })} className={`px-3 py-1.5 ${!byYear ? "bg-ink text-white" : "bg-white hover:bg-slate-100"}`}>
              {t("Half-year")}
            </Link>
            <Link href={query({ scope: "year" })} className={`border-s border-slate-300 px-3 py-1.5 ${byYear ? "bg-ink text-white" : "bg-white hover:bg-slate-100"}`}>
              {t("Year")}
            </Link>
          </div>
          <form className="flex items-end gap-2">
            <input type="hidden" name="period" value={period.id} />
            {sp.scope && <input type="hidden" name="scope" value={sp.scope} />}
            {sp.trend && <input type="hidden" name="trend" value={sp.trend} />}
            <select className="input" name="dept" defaultValue={sp.dept ?? ""} aria-label={t("Department")}>
              <option value="">{t("All departments")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button className="btn-secondary" type="submit">{t("Show")}</button>
          </form>
        </div>
        <table className="table table-stack">
          <thead>
            <tr>
              <th className="ps-4 text-center">{t("Rank")}</th>
              <th>{t("Name")}</th>
              <th>{t("Department")}</th>
              <th>{t("Job title")}</th>
              <th className="text-end">{byYear ? t("Yearly average") : t("Percent")}</th>
              <th className="text-end">{t("Coefficient")}</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.e.id}>
                <td data-label={t("Rank")} className="ps-4 text-center font-semibold text-slate-700">{num(t, ranks[i]!)}</td>
                <td data-label={t("Name")} className="font-medium">
                  <Link className="text-brand-700 hover:underline" href={`/people/${r.e.id}`}>{r.e.firstName} {r.e.lastName}</Link>
                </td>
                <td data-label={t("Department")}>{r.e.department?.name}</td>
                <td data-label={t("Job title")}>{r.e.jobTitle}</td>
                <td data-label={byYear ? t("Yearly average") : t("Percent")} className="text-end"><ScorePct t={t} value={r.value} /></td>
                <td data-label={t("Coefficient")} className="text-end">{num(t, coefficient(r.value!))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {factors.length > 0 && matrixDepts.length > 0 && (
        <section className="card space-y-3 p-0">
          <h2 className="px-4 pt-4 font-semibold">{t("Average score per factor (0–5) in {period}", { period: label(period) })}</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="ps-4">{t("Factor")}</th>
                  {matrixDepts.map((d) => (
                    <th key={d.id} className="text-center">{d.name}</th>
                  ))}
                  <th className="text-center">{team ? t("My team") : t("Company")}</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f) => (
                  <tr key={f.id}>
                    <td className="ps-4">{f.name}</td>
                    {[...matrixDepts.map((d) => d.id), null].map((dId) => {
                      const v = cell(f.id, dId);
                      // One hue, light to dark with the score; the number is always written.
                      return (
                        <td
                          key={dId ?? "all"}
                          className="text-center"
                          style={v == null ? undefined : { background: `rgba(42, 120, 214, ${0.06 + (v / 5) * 0.4})` }}
                        >
                          {v == null ? "—" : num(t, v, 1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
