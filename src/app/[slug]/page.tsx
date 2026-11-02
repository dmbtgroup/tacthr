import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SLUG_PATTERN } from "@/lib/session";
import { LoginForm } from "../login/LoginForm";

/** A company's own sign-in page, e.g. tacthr.dmbtgroup.com/homeco. */
export default async function CompanySignIn({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const slug = (await params).slug.toLowerCase();
  if (!SLUG_PATTERN.test(slug)) notFound();
  const org = await db.organization.findUnique({ where: { slug }, select: { slug: true, name: true } });
  if (!org) notFound();
  const user = await getCurrentUser();
  if (user?.org?.slug === slug) redirect("/home");
  return <LoginForm company={org} error={(await searchParams).error} />;
}
