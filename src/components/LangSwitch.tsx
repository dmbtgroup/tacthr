import { setLang } from "@/lib/i18n/actions";
import { getLang, getLanguages } from "@/lib/i18n/server";
import type { Lang } from "@/lib/i18n";

const NAMES: Record<Lang, [string, string]> = { fa: ["فا", "فارسی"], en: ["EN", "English"] };

/** The switch between the company's languages (فا | EN); the choice is kept in a cookie. Hidden with one language. */
export async function LangSwitch() {
  const [lang, langs] = await Promise.all([getLang(), getLanguages()]);
  if (langs.length < 2) return null;
  return (
    <form action={setLang} className="inline-flex divide-x divide-slate-300 overflow-hidden rounded border border-slate-300 rtl:divide-x-reverse">
      {langs.map((l) => (
        <button
          key={l}
          type="submit"
          name="lang"
          value={l}
          title={NAMES[l][1]}
          aria-pressed={lang === l}
          className={`px-2 py-0.5 text-xs font-medium ${lang === l ? "bg-ink text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
        >
          {NAMES[l][0]}
        </button>
      ))}
    </form>
  );
}
