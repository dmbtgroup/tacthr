import type { EvalStatus } from "@prisma/client";
import type { T } from "@/lib/i18n";
import { GOOD_FROM, POOR_BELOW } from "@/lib/calc";
import { pct } from "@/lib/format";

/** A percentage, green from 75 and red under 50, each with a mark so colour is never the only sign. */
export function ScorePct({ t, value }: { t: T; value: number | null | undefined }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  if (value >= GOOD_FROM)
    return (
      <span className="font-medium text-emerald-700">
        {pct(t, value)} <span aria-label={t("Good")}>▲</span>
      </span>
    );
  if (value < POOR_BELOW)
    return (
      <span className="font-medium text-red-700">
        {pct(t, value)} <span aria-label={t("Poor")}>▼</span>
      </span>
    );
  return <span>{pct(t, value)}</span>;
}

export function statusName(t: T, s: EvalStatus) {
  return { DRAFT: t("Being scored"), SUBMITTED: t("Waiting for manager"), MANAGER_APPROVED: t("Waiting for board"), APPROVED: t("Approved") }[s];
}

const STYLE: Record<EvalStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-amber-50 text-amber-800",
  MANAGER_APPROVED: "bg-sky-50 text-sky-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
};

export function StatusBadge({ t, status }: { t: T; status: EvalStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}>{statusName(t, status)}</span>;
}
