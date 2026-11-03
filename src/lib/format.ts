import type { T } from "./i18n";
import { latinDigits } from "./dates";

/** A number in the viewer's digits, with up to `digits` decimals. */
export function num(t: T, n: number | null | undefined, digits = 2): string {
  if (n == null) return "";
  return new Intl.NumberFormat(t.locale, { maximumFractionDigits: digits }).format(n);
}

/** A percentage, e.g. 86.5 → "86.5 %" ("٪۸۶٫۵" in Persian). */
export function pct(t: T, n: number | null | undefined, digits = 2): string {
  if (n == null) return "";
  return new Intl.NumberFormat(t.locale, { style: "percent", maximumFractionDigits: digits }).format(n / 100);
}

/** Rials with thousands separators. */
export function rials(t: T, n: bigint | null | undefined): string {
  if (n == null) return "";
  return `${new Intl.NumberFormat(t.locale).format(n)} ${t("rials")}`;
}

/** Reads a typed number (Persian digits and separators allowed); null when empty or not a number. */
export function parseNum(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = latinDigits(String(v)).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Reads a typed rial amount (whole number). */
export function parseRials(v: FormDataEntryValue | null): bigint | null {
  if (v == null) return null;
  const s = latinDigits(String(v)).replace(/\s/g, "");
  if (!/^\d+$/.test(s)) return null;
  return BigInt(s);
}

/** A year as written, without a thousands separator: ۱۴۰۴ / 1404. */
export function year(t: T, y: number): string {
  return new Intl.NumberFormat(t.locale, { useGrouping: false }).format(y);
}

/** "First half 1404" / "نیمه اول ۱۴۰۴". */
export function periodLabel(t: T, y: number, half: number): string {
  return t(half === 1 ? "First half {year}" : "Second half {year}", { year: year(t, y) });
}
