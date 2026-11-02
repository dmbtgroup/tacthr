import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang, getT } from "@/lib/i18n/server";
import { dirOf } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: "TactHR", template: "%s · TactHR" },
    description: t("Staff performance, salary and bonus, by DMBT"),
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={dirOf(lang)}>
      <head>
        {/* Vazirmatn reads well in Persian and English alike. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
