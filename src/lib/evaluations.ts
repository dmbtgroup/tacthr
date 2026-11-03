import "server-only";
import type { EvalMethod, Prisma } from "@prisma/client";
import { db } from "./db";
import { coefficient, currentScore, CURRENT_WEIGHT_TOTAL, departmentScore, DEPT_WEIGHT_TOTAL, eligible, twoLowInARow } from "./calc";
import { evaluationDeadline, halfRange } from "./dates";
import type { OrgUser } from "./auth";

type Tx = Prisma.TransactionClient;

/** The half-year before (year, half). */
export function previousHalf(year: number, half: number) {
  return half === 2 ? { year, half: 1 } : { year: year - 1, half: 2 };
}

/** Problems that stop a half-year from opening: weights not adding up. Returns message keys with values. */
export async function factorProblems(orgId: string, method: EvalMethod) {
  const [factors, departments] = await Promise.all([
    db.indicator.findMany({ where: { organizationId: orgId } }),
    db.department.findMany({ where: { organizationId: orgId } }),
  ]);
  const sum = (l: { weight: number }[]) => l.reduce((s, f) => s + f.weight, 0);
  const problems: { key: string; vars: Record<string, string | number> }[] = [];
  const shared = factors.filter((f) => !f.departmentId);
  const need = method === "CURRENT" ? CURRENT_WEIGHT_TOTAL : DEPT_WEIGHT_TOTAL;
  if (sum(shared) !== need) problems.push({ key: "The shared factors' weights total {sum}, not {total}.", vars: { sum: sum(shared), total: need } });
  if (method === "DEPARTMENT")
    for (const d of departments) {
      const own = factors.filter((f) => f.departmentId === d.id);
      if (own.length && sum(own) !== DEPT_WEIGHT_TOTAL)
        problems.push({ key: "{department}'s factor weights total {sum}, not {total}.", vars: { department: d.name, sum: sum(own), total: DEPT_WEIGHT_TOTAL } });
    }
  return problems;
}

/** Adds an evaluation for every active, eligible person not yet in the period. Returns how many were added. */
export async function addEligible(tx: Tx, periodId: string) {
  const period = await tx.period.findUniqueOrThrow({ where: { id: periodId }, include: { evaluations: { select: { employeeId: true } } } });
  const { end } = halfRange(period.year, period.half as 1 | 2);
  const have = new Set(period.evaluations.map((e) => e.employeeId));
  const staff = await tx.employee.findMany({ where: { organizationId: period.organizationId, active: true } });
  const add = staff.filter((e) => !have.has(e.id) && eligible(e.startDate, e.fullTime, end));
  if (add.length) await tx.evaluation.createMany({ data: add.map((e) => ({ periodId, employeeId: e.id })) });
  return add.length;
}

/**
 * Opens a half-year: copies the company's factors (so later changes never alter it) and adds everyone
 * eligible: full-time, with three months' service by the half's end.
 */
export async function openPeriod(orgId: string, year: number, half: 1 | 2) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const factors = await db.indicator.findMany({ where: { organizationId: orgId }, orderBy: { position: "asc" } });
  return db.$transaction(
    async (tx) => {
      const period = await tx.period.create({
        data: {
          organizationId: orgId,
          year,
          half,
          method: org.method,
          efficiencyShare: org.efficiencyShare,
          deadline: evaluationDeadline(year, half),
        },
      });
      await tx.periodIndicator.createMany({
        data: factors.map((f) => ({
          periodId: period.id,
          kind: f.kind,
          departmentId: f.departmentId,
          name: f.name,
          description: f.description,
          weight: f.weight,
          position: f.position,
        })),
      });
      await addEligible(tx, period.id);
      return period;
    },
    { timeout: 30_000 },
  );
}

/** The factors a person is scored on in a period: shared ones, plus their department's in the department method. */
export function factorsFor<F extends { departmentId: string | null }>(factors: F[], method: EvalMethod, departmentId: string | null) {
  if (method === "CURRENT") return { shared: factors.filter((f) => !f.departmentId), own: [] as F[] };
  return { shared: factors.filter((f) => !f.departmentId), own: factors.filter((f) => f.departmentId && f.departmentId === departmentId) };
}

