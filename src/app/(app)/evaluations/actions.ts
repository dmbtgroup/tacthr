"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManage, canScore, isBoard, requireUser } from "@/lib/auth";
import { isBand, MAX_SCORE } from "@/lib/calc";
import { parseNum } from "@/lib/format";
import { msg } from "@/lib/i18n/message";
import { addEligible, checkTwoLow, factorProblems, factorsFor, mayBoardApprove, mayManagerApprove, mayScore, openPeriod, recompute } from "@/lib/evaluations";

type Vars = Record<string, string | number>;
const go = (path: string, kind: "error" | "notice", key: string, vars?: Vars): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg(key, vars))}`);

export async function openHalf(form: FormData) {
  const user = await requireUser(canManage);
  const [y, h] = String(form.get("period") ?? "").split("-").map(Number);
  if (!y || (h !== 1 && h !== 2)) go("/evaluations", "error", "Choose a half-year.");
  if (await db.period.findFirst({ where: { organizationId: user.org.id, year: y, half: h } })) go("/evaluations", "error", "That half-year is already open.");
  const problems = await factorProblems(user.org.id, user.org.method);
  if (problems.length) go("/evaluations", "error", problems[0].key, problems[0].vars);
  const p = await openPeriod(user.org.id, y, h as 1 | 2);
  revalidatePath("/evaluations");
  redirect(`/evaluations/${p.id}`);
}

export async function addNewPeople(form: FormData) {
  const user = await requireUser(canManage);
  const id = String(form.get("periodId"));
  const p = await db.period.findFirst({ where: { id, organizationId: user.org.id } });
  if (!p) go("/evaluations", "error", "Half-year not found.");
  const n = await db.$transaction((tx) => addEligible(tx, id));
  revalidatePath(`/evaluations/${id}`);
  go(`/evaluations/${id}`, "notice", n === 1 ? "{n} person added." : "{n} people added.", { n });
}

export async function setClosed(form: FormData) {
  const user = await requireUser(canManage);
  const id = String(form.get("periodId"));
  const closed = form.get("closed") === "1";
  await db.period.updateMany({ where: { id, organizationId: user.org.id }, data: { closed } });
  revalidatePath(`/evaluations/${id}`);
  go(`/evaluations/${id}`, "notice", closed ? "Half-year closed." : "Half-year reopened.");
}

async function load(user: Awaited<ReturnType<typeof requireUser>>, evaluationId: string) {
  const ev = await db.evaluation.findFirst({
    where: { id: evaluationId, period: { organizationId: user.org.id } },
    include: { period: { include: { indicators: true } }, employee: { include: { manager: { select: { managerId: true } } } } },
  });
  if (!ev) redirect("/evaluations");
  return ev;
}

/** Saves a supervisor's scores; "submit" also sends them on for approval once complete. */
export async function saveScores(form: FormData) {
  const user = await requireUser(canScore);
  const ev = await load(user, String(form.get("evaluationId")));
  const page = `/evaluations/${ev.periodId}/${ev.employeeId}`;
  if (ev.period.closed) go(page, "error", "This half-year is closed.");
  if (!mayScore(user, ev.employee)) go(page, "error", "You can't score this person.");
  if (ev.status !== "DRAFT") go(page, "error", "These scores were already sent for approval.");

  const { shared, own } = factorsFor(ev.period.indicators, ev.period.method, ev.employee.departmentId);
  const scores: { indicatorId: string; score: number }[] = [];
  for (const f of [...shared, ...own]) {
    const v = parseNum(form.get(`score_${f.id}`));
    if (v == null) continue;
    if (!Number.isInteger(v) || v < 0 || v > MAX_SCORE) go(page, "error", "Scores are whole numbers from 0 to 5.");
    scores.push({ indicatorId: f.id, score: v });
  }
  const band = String(form.get("band") ?? "") || null;
  if (band && !isBand(band)) go(page, "error", "Choose a band.");
  const effScore = parseNum(form.get("effectivenessScore"));
  const notes = String(form.get("notes") ?? "").trim() || null;
  const submit = form.get("intent") === "submit";

  const updated = await db.$transaction(async (tx) => {
    await tx.evaluationScore.deleteMany({ where: { evaluationId: ev.id } });
    if (scores.length) await tx.evaluationScore.createMany({ data: scores.map((s) => ({ ...s, evaluationId: ev.id })) });
    await tx.evaluation.update({
      where: { id: ev.id },
      data: { effectivenessBand: band, effectivenessScore: effScore, notes, scoredByName: user.name },
    });
    return recompute(tx, ev.id);
  });
  if (submit) {
    if (updated.total == null) go(page, "error", "Saved. Complete every score before sending it for approval.");
    // With no unit manager above the supervisor, the CEO's approval stands for both.
    const skipManager = !ev.employee.manager?.managerId;
    await db.evaluation.update({
      where: { id: ev.id },
      data: skipManager
        ? { status: "MANAGER_APPROVED", submittedAt: new Date(), managerApprovedAt: new Date(), managerApprovedByName: user.name }
        : { status: "SUBMITTED", submittedAt: new Date() },
    });
  }
  revalidatePath(`/evaluations/${ev.periodId}`);
  go(page, "notice", submit ? "Sent for approval." : "Scores saved.");
}

export async function managerApprove(form: FormData) {
  const user = await requireUser(canScore);
  const ev = await load(user, String(form.get("evaluationId")));
  const page = `/evaluations/${ev.periodId}/${ev.employeeId}`;
  if (ev.period.closed) go(page, "error", "This half-year is closed.");
  if (ev.status !== "SUBMITTED" || !mayManagerApprove(user, ev.employee)) go(page, "error", "You can't approve this.");
  await db.evaluation.update({ where: { id: ev.id }, data: { status: "MANAGER_APPROVED", managerApprovedAt: new Date(), managerApprovedByName: user.name } });
  revalidatePath(`/evaluations/${ev.periodId}`);
  go(page, "notice", "Approved.");
}

export async function boardApprove(form: FormData) {
  const user = await requireUser(isBoard);
  const ev = await load(user, String(form.get("evaluationId")));
  const page = `/evaluations/${ev.periodId}/${ev.employeeId}`;
  if (ev.period.closed) go(page, "error", "This half-year is closed.");
  if (ev.status !== "MANAGER_APPROVED" || !mayBoardApprove(user, ev.employee)) go(page, "error", "You can't approve this.");
  await db.$transaction(async (tx) => {
    await tx.evaluation.update({ where: { id: ev.id }, data: { status: "APPROVED", approvedAt: new Date(), approvedByName: user.name } });
    await checkTwoLow(tx, ev.id);
  });
  revalidatePath(`/evaluations/${ev.periodId}`);
  go(page, "notice", "Approved.");
}

/** The board approves every evaluation that the managers have approved. */
export async function boardApproveAll(form: FormData) {
  const user = await requireUser(isBoard);
  const periodId = String(form.get("periodId"));
  const p = await db.period.findFirst({ where: { id: periodId, organizationId: user.org.id } });
  if (!p || p.closed) go(`/evaluations/${periodId}`, "error", "This half-year is closed.");
  const ready = await db.evaluation.findMany({ where: { periodId, status: "MANAGER_APPROVED", NOT: user.employeeId ? { employeeId: user.employeeId } : undefined } });
  await db.$transaction(
    async (tx) => {
      for (const ev of ready) {
        await tx.evaluation.update({ where: { id: ev.id }, data: { status: "APPROVED", approvedAt: new Date(), approvedByName: user.name } });
        await checkTwoLow(tx, ev.id);
      }
    },
    { timeout: 60_000 },
  );
  revalidatePath(`/evaluations/${periodId}`);
  go(`/evaluations/${periodId}`, "notice", ready.length === 1 ? "{n} evaluation approved." : "{n} evaluations approved.", { n: ready.length });
}

/** Sends scores back to the supervisor to change. */
export async function sendBack(form: FormData) {
  const user = await requireUser(canScore);
  const ev = await load(user, String(form.get("evaluationId")));
  const page = `/evaluations/${ev.periodId}/${ev.employeeId}`;
  if (ev.period.closed) go(page, "error", "This half-year is closed.");
  const allowed =
    (ev.status === "SUBMITTED" && mayManagerApprove(user, ev.employee)) ||
    ((ev.status === "MANAGER_APPROVED" || ev.status === "APPROVED") && isBoard(user)) ||
    (ev.status === "SUBMITTED" && mayScore(user, ev.employee));
  if (!allowed) go(page, "error", "You can't send this back.");
  await db.evaluation.update({
    where: { id: ev.id },
    data: { status: "DRAFT", submittedAt: null, managerApprovedAt: null, managerApprovedByName: null, approvedAt: null, approvedByName: null },
  });
  revalidatePath(`/evaluations/${ev.periodId}`);
  go(page, "notice", "Sent back for changes.");
}
