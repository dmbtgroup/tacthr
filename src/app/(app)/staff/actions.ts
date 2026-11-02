"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readSheet } from "read-excel-file/node";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { parseDate, latinDigits } from "@/lib/dates";
import { msg } from "@/lib/i18n/message";

const back = (kind: "error" | "notice", key: string, vars?: Record<string, string | number>) =>
  redirect(`/staff?${kind}=${encodeURIComponent(msg(key, vars))}`);
const fail = (key: string, vars?: Record<string, string | number>) => back("error", key, vars);
const done = (key: string, vars?: Record<string, string | number>) => back("notice", key, vars);

async function manager() {
  return requireUser(canManage);
}

function text(form: FormData, k: string) {
  return String(form.get(k) ?? "").trim();
}

/** Never lets a person end up managing themselves, directly or through others. */
async function createsLoop(orgId: string, employeeId: string, managerId: string | null) {
  let id = managerId;
  for (let i = 0; id && i < 100; i++) {
    if (id === employeeId) return true;
    const m = await db.employee.findFirst({ where: { id, organizationId: orgId }, select: { managerId: true } });
    id = m?.managerId ?? null;
  }
  return false;
}

export async function saveEmployee(form: FormData) {
  const user = await manager();
  const orgId = user.org.id;
  const id = text(form, "id");
  const firstName = text(form, "firstName");
  const lastName = text(form, "lastName");
  if (!firstName || !lastName) fail("Enter the first and last name.");
  const code = latinDigits(text(form, "code")) || null;
  const startRaw = text(form, "startDate");
  const startDate = parseDate(startRaw);
  if (startRaw && !startDate) fail("The start date {date} isn't a valid date.", { date: startRaw });
  const departmentId = text(form, "departmentId") || null;
  const managerId = text(form, "managerId") || null;
  if (departmentId && !(await db.department.findFirst({ where: { id: departmentId, organizationId: orgId } }))) fail("Department not found.");
  if (managerId && !(await db.employee.findFirst({ where: { id: managerId, organizationId: orgId } }))) fail("Supervisor not found.");
  if (id && (await createsLoop(orgId, id, managerId))) fail("A person can't be their own supervisor, directly or through others.");
  if (code) {
    const same = await db.employee.findFirst({ where: { organizationId: orgId, code, NOT: id ? { id } : undefined } });
    if (same) fail("Personnel number {code} is already used by {name}.", { code, name: `${same.firstName} ${same.lastName}` });
  }
  const data = {
    code,
    firstName,
    lastName,
    jobTitle: text(form, "jobTitle") || null,
    departmentId,
    managerId,
    startDate,
    fullTime: !!form.get("fullTime"),
    active: id ? !!form.get("active") : true,
  };
  if (id) {
    const e = await db.employee.findFirst({ where: { id, organizationId: orgId } });
    if (!e) fail("Person not found.");
    await db.employee.update({ where: { id }, data });
  } else await db.employee.create({ data: { ...data, organizationId: orgId } });
  revalidatePath("/staff");
  done("{name} saved.", { name: `${firstName} ${lastName}` });
}

export async function deleteEmployee(form: FormData) {
  const user = await manager();
  const id = text(form, "id");
  const e = await db.employee.findFirst({
    where: { id, organizationId: user.org.id },
    include: { _count: { select: { evaluations: true, salaries: true } } },
  });
  if (!e) fail("Person not found.");
  // Scored or paid people stay on record; they're marked as left instead.
  if (e!._count.evaluations || e!._count.salaries)
    fail("{name} has scores or salaries on record. Untick Active instead of deleting.", { name: `${e!.firstName} ${e!.lastName}` });
  await db.employee.delete({ where: { id } });
  revalidatePath("/staff");
  done("{name} deleted.", { name: `${e!.firstName} ${e!.lastName}` });
}

export async function saveDepartment(form: FormData) {
  const user = await manager();
  const id = text(form, "id");
  const name = text(form, "name");
  if (!name) fail("Enter the department's name.");
  const same = await db.department.findFirst({ where: { organizationId: user.org.id, name, NOT: id ? { id } : undefined } });
  if (same) fail("There is already a department called {name}.", { name });
  if (id) await db.department.updateMany({ where: { id, organizationId: user.org.id }, data: { name } });
  else await db.department.create({ data: { organizationId: user.org.id, name } });
  revalidatePath("/staff");
  done("Department {name} saved.", { name });
}

