"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EducationLevel, JobRank } from "@prisma/client";
import { db } from "@/lib/db";
import { canManage, isBoard, requireUser } from "@/lib/auth";
import { CEO_MAX, EDUCATION_RANGES, RANK_RANGES, SENSITIVITY_MAX } from "@/lib/calc";
import { parseNum, parseRials } from "@/lib/format";
import { msg } from "@/lib/i18n/message";
import { computeRecord, lastYearPerformance, openSalaryYear } from "@/lib/salaries";
import { EDUCATIONS, RANKS } from "@/lib/salaryNames";

type Vars = Record<string, string | number>;
const go = (path: string, kind: "error" | "notice", key: string, vars?: Vars): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg(key, vars))}`);

function figures(form: FormData, path: string) {
  const minWage = parseRials(form.get("minWage"));
  const maxSalary = parseRials(form.get("maxSalary"));
  const bonusBase = parseRials(form.get("bonusBase")) ?? 0n;
  if (!minWage || minWage <= 0n) go(path, "error", "Enter the minimum wage in rials.");
  if (!maxSalary || maxSalary < minWage!) go(path, "error", "The maximum salary can't be below the minimum wage.");
  return { minWage: minWage!, maxSalary: maxSalary!, bonusBase };
}

export async function openYear(form: FormData) {
  const user = await requireUser(canManage);
  const year = parseNum(form.get("year"));
  if (!year || !Number.isInteger(year) || year < 1300 || year > 1600) go("/salaries", "error", "Enter the year, e.g. 1405.");
  if (await db.salaryYear.findFirst({ where: { organizationId: user.org.id, year: year! } }))
    go("/salaries", "error", "That year is already open.");
  const f = figures(form, "/salaries");
  const sy = await openSalaryYear(user.org.id, year!, f);
  revalidatePath("/salaries");
  redirect(`/salaries/${sy.id}`);
}

export async function saveFigures(form: FormData) {
  const user = await requireUser(canManage);
  const id = String(form.get("id"));
  const path = `/salaries/${id}`;
  const sy = await db.salaryYear.findFirst({ where: { id, organizationId: user.org.id } });
  if (!sy) go("/salaries", "error", "Salary year not found.");
  if (sy!.closed) go(path, "error", "This salary year is closed.");
  const f = figures(form, path);
  await db.$transaction([
    db.salaryYear.update({ where: { id }, data: f }),
    // New figures change every salary: the board approves again.
    db.salaryRecord.updateMany({ where: { salaryYearId: id }, data: { approvedAt: null, approvedByName: null } }),
  ]);
  revalidatePath(path);
  go(path, "notice", "Figures saved.");
}

export async function setYearClosed(form: FormData) {
  const user = await requireUser(isBoard);
  const id = String(form.get("id"));
  await db.salaryYear.updateMany({ where: { id, organizationId: user.org.id }, data: { closed: form.get("closed") === "1" } });
  revalidatePath(`/salaries/${id}`);
  go(`/salaries/${id}`, "notice", form.get("closed") === "1" ? "Salary year closed." : "Salary year reopened.");
}

const int = (form: FormData, k: string) => {
  const v = parseNum(form.get(k));
  return v == null ? null : Math.round(v);
};

/** Saves one person's salary inputs; anything left empty stays open. */
export async function saveRecord(form: FormData) {
  const user = await requireUser(canManage);
  const yearId = String(form.get("yearId"));
  const employeeId = String(form.get("employeeId"));
  const path = `/salaries/${yearId}/${employeeId}`;
  const sy = await db.salaryYear.findFirst({ where: { id: yearId, organizationId: user.org.id } });
  const person = await db.employee.findFirst({ where: { id: employeeId, organizationId: user.org.id } });
  if (!sy || !person) go("/salaries", "error", "Salary year not found.");
  if (sy!.closed) go(path, "error", "This salary year is closed.");
  const existing = await db.salaryRecord.findUnique({ where: { salaryYearId_employeeId: { salaryYearId: yearId, employeeId } } });

  const education = (String(form.get("education") ?? "") || null) as EducationLevel | null;
  if (education && !EDUCATIONS.includes(education)) go(path, "error", "Choose the education level.");
  const educationPct = parseNum(form.get("educationPct"));
  if (education && educationPct != null) {
    const r = EDUCATION_RANGES[education];
    if (educationPct < r.min || educationPct > r.max) go(path, "error", "The education score is from {min} to {max} % for this level.", { min: r.min, max: r.max });
  }
  const experienceYears = int(form, "experienceYears");
  if (experienceYears != null && (experienceYears < 0 || experienceYears > 60)) go(path, "error", "Enter the years of experience.");
  const skillLevel = int(form, "skillLevel");
  const crit = ["physical", "environment", "mental", "risk"].map((k) => int(form, k));
  if ((skillLevel != null && (skillLevel < 0 || skillLevel > 9)) || crit.some((v) => v != null && (v < 0 || v > 5)))
    go(path, "error", "Choose the levels from the lists.");
  const rank = (String(form.get("rank") ?? "") || null) as JobRank | null;
  if (rank && !RANKS.includes(rank)) go(path, "error", "Choose the job rank.");
  const rankPct = parseNum(form.get("rankPct"));
  if (rank && rankPct != null) {
    const r = RANK_RANGES[rank];
    if (rankPct < r.min || rankPct > r.max) go(path, "error", "The rank score is from {min} to {max} % for this rank.", { min: r.min, max: r.max });
  }
  const sensitivity = int(form, "sensitivity");
  if (sensitivity != null && (sensitivity < 0 || sensitivity > SENSITIVITY_MAX)) go(path, "error", "Choose the job sensitivity.");
  // The CEO's score and the probation salary are the board's; others keep what is there.
  const board = isBoard(user);
  const ceoPct = board ? parseNum(form.get("ceoPct")) : existing?.ceoPct ?? null;
  if (ceoPct != null && (ceoPct < 0 || ceoPct > CEO_MAX)) go(path, "error", "The CEO's score is from 0 to {max} %.", { max: CEO_MAX });
  const probation = board ? !!form.get("probation") : existing?.probation ?? false;
  const probationSalary = board ? parseRials(form.get("probationSalary")) : existing?.probationSalary ?? null;
  if (board && probation && (probationSalary == null || probationSalary < sy!.minWage))
    go(path, "error", "A probation salary can't be below the minimum wage.");
  const notes = String(form.get("notes") ?? "").trim() || null;

  const data = {
    education,
    educationPct: education ? educationPct : null,
    experienceYears,
    skillLevel,
    physical: crit[0],
    environment: crit[1],
    mental: crit[2],
    risk: crit[3],
    rank,
    rankPct: rank ? rankPct : null,
    sensitivity,
    ceoPct,
    probation,
    probationSalary: probation ? probationSalary : null,
    notes,
    // Any change needs the board's approval again.
    approvedAt: null,
    approvedByName: null,
  };
  await db.salaryRecord.upsert({
    where: { salaryYearId_employeeId: { salaryYearId: yearId, employeeId } },
    update: data,
    create: { ...data, salaryYearId: yearId, employeeId },
  });
  revalidatePath(`/salaries/${yearId}`);
  go(path, "notice", "Salary saved.");
}

export async function approveRecord(form: FormData) {
  const user = await requireUser(isBoard);
  const yearId = String(form.get("yearId"));
  const employeeId = String(form.get("employeeId"));
  const path = `/salaries/${yearId}/${employeeId}`;
  const sy = await db.salaryYear.findFirst({ where: { id: yearId, organizationId: user.org.id } });
  if (!sy || sy.closed) go(path, "error", "This salary year is closed.");
  const r = await db.salaryRecord.findUnique({ where: { salaryYearId_employeeId: { salaryYearId: yearId, employeeId } } });
  const perf = (await lastYearPerformance(user.org.id, sy!.year)).get(employeeId) ?? null;
  if (!r || computeRecord(r, sy!, perf).salary == null) go(path, "error", "Complete the salary before approving it.");
  await db.salaryRecord.update({ where: { id: r!.id }, data: { approvedAt: new Date(), approvedByName: user.name } });
  revalidatePath(`/salaries/${yearId}`);
  go(path, "notice", "Approved.");
}

/** The board approves every complete salary of the year. */
export async function approveAllRecords(form: FormData) {
  const user = await requireUser(isBoard);
  const id = String(form.get("id"));
  const sy = await db.salaryYear.findFirst({ where: { id, organizationId: user.org.id }, include: { records: true } });
  if (!sy || sy.closed) go(`/salaries/${id}`, "error", "This salary year is closed.");
  const perf = await lastYearPerformance(user.org.id, sy!.year);
  const ready = sy!.records.filter((r) => !r.approvedAt && computeRecord(r, sy!, perf.get(r.employeeId) ?? null).salary != null);
  await db.salaryRecord.updateMany({ where: { id: { in: ready.map((r) => r.id) } }, data: { approvedAt: new Date(), approvedByName: user.name } });
  revalidatePath(`/salaries/${id}`);
  go(`/salaries/${id}`, "notice", ready.length === 1 ? "{n} salary approved." : "{n} salaries approved.", { n: ready.length });
}
