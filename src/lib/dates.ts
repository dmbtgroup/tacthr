import { toGregorian, toJalaali, jalaaliMonthLength } from "jalaali-js";

/**
 * Dates are stored as UTC midnight. Persian screens show and accept Jalali dates (1404/06/05),
 * English screens Gregorian ones (2025-08-27). Evaluation periods always follow the Persian year.
 */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Persian or Arabic digits typed on a Persian keyboard become 0–9; Persian separators become . and nothing. */
export function latinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[٬,]/g, "");
}

export function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

export function jalaliToDate(jy: number, jm: number, jd: number) {
  const g = toGregorian(jy, jm, jd);
  return utcDate(g.gy, g.gm, g.gd);
}

export function dateToJalali(d: Date) {
  return toJalaali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Reads a typed date: Jalali "1404/6/5" (year below 1700) or Gregorian "2025-08-27".
 * Returns null for empty or impossible dates.
 */
export function parseDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const m = latinDigits(input.trim()).match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return null;
  if (y < 1700) {
    if (d > jalaaliMonthLength(y, mo)) return null;
    return jalaliToDate(y, mo, d);
  }
  const date = utcDate(y, mo, d);
  return date.getUTCMonth() === mo - 1 ? date : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The value for a date box: Jalali for Persian, Gregorian ISO for English. */
export function dateInputValue(d: Date | null | undefined, lang: "fa" | "en"): string {
  if (!d) return "";
  if (lang === "fa") {
    const j = dateToJalali(d);
    return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
  }
  return d.toISOString().slice(0, 10);
}

/** A date for display in the viewer's language and calendar. */
export function formatDate(d: Date | null | undefined, locale: string): string {
  if (!d) return "";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(d);
}

/** The Jalali year that a date falls in. */
export function jalaliYear(d: Date) {
  return dateToJalali(d).jy;
}

/** First and last day of a half-year: 1 = Farvardin–Shahrivar, 2 = Mehr–Esfand. */
export function halfRange(year: number, half: 1 | 2) {
  if (half === 1) return { start: jalaliToDate(year, 1, 1), end: jalaliToDate(year, 6, 31) };
  return { start: jalaliToDate(year, 7, 1), end: jalaliToDate(year, 12, jalaaliMonthLength(year, 12)) };
}

/** Evaluations are due 20 days after the half ends (HR-WI-01 section 5). */
export function evaluationDeadline(year: number, half: 1 | 2) {
  const d = new Date(halfRange(year, half).end);
  d.setUTCDate(d.getUTCDate() + 20);
  return d;
}

/** Salaries are set by 31 Farvardin (salary instruction section 5). */
export function salaryDeadline(year: number) {
  return jalaliToDate(year, 1, 31);
}

/** Today at UTC midnight. */
export function today() {
  const n = new Date();
  return utcDate(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate());
}

/** Whole days from a to b. */
export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