export async function deleteDepartment(form: FormData) {
  const user = await manager();
  const id = text(form, "id");
  const d = await db.department.findFirst({ where: { id, organizationId: user.org.id } });
  if (!d) fail("Department not found.");
  await db.department.delete({ where: { id } });
  revalidatePath("/staff");
  done("Department {name} deleted.", { name: d!.name });
}

/**
 * Imports staff from an Excel sheet: personnel no., first name, last name, job title, department,
 * supervisor's personnel no., start date (Jalali or Gregorian), full-time (yes/no). People are matched
 * by personnel number: existing ones are updated, new ones added; departments are created as needed.
 */
export async function importStaff(form: FormData) {
  const user = await manager();
  const orgId = user.org.id;
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) fail("Choose an Excel file.");
  let rows: unknown[][];
  try {
    rows = (await readSheet(Buffer.from(await (file as File).arrayBuffer()))) as unknown[][];
  } catch {
    return fail("The file couldn't be read. Save it as an Excel .xlsx file and try again.");
  }
  const body = rows.slice(1).filter((r) => r.some((c) => c != null && String(c).trim()));
  if (!body.length) fail("The sheet has no rows under its heading.");

  const cell = (r: unknown[], i: number) => (r[i] == null ? "" : latinDigits(String(r[i])).trim());
  const errors: string[] = [];
  const parsed = body.map((r, i) => {
    const raw = r[6];
    const startDate = raw instanceof Date ? new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate())) : parseDate(cell(r, 6));
    if (cell(r, 6) && !startDate) errors.push(msg("Row {row}: the start date {date} isn't valid.", { row: i + 2, date: cell(r, 6) }));
    if (!cell(r, 1) || !cell(r, 2)) errors.push(msg("Row {row}: first and last name are needed.", { row: i + 2 }));
    const ft = cell(r, 7).toLowerCase();
    return {
      code: cell(r, 0) || null,
      firstName: String(r[1] ?? "").trim(),
      lastName: String(r[2] ?? "").trim(),
      jobTitle: String(r[3] ?? "").trim() || null,
      department: String(r[4] ?? "").trim(),
      managerCode: cell(r, 5) || null,
      startDate,
      fullTime: !["no", "n", "0", "خیر", "نه", "پاره‌وقت", "پاره وقت", "false"].includes(ft),
    };
  });
  if (errors.length) redirect(`/staff?error=${encodeURIComponent(errors[0])}`);

  let added = 0;
  let updated = 0;
  await db.$transaction(async (tx) => {
    const deptIds = new Map<string, string>();
    for (const p of parsed) {
      if (!p.department || deptIds.has(p.department)) continue;
      const d = await tx.department.upsert({
        where: { organizationId_name: { organizationId: orgId, name: p.department } },
        update: {},
        create: { organizationId: orgId, name: p.department },
      });
      deptIds.set(p.department, d.id);
    }
    const byCode = new Map<string, string>();
    for (const p of parsed) {
      const data = {
        firstName: p.firstName,
        lastName: p.lastName,
        jobTitle: p.jobTitle,
        departmentId: p.department ? deptIds.get(p.department)! : null,
        startDate: p.startDate,
        fullTime: p.fullTime,
      };
      const existing = p.code ? await tx.employee.findFirst({ where: { organizationId: orgId, code: p.code } }) : null;
      const e = existing
        ? await tx.employee.update({ where: { id: existing.id }, data })
        : await tx.employee.create({ data: { ...data, organizationId: orgId, code: p.code } });
      if (existing) updated++;
      else added++;
      if (p.code) byCode.set(p.code, e.id);
    }
    // Supervisors once everyone exists, so a sheet can list them in any order.
    for (const p of parsed) {
      if (!p.code || !p.managerCode) continue;
      const managerId =
        byCode.get(p.managerCode) ?? (await tx.employee.findFirst({ where: { organizationId: orgId, code: p.managerCode } }))?.id;
      if (managerId && managerId !== byCode.get(p.code)) await tx.employee.update({ where: { id: byCode.get(p.code)! }, data: { managerId } });
    }
  }, { timeout: 60_000 });
  revalidatePath("/staff");
  done("Import done: {added} added, {updated} updated.", { added, updated });
}
