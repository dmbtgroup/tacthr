"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("fa");

/** Gives client components the visitor's language. */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useT() {
  const lang = useContext(LangContext);
  return useMemo(() => makeT(lang), [lang]);
}
