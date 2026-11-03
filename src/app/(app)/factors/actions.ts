"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { MAX_WEIGHT_CURRENT, MAX_WEIGHT_DEPT, MIN_WEIGHT } from "@/lib/calc";
import { parseNum } from "@/lib/format";
import { seedFactors } from "@/lib/orgs";
import { msg } from "@/lib/i18n/message";

const fail = (key: string, vars?: Record<string, string | number>) => redirect(`/factors?error=${encodeURIComponent(msg(key, vars))}`);
const done = (key: string, vars?: Record<string, string | number>) => redirect(`/factors?notice=${encodeURIComponent(msg(key, vars))}`);

export async function saveFactor(form: FormData) {
  const user = await requireUser(canManage);
  const orgId = user.org.id;
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const weight = parseNum(form.get("weight"));
  const max = user.org.method === "CURRENT" ? MAX_WEIGHT_CURRENT : MAX_WEIGHT_DEPT;
  if (!name) fail("Enter the factor's name.");
  if (weight == null || !Number.isInteger(weight) || weight < MIN_WEIGHT || weight > max)
    fail("The weight is a whole number from {min} to {max}.", { min: MIN_WEIGHT, max });
  if (id) {
    const f = await db.indicator.findFirst({ where: { id, organizationId: orgId } });
    if (!f) fail("Factor not found.");
    await db.indicator.update({ where: { id }, data: { name, description, weight: weight! } });
  } else {
    const departmentId = String(form.get("departmentId") ?? "") || null;
    if (departmentId && !(await db.department.findFirst({ where: { id: departmentId, organizationId: orgId } }))) fail("Department not found.");
    const kind = departmentId ? "EFFECTIVENESS" : "EFFICIENCY";
    const last = await db.indicator.findFirst({ where: { organizationId: orgId, departmentId }, orderBy: { position: "desc" } });
    await db.indicator.create({
      data: { organizationId: orgId, kind, departmentId, name, description, weight: weight!, position: (last?.position ?? -1) + 1 },
    });
  }
  revalidatePath("/factors");
  done("Factor {name} saved.", { name });
}

export async function deleteFactor(form: FormData) {
  const user = await requireUser(canManage);
  const id = String(form.get("id"));
  const f = await db.indicator.findFirst({ where: { id, organizationId: user.org.id } });
  if (!f) fail("Factor not found.");
  await db.indicator.delete({ where: { id } });
  revalidatePath("/factors");
  done("Factor {name} deleted.", { name: f!.name });
}

/** Puts back the instruction's default factors and weights. */
export async function resetFactors() {
  const user = await requireUser(canManage);
  await db.$transaction((tx) => seedFactors(tx, user.org.id, user.org.method));
  revalidatePath("/factors");
  done("The default factors are back.");
}
