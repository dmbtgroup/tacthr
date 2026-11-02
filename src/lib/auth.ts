import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EvalMethod, Role } from "@prisma/client";
import { db } from "./db";
import { BASE_PATH } from "./paths";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

export type OrgInfo = { id: string; slug: string; name: string; method: EvalMethod; efficiencyShare: number; languages: string[] };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  role: Role;
  /** The user's own staff record, if linked. */
  employeeId: string | null;
  org: OrgInfo | null;
};

export type OrgUser = SessionUser & { org: OrgInfo };

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const userId = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        select: { id: true, slug: true, name: true, method: true, efficiencyShare: true, languages: true, active: true },
      },
    },
  });
  if (!user || !user.active) return null;
  if (user.organization && !user.organization.active) return null;
  const o = user.organization;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin,
    role: user.role,
    employeeId: user.employeeId,
    org: o
      ? { id: o.id, slug: o.slug, name: o.name, method: o.method, efficiencyShare: o.efficiencyShare, languages: o.languages }
      : null,
  };
});

/** HR and the CEO manage the company: staff, users, periods, factors, settings. */
export function canManage(u: SessionUser) {
  return u.role === "HR" || u.role === "CEO";
}

/** The CEO/board gives the final approvals, the CEO score and the salary figures. */
export function isBoard(u: SessionUser) {
  return u.role === "CEO";
}

/** Who scores staff: managers (their own reports), HR and the CEO. */
export function canScore(u: SessionUser) {
  return u.role !== "EMPLOYEE";
}

/** Requires a signed-in member of a company; `allowed` gates the page or action. */
export async function requireUser(allowed?: (user: OrgUser) => boolean): Promise<OrgUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.org) redirect("/platform");
  const orgUser = user as OrgUser;
  if (allowed && !allowed(orgUser)) redirect("/home");
  return orgUser;
}

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isPlatformAdmin) redirect("/home");
  return user;
}

export async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: BASE_PATH || "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: BASE_PATH || "/" });
}