/** Recomputes and stores an evaluation's results from its scores. */
export async function recompute(tx: Tx, evaluationId: string) {
  const ev = await tx.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: { scores: true, employee: true, period: { include: { indicators: true } } },
  });
  const byId = new Map(ev.scores.map((s) => [s.indicatorId, s.score]));
  const { shared, own } = factorsFor(ev.period.indicators, ev.period.method, ev.employee.departmentId);
  const item = (f: { id: string; weight: number }) => ({ weight: f.weight, score: byId.get(f.id) ?? null });
  let data: Prisma.EvaluationUpdateInput;
  if (ev.period.method === "CURRENT") {
    const r = currentScore(shared.map(item), ev.effectivenessBand, ev.effectivenessScore, ev.period.efficiencyShare);
    data = { efficiency: r.efficiency, effectiveness: r.effectiveness, total: r.total, percent: r.total, coefficient: r.total == null ? null : coefficient(r.total) };
  } else {
    const r = departmentScore(shared.map(item), own.map(item));
    data = { efficiency: r.efficiency, effectiveness: r.effectiveness, total: r.total, percent: r.percent, coefficient: r.percent == null ? null : coefficient(r.percent) };
  }
  return tx.evaluation.update({ where: { id: evaluationId }, data });
}

/** Everyone below a person in the supervisor chain. */
export async function teamOf(orgId: string, employeeId: string | null): Promise<Set<string>> {
  const team = new Set<string>();
  if (!employeeId) return team;
  const all = await db.employee.findMany({ where: { organizationId: orgId }, select: { id: true, managerId: true } });
  let frontier = [employeeId];
  while (frontier.length) {
    const next = all.filter((e) => e.managerId && frontier.includes(e.managerId) && !team.has(e.id)).map((e) => e.id);
    next.forEach((id) => team.add(id));
    frontier = next;
  }
  return team;
}

export type Person = { id: string; managerId: string | null; manager?: { managerId: string | null } | null };

/** HR, the CEO and the person's direct supervisor score; nobody scores themselves. */
export function mayScore(user: OrgUser, p: Person) {
  if (p.id === user.employeeId) return false;
  return user.role === "HR" || user.role === "CEO" || (!!user.employeeId && p.managerId === user.employeeId);
}

/** The unit manager (the supervisor's supervisor) approves after the supervisor; the CEO can stand in. */
export function mayManagerApprove(user: OrgUser, p: Person) {
  if (p.id === user.employeeId) return false;
  if (user.role === "CEO") return true;
  const unitManager = p.manager?.managerId ?? null;
  return !!user.employeeId && unitManager === user.employeeId;
}

/** The board gives the final approval. */
export function mayBoardApprove(user: OrgUser, p: Person) {
  return user.role === "CEO" && p.id !== user.employeeId;
}

/** Who may see a person's results: HR, the CEO, anyone above them, and (once approved) the person. */
export async function maySee(user: OrgUser, employeeId: string) {
  if (user.role === "HR" || user.role === "CEO") return true;
  if (employeeId === user.employeeId) return true;
  return (await teamOf(user.org.id, user.employeeId)).has(employeeId);
}

/** After a board approval: two half-years in a row under 50 % raise an alert for HR. */
export async function checkTwoLow(tx: Tx, evaluationId: string) {
  const ev = await tx.evaluation.findUniqueOrThrow({ where: { id: evaluationId }, include: { period: true } });
  const prev = previousHalf(ev.period.year, ev.period.half);
  const before = await tx.evaluation.findFirst({
    where: { employeeId: ev.employeeId, status: "APPROVED", period: { organizationId: ev.period.organizationId, year: prev.year, half: prev.half } },
  });
  if (!twoLowInARow(before?.percent, ev.percent)) return;
  const key = `${ev.period.year}-${ev.period.half}:${ev.employeeId}`;
  // One alert per person: a newer pair replaces the open one.
  await tx.alert.updateMany({
    where: { organizationId: ev.period.organizationId, kind: "TWO_LOW_PERIODS", employeeId: ev.employeeId, resolved: false, NOT: { key } },
    data: { resolved: true },
  });
  await tx.alert.upsert({
    where: { organizationId_kind_key: { organizationId: ev.period.organizationId, kind: "TWO_LOW_PERIODS", key } },
    update: {},
    create: { organizationId: ev.period.organizationId, kind: "TWO_LOW_PERIODS", employeeId: ev.employeeId, key },
  });
}
