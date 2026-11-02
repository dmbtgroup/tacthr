"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endSession, getCurrentUser, startSession } from "@/lib/auth";
import { HOME_COOKIE, SLUG_PATTERN } from "@/lib/session";
import { BASE_PATH } from "@/lib/paths";

/**
 * Signs in. On a company's page (/homeco) that company's account with this email is tried, then a
 * platform admin's; the main page (/login) signs in platform admins only.
 */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const company = String(formData.get("company") ?? "");
  const back = company ? `/${encodeURIComponent(company)}` : "/login";

  const include = { organization: { select: { active: true, slug: true } } } as const;
  const admin = () => db.user.findFirst({ where: { email, isPlatformAdmin: true, organizationId: null }, include });
  const candidates = company
    ? [await db.user.findFirst({ where: { email, organization: { slug: company } }, include }), await admin()]
    : [await admin()];
  let user = null;
  for (const x of candidates) {
    if (x?.active && (await bcrypt.compare(password, x.passwordHash))) {
      user = x;
      break;
    }
  }
  if (!user) redirect(`${back}?error=1`);
  if (user.organization && !user.organization.active) redirect(`${back}?error=suspended`);

  await startSession(user.id);
  if (user.organization) {
    (await cookies()).set(HOME_COOKIE, user.organization.slug, {
      path: BASE_PATH || "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  redirect(user.isPlatformAdmin ? "/platform" : "/home");
}

export async function logout() {
  const user = await getCurrentUser();
  const home = (await cookies()).get(HOME_COOKIE)?.value;
  await endSession();
  redirect(!user?.isPlatformAdmin && home && SLUG_PATTERN.test(home) ? `/${home}` : "/login");
}
