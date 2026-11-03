import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canScore, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { periodLabel } from "@/lib/format";
import { factorsFor, mayBoardApprove, mayManagerApprove, mayScore, maySee } from "@/lib/evaluations";
import { Flash } from "@/components/Flash";
import { StatusBadge } from "@/components/Score";
import { boardApprove, managerApprove, sendBack } from "../../actions";
import { ScoreForm } from "./ScoreForm";

export default async function ScorePage({
  params,
  searchParams,
}: {
  params: Promise<{ periodId: string; employeeId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser(canScore);
  const t = await getT();
  const { periodId, employeeId } = await params;
  const ev = await db.evaluation.findFirst({
    where: { periodId, employeeId, period: { organizationId: user.org.id } },
    include: {
      scores: true,
      period: { include: { indicators: { orderBy: { position: "asc" } } } },
      employee: { include: { department: true, manager: { select: { firstName: true, lastName: true, managerId: true } } } },
    },
  });
  if (!ev) notFound();
  if (!(await maySee(user, employeeId)) || employeeId === user.employeeId) redirect(`/evaluations/${periodId}`);

  const p = ev.employee;
  const editable = !ev.period.closed && ev.status === "DRAFT" && mayScore(user, p);
  const { shared, own } = factorsFor(ev.period.indicators, ev.period.method, p.departmentId);
  const open = !ev.period.closed;
  const canManager = open && ev.status === "SUBMITTED" && mayManagerApprove(user, p);
  const canBoard = open && ev.status === "MANAGER_APPROVED" && mayBoardApprove(user, p);
  const canSendBack = open && (canManager || (ev.status !== "DRAFT" && user.role === "CEO") || (ev.status === "SUBMITTED" && mayScore(user, p)));

  const steps = [
    ev.scoredByName && t("Scored by {name}", { name: ev.scoredByName }),
    ev.managerApprovedByName && t("Approved by {name} (manager)", { name: ev.managerApprovedByName }),
    ev.approvedByName && t("Approved by {name} (board)", { name: ev.approvedByName }),
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="me-auto">
          <Link href={`/evaluations/${periodId}`} className="text-sm text-slate-500 hover:text-brand-700">
            <span className="inline-block rtl:rotate-180" aria-hidden>←</span> {periodLabel(t, ev.period.year, ev.period.half)}
          </Link>
          <h1 className="text-2xl font-semibold">
            <Link href={`/people/${p.id}`} className="hover:text-brand-700">{p.firstName} {p.lastName}</Link>
          </h1>
          <p className="text-sm text-slate-500">
            {[p.jobTitle, p.department?.name, p.manager && t("Supervisor: {name}", { name: `${p.manager.firstName} ${p.manager.lastName}` })]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge t={t} status={ev.status} />
          {steps.map((s) => (
            <p key={s as string} className="text-xs text-slate-500">{s}</p>
          ))}
        </div>
      </div>
      <Flash {...await searchParams} />

      {(canManager || canBoard || canSendBack) && (
        <div className="card flex flex-wrap items-center gap-2">
          {canManager && (
            <form action={managerApprove}>
              <input type="hidden" name="evaluationId" value={ev.id} />
              <button className="btn-success" type="submit">{t("Approve")}</button>
            </form>
          )}
          {canBoard && (
            <form action={boardApprove}>
              <input type="hidden" name="evaluationId" value={ev.id} />
              <button className="btn-success" type="submit">{t("Approve (board)")}</button>
            </form>
          )}
          {canSendBack && (
            <form action={sendBack}>
              <input type="hidden" name="evaluationId" value={ev.id} />
              <button className="btn-secondary" type="submit">{t("Send back for changes")}</button>
            </form>
          )}
        </div>
      )}

      <ScoreForm
        evaluationId={ev.id}
        method={ev.period.method}
        efficiencyShare={ev.period.efficiencyShare}
        shared={shared.map((f) => ({ id: f.id, name: f.name, description: f.description, weight: f.weight }))}
        own={own.map((f) => ({ id: f.id, name: f.name, description: f.description, weight: f.weight }))}
        ownTitle={t("Effectiveness factors: {department}", { department: p.department?.name ?? "" })}
        initial={Object.fromEntries(ev.scores.map((s) => [s.indicatorId, s.score]))}
        band={ev.effectivenessBand}
        effScore={ev.effectivenessScore}
        notes={ev.notes}
        editable={editable}
      />
    </div>
  );
}
