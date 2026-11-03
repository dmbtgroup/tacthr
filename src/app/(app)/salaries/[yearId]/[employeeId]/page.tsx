import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canManage, isBoard, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/dates";
import { year } from "@/lib/format";
import { computeRecord, lastYearPerformance } from "@/lib/salaries";
import { Flash } from "@/components/Flash";
import { approveRecord } from "../../actions";
import { SalaryForm } from "./SalaryForm";

export default async function SalaryRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ yearId: string; employeeId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser(canManage);
  const t = await getT();
  const { yearId, employeeId } = await params;
  const [sy, p] = await Promise.all([
    db.salaryYear.findFirst({ where: { id: yearId, organizationId: user.org.id } }),
    db.employee.findFirst({ where: { id: employeeId, organizationId: user.org.id }, include: { department: true } }),
  ]);
  if (!sy || !p) notFound();
  const r = await db.salaryRecord.findUnique({ where: { salaryYearId_employeeId: { salaryYearId: yearId, employeeId } } });
  const yearly = (await lastYearPerformance(user.org.id, sy.year)).get(employeeId) ?? null;
  const res = computeRecord(r, sy, yearly);
  const board = isBoard(user);
  const canApprove = board && !sy.closed && !r?.approvedAt && res.salary != null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="me-auto">
          <Link href={`/salaries/${yearId}`} className="text-sm text-slate-500 hover:text-brand-700">
            <span className="inline-block rtl:rotate-180" aria-hidden>←</span> {t("Salaries {year}", { year: year(t, sy.year) })}
          </Link>
          <h1 className="text-2xl font-semibold">
            <Link href={`/people/${p.id}`} className="hover:text-brand-700">{p.firstName} {p.lastName}</Link>
          </h1>
          <p className="text-sm text-slate-500">
            {[p.jobTitle, p.department?.name, p.startDate && t("Since {date}", { date: formatDate(p.startDate, t.locale) })].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {r?.approvedAt ? (
            <>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">{t("Approved")}</span>
              {r.approvedByName && <p className="text-xs text-slate-500">{t("Approved by {name} (board)", { name: r.approvedByName })}</p>}
            </>
          ) : (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {res.salary == null ? t("Not complete") : t("Waiting for board")}
            </span>
          )}
          {canApprove && (
            <form action={approveRecord}>
              <input type="hidden" name="yearId" value={yearId} />
              <input type="hidden" name="employeeId" value={employeeId} />
              <button className="btn-success mt-1" type="submit">{t("Approve (board)")}</button>
            </form>
          )}
        </div>
      </div>
      <Flash {...await searchParams} />
      <SalaryForm
        yearId={yearId}
        employeeId={employeeId}
        initial={{
          education: r?.education ?? null,
          educationPct: r?.educationPct ?? null,
          experienceYears: r?.experienceYears ?? null,
          skillLevel: r?.skillLevel ?? null,
          physical: r?.physical ?? null,
          environment: r?.environment ?? null,
          mental: r?.mental ?? null,
          risk: r?.risk ?? null,
          rank: r?.rank ?? null,
          rankPct: r?.rankPct ?? null,
          sensitivity: r?.sensitivity ?? null,
          ceoPct: r?.ceoPct ?? null,
          probation: r?.probation ?? false,
          probationSalary: r?.probationSalary?.toString() ?? null,
          notes: r?.notes ?? null,
        }}
        minWage={sy.minWage.toString()}
        maxSalary={sy.maxSalary.toString()}
        bonusBase={sy.bonusBase.toString()}
        yearly={yearly}
        board={board}
        editable={!sy.closed}
      />
    </div>
  );
}
