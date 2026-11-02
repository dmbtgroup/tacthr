import { dateInputValue } from "@/lib/dates";
import type { Lang } from "@/lib/i18n";

/** A date box: Jalali (1404/06/05) in Persian, the browser's date picker in English. */
export function DateField({ name, value, lang, required }: { name: string; value?: Date | null; lang: Lang; required?: boolean }) {
  if (lang === "fa")
    return (
      <input
        className="input text-start"
        name={name}
        defaultValue={dateInputValue(value, "fa")}
        placeholder="1404/01/01"
        pattern="[0-9۰-۹]{4}/[0-9۰-۹]{1,2}/[0-9۰-۹]{1,2}"
        inputMode="numeric"
        dir="ltr"
        required={required}
      />
    );
  return <input className="input" type="date" name={name} defaultValue={dateInputValue(value, "en")} required={required} />;
}
