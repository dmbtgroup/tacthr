"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { msg } from "@/lib/i18n/message";

const fail = (key: string, vars?: Record<string, string | number>) => redirect(`/users?error=${encodeURIComponent(msg(key, vars))}`);
const done = (key: string, vars?: Record<string, string | number>) => redirect(`/users?notice=${encodeURIComponent(msg(key, vars))}`);

const ROLES: Role[] = ["HR", "CEO", "MANAGER", "EMPLOYEE"];

export async function saveUser(form: FormData) {
  const me = await requireUser(canManage);
  const orgId = me.org.id;
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role")) as Role;
  const employeeId = String(form.get("employeeId") ?? "") || null;
  if (!name || !email) fail("Enter the name and email.");
  if (!ROLES.includes(role)) fail("Choose a role.");
  // Only the CEO gives out the CEO role.
  if (role === "CEO" && me.role !== "CEO") fail("Only the CEO can give the CEO role.");
  if (!id && password.length < 8) fail("Passwords need at least 8 characters.");
  if (id && password && password.length < 8) fail("Passwords need at least 8 characters.");
  const same = await db.user.findFirst({ where: { organizationId: orgId, email, NOT: id ? { id } : undefined } });
  if (same) fail("{email} already has an account here.", { email });
  if (employeeId) {
    const e = await db.employee.findFirst({ where: { id: employeeId, organizationId: orgId }, include: { user: true } });
    if (!e) fail("Person not found.");
    if (e!.user && e!.user.id !== id) fail("{name} already has an account.", { name: `${e!.firstName} ${e!.lastName}` });
  }
  if ((role === "MANAGER" || role === "EMPLOYEE") && !employeeId) fail("Link managers and employees to their staff record.");

  const data = { name, email, role, employeeId };
  if (id) {
    const u = await db.user.findFirst({ where: { id, organizationId: orgId } });
    if (!u) fail("User not found.");
    if (u!.role === "CEO" && me.role !== "CEO") fail("Only the CEO can change the CEO's account.");
    const active = !!form.get("active");
    if (id === me.id && (!active || !(role === "HR" || role === "CEO"))) fail("You can't remove your own access.");
    await db.user.update({
      where: { id },
      data: { ...data, active, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
    });
  } else {
    await db.user.create({ data: { ...data, organizationId: orgId, passwordHash: await bcrypt.hash(password, 10) } });
  }
  revalidatePath("/users");
  done("{name} saved.", { name });
}

export async function deleteUser(form: FormData) {
  const me = await requireUser(canManage);
  const id = String(form.get("id"));
  if (id === me.id) fail("You can't delete your own account.");
  const u = await db.user.findFirst({ where: { id, organizationId: me.org.id } });
  if (!u) fail("User not found.");
  if (u!.role === "CEO" && me.role !== "CEO") fail("Only the CEO can change the CEO's account.");
  await db.user.delete({ where: { id } });
  revalidatePath("/users");
  done("{name} deleted.", { name: u!.name });
}
