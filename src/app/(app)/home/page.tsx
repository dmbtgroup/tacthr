import Link from "next/link";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

/** The start page: figures for the company and where to go next. */
export default async function HomePage() {
  const user = await requireUser();
  const t = await getT();
  const orgId = user.org.id;
  const [staff, departments, users] = await Promise.all([
    db.employee.count({ where: { organizationId: orgId, active: true } }),
    db.department.count({ where: { organizationId: orgId } }),
    db.user.count({ where: { organizationId: orgId, active: true } }),
  ]);
  const cards = [
    { label: t("Active staff"), value: staff, href: "/staff" },
    { label: t("Departments"), value: departments, href: "/staff" },
    { label: t("Users"), value: users, href: "/users" },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("Welcome, {name}", { name: user.name })}</h1>
      {canManage(user) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="card border-s-4 border-s-brand-500 hover:shadow-md">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="text-3xl font-semibold text-ink">{new Intl.NumberFormat(t.locale).format(c.value)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
