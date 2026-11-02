"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

export type ShellLink = { href: string; label: string; icon: keyof typeof ICONS };

const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  staff: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75",
  evaluations: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  salaries: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  reports: "M3 3v18h18M7 15l4-4 3 3 5-6",
  factors: "M4 6h16M4 12h10M4 18h6",
  users: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9a8 8 0 0 1 16 0",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2",
  alerts: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  platform: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
} as const;

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/** The page frame: the side menu (always open on wide screens, a drawer on phones) and a slim top bar. */
export function AppShell({
  links,
  brand,
  account,
  signOut,
  children,
}: {
  links: ShellLink[];
  brand: React.ReactNode;
  account: React.ReactNode;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const menu = (
    <nav className="flex h-full flex-col bg-[#262a31] text-slate-200">
      <div className="border-b border-white/10 px-5 py-4 text-white">{brand}</div>
      <ul className="flex-1 overflow-y-auto py-2">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-3 px-5 py-2.5 ${active ? "bg-brand-500 font-medium text-white" : "hover:bg-white/10 hover:text-white"}`}
              >
                <Icon name={l.icon} className="h-5 w-5 shrink-0" />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 px-5 py-3">{signOut}</div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">{menu}</aside>
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside
          className={`absolute inset-y-0 start-0 w-64 max-w-[85vw] shadow-xl transition-transform ${open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"}`}
          inert={!open}
        >
          {menu}
        </aside>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white/95 text-ink">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:py-3">
            <button
              type="button"
              className="-ms-1 rounded p-1.5 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label={t("Open the menu")}
              title={t("Open the menu")}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M4 6.5h16M4 12h16M4 17.5h16" />
              </svg>
            </button>
            <div className="min-w-0 lg:hidden">{brand}</div>
            <div className="ms-auto flex items-center gap-3 text-sm text-slate-500">{account}</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
