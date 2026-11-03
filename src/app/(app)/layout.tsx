import Link from "next/link";
import { requireUser, canManage, canScore } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { AppShell, Icon, type ShellLink } from "@/components/AppShell";
import { LangSwitch } from "@/components/LangSwitch";
import { logout } from "../login/actions";

/** Every company page: the menu shows what the user's role may open. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getT();
  const links: ShellLink[] = [{ href: "/home", label: t("Home"), icon: "home" }];
  if (canScore(user))
    links.push(
      { href: "/evaluations", label: t("Evaluations"), icon: "evaluations" },
      { href: "/reports", label: t("Reports"), icon: "reports" },
    );
  if (canManage(user)) {
    links.push(
      { href: "/salaries", label: t("Salaries and bonus"), icon: "salaries" },
      { href: "/staff", label: t("Staff"), icon: "staff" },
      { href: "/factors", label: t("Factors"), icon: "factors" },
      { href: "/users", label: t("Users"), icon: "users" },
      { href: "/settings", label: t("Settings"), icon: "settings" },
    );
  } else if (canScore(user)) links.push({ href: "/staff", label: t("My team"), icon: "staff" });
  if (user.employeeId) links.push({ href: "/me", label: t("My results"), icon: "home" });
  if (user.isPlatformAdmin) links.push({ href: "/platform", label: t("Platform"), icon: "platform" });

  return (
    <AppShell
      links={links}
      brand={
        <Link href="/home" className="block">
          <span className="block text-xs font-semibold tracking-wide text-brand-400">TactHR</span>
          <span className="block truncate font-semibold">{user.org.name}</span>
        </Link>
      }
      account={
        <>
          <Link href="/account" className="hidden hover:text-brand-700 sm:inline">{user.name}</Link>
          <LangSwitch />
        </>
      }
      signOut={
        <form action={logout}>
          <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white" type="submit">
            <Icon name="home" className="h-4 w-4 rtl:-scale-x-100" />
            {t("Sign out")}
          </button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
