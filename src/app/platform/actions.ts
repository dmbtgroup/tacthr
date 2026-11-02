"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EvalMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { createCompany, seedFactors } from "@/lib/orgs";
import { loadDemoData } from "@/lib/demo";
import { msg } from "@/lib/i18n/message";
import { SLUG_PATTERN } from "@/lib/session";

const fail = (key: string, vars?: Record<string, string | number>) => redirect(`/platform?error=${encodeURIComponent(msg(key, vars))}`);
const done = (key: string, vars?: Record<string, string | number>) => redirect(`/platform?notice=${encodeURIComponent(msg(key, vars))}`);

function readCompany(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const method: EvalMethod = form.get("method") === "DEPARTMENT" ? "DEPARTMENT" : "CURRENT";
  const languages = ["fa", "en"].filter((l) => form.get(`lang_${l}`));
  return { name, slug, method, languages: languages.length ? languages : ["fa"] };
}

export async function addCompany(form: FormData) {
  await requirePlatformAdmin();
  const c = readCompany(form);
  const admin = {
    name: String(form.get("adminName") ?? "").trim(),
    email: String(form.get("adminEmail") ?? "").trim().toLowerCase(),
    password: String(form.get("adminPassword") ?? ""),
  };
  if (!c.name) fail("Enter the company's name.");
  if (!SLUG_PATTERN.test(c.slug) || ["login", "platform", "home"].includes(c.slug))
    fail("The address may use small letters, digits and dashes only.");
  if (await db.organization.findUnique({ where: { slug: c.slug } })) fail("The address {slug} is taken.", { slug: c.slug });
  if (!admin.name || !admin.email) fail("Enter the first user's name and email.");
  if (admin.password.length < 8) fail("Passwords need at least 8 characters.");
  await createCompany({ ...c, admin });
  revalidatePath("/platform");
  done("Company {name} created.", { name: c.name });
}

export async function editCompany(form: FormData) {
  await requirePlatformAdmin();
  const id = String(form.get("id"));
  const c = readCompany(form);
  const org = await db.organization.findUnique({ where: { id } });
  if (!org) fail("Company not found.");
  if (!c.name) fail("Enter the company's name.");
  if (!SLUG_PATTERN.test(c.slug)) fail("The address may use small letters, digits and dashes only.");
  const taken = await db.organization.findFirst({ where: { slug: c.slug, NOT: { id } } });
  if (taken) fail("The address {slug} is taken.", { slug: c.slug });
  await db.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id },
      data: { ...c, active: !!form.get("active") },
    });
    // A new method brings its own default factors; periods already opened keep theirs.
    if (org!.method !== c.method) await seedFactors(tx, id, c.method);
  });
  revalidatePath("/platform");
  done("Company {name} saved.", { name: c.name });
}

export async function deleteCompany(form: FormData) {
  await requirePlatformAdmin();
  const id = String(form.get("id"));
  const org = await db.organization.findUnique({ where: { id } });
  if (!org) fail("Company not found.");
  if (String(form.get("confirm") ?? "").trim() !== org!.name) fail("Type the company's name to delete it.");
  await db.organization.delete({ where: { id } });
  revalidatePath("/platform");
  done("Company {name} deleted.", { name: org!.name });
}

export async function demoData(form: FormData) {
  await requirePlatformAdmin();
  const id = String(form.get("id"));
  const result = await loadDemoData(id);
  if (result) fail(result);
  revalidatePath("/platform");
  done("Demo data loaded.");
}

export async function addAdmin(form: FormData) {
  await requirePlatformAdmin();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email) fail("Enter the name and email.");
  if (password.length < 8) fail("Passwords need at least 8 characters.");
  if (await db.user.findFirst({ where: { email, isPlatformAdmin: true } })) fail("{email} is already a platform admin.", { email });
  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10), isPlatformAdmin: true, role: "HR" } });
  revalidatePath("/platform");
  done("Platform admin {name} added.", { name });
}

export async function removeAdmin(form: FormData) {
  const me = await requirePlatformAdmin();
  const id = String(form.get("id"));
  if (id === me.id) fail("You can't remove yourself.");
  await db.user.delete({ where: { id } });
  revalidatePath("/platform");
  done("Platform admin removed.");
}
