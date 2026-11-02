import { FA } from "./fa";

export const LANGS = ["fa", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "lang";

export function isLang(s: unknown): s is Lang {
  return s === "fa" || s === "en";
}

/** A company's languages in FA, EN order; Persian when none is set. */
export function companyLangs(list: readonly string[] | null | undefined): Lang[] {
  const langs = LANGS.filter((l) => list?.includes(l));
  return langs.length ? langs : ["fa"];
}

/** Persian is written right to left. */
export function dirOf(lang: Lang) {
  return lang === "fa" ? "rtl" : "ltr";
}

/**
 * Translator for one language. Keys are the English text, so English needs no dictionary and any text
 * missing from the Persian one shows in English. `{name}` placeholders are filled from `vars`.
 */
export function makeT(lang: Lang) {
  const dict: Record<string, string> = lang === "fa" ? FA : {};
  const t = (text: string, vars?: Record<string, string | number>) => {
    const s = dict[text] ?? text;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
  };
  return Object.assign(t, {
    lang,
    /** Intl locale: Persian uses the Jalali calendar and Persian digits. */
    locale: lang === "fa" ? "fa-IR-u-ca-persian" : "en-CA",
    /** Singular or plural by count; `{n}` is the count. */
    n: (n: number, one: string, many: string, vars?: Record<string, string | number>) =>
      t(n === 1 ? one : many, { n, ...vars }),
  });
}

export type T = ReturnType<typeof makeT>;
