import "server-only";
import type { SalaryRecord } from "@prisma/client";
import { db } from "./db";
import { bonus, salary, yearlyPercent, type Education, type Rank, type SalaryResult } from "./calc";
import { salaryDeadline } from "./dates";

/**
 * Last year's performance for each person: the average of their approved half-years in `year - 1`
 * (salary instruction 5-6). People without an approved half-year that year have none.
 */
export async function lastYearPerformance(organizationId: string, year: number) {
  const evs = await db.evaluation.findMany({
    where: { status: "APPROVED", percent: { not: null }, period: { organizationId, year: year - 1 } },
    select: { employeeId: true, percent: true, period: { select: { half: true } } },
  });
  const by = new Map<string, (number | null)[]>();
  for (const e of evs) {
    const halves = by.get(e.employeeId) ?? [null, null];
    halves[e.period.half - 1] = e.percent;
    by.set(e.employeeId, halves);
  }
  return new Map([...by].map(([id, halves]) => [id, yearlyPercent(halves)]));
}

export type Figures = { minWage: bigint; maxSalary: bigint; bonusBase: bigint };

/** A record's salary and bonus, from the year's figures and last year's performance. */
export function computeRecord(r: Partial<SalaryRecord> | null | undefined, f: Figures, yearly: number | null): SalaryResult & { bonus: bigint } {
  const res = salary(
    {
      education: (r?.education as Education | null) ?? null,
      educationPct: r?.educationPct ?? null,
      experienceYears: r?.experienceYears ?? null,
      skillLevel: r?.skillLevel ?? null,
      physical: r?.physical ?? null,
      environment: r?.environment ?? null,
      mental: r?.mental ?? null,
      risk: r?.risk ?? null,
      rank: (r?.rank as Rank | null) ?? null,
      rankPct: r?.rankPct ?? null,
      sensitivity: r?.sensitivity ?? null,
      ceoPct: r?.ceoPct ?? null,
      yearlyPerformance: yearly,
      probation: r?.probation ?? false,
      probationSalary: r?.probationSalary ?? null,
    },
    f.minWage,
    f.maxSalary,
  );
  // Nobody on probation gets a bonus; it is for staff evaluated last year.
  return { ...res, bonus: r?.probation ? 0n : bonus(f.bonusBase, yearly) };
}

/**
 * Opens a salary year. Everyone's inputs are copied from the year before (with one more year of
 * experience), so only what changed needs entering; approvals start over.
 */
export async function openSalaryYear(organizationId: string, year: number, figures: Figures) {
  const prev = await db.salaryYear.findFirst({
    where: { organizationId, year: { lt: year } },
    orderBy: { year: "desc" },
    include: { records: true },
  });
  return db.$transaction(
    async (tx) => {
      const sy = await tx.salaryYear.create({ data: { organizationId, year, ...figures, deadline: salaryDeadline(year) } });
      if (prev?.records.length) {
        const active = new Set(
          (await tx.employee.findMany({ where: { organizationId, active: true }, select: { id: true } })).map((e) => e.id),
        );
        const years = year - prev.year;
        await tx.salaryRecord.createMany({
          data: prev.records
            .filter((r) => active.has(r.employeeId))
            .map((r) => ({
              salaryYearId: sy.id,
              employeeId: r.employeeId,
              education: r.education,
              educationPct: r.educationPct,
              experienceYears: r.experienceYears == null ? null : r.experienceYears + years,
              skillLevel: r.skillLevel,
              physical: r.physical,
              environment: r.environment,
              mental: r.mental,
              risk: r.risk,
              rank: r.rank,
              rankPct: r.rankPct,
              sensitivity: r.sensitivity,
              ceoPct: r.ceoPct,
              // Probation ends with the year; the salary is worked out from the factors from now on.
              probation: false,
            })),
        });
      }
      return sy;
    },
    { timeout: 30_000 },
  );
}
