import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n";
import { CURRENT_WEIGHT_TOTAL, DEPT_WEIGHT_TOTAL, MAX_WEIGHT_CURRENT, MAX_WEIGHT_DEPT } from "@/lib/calc";
import { num } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { Modal } from "@/components/Modal";
import { EditIcon } from "@/components/EditIcon";
import { TrashIcon } from "@/components/TrashIcon";
import { deleteFactor, resetFactors, saveFactor } from "./actions";

type F = { id: string; name: string; description: string | null; weight: number };

function FactorForm({ t, f, departmentId, max }: { t: T; f?: F; departmentId?: string; max: number }) {
  return (
    <form action={saveFactor} className="space-y-3 text-start">
      {f && <input type="hidden" name="id" value={f.id} />}
      {departmentId && <input type="hidden" name="departmentId" value={departmentId} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <label className="label">{t("Factor")}</label>
          <input className="input" name="name" defaultValue={f?.name} required />
        </div>
        <div>
          <label className="label">{t("Weight (1–{max})", { max })}</label>
          <input className="input" name="weight" type="number" min={1} max={max} step={1} defaultValue={f?.weight} required />
        </div>
      </div>
      <div>
        <label className="label">{t("Description")}</label>
        <textarea className="input" name="description" rows={2} defaultValue={f?.description ?? ""} />
      </div>
      <button className="btn-primary" type="submit">{t("Save")}</button>
    </form>
  );
}

function Group({ t, title, factors, total, max, departmentId }: { t: T; title: string; factors: F[]; total: number; max: number; departmentId?: string }) {
  const sum = factors.reduce((s, f) => s + f.weight, 0);
  const ok = sum === total;
  return (
    <section className="card space-y-2 p-0">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={`rounded px-2 py-0.5 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {t("Total weight {sum} of {total}", { sum: num(t, sum), total: num(t, total) })}
        </span>
        <span className="ms-auto" />
        <Modal buttonLabel={`+ ${t("Add")}`} buttonClassName="btn-secondary" title={t("New factor")}>
          <FactorForm t={t} departmentId={departmentId} max={max} />
        </Modal>
      </div>
      <table className="table table-stack">
        <thead>
          <tr>
            <th className="ps-4">{t("Factor")}</th>
            <th>{t("Description")}</th>
            <th className="text-center">{t("Weight")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {factors.map((f) => (
            <tr key={f.id}>
              <td data-label={t("Factor")} className="ps-4 font-medium">{f.name}</td>
              <td data-label={t("Description")} className="text-slate-600">{f.description}</td>
              <td data-label={t("Weight")} className="text-center">{num(t, f.weight)}</td>
              <td className="whitespace-nowrap text-end">
                <Modal
                  buttonLabel={<EditIcon />}
                  buttonAriaLabel={t("Edit")}
                  buttonClassName="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  title={f.name}
                >
                  <FactorForm t={t} f={f} max={max} />
                </Modal>
                <form action={deleteFactor} className="inline">
                  <input type="hidden" name="id" value={f.id} />
                  <button className="rounded p-1.5 text-red-600 hover:bg-red-50" type="submit" aria-label={t("Delete")} title={t("Delete")}>
                    <TrashIcon />
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function FactorsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser(canManage);
  const t = await getT();
  const orgId = user.org.id;
  const current = user.org.method === "CURRENT";
  const [factors, departments] = await Promise.all([
    db.indicator.findMany({ where: { organizationId: orgId }, orderBy: { position: "asc" } }),
    db.department.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
  ]);
  const shared = factors.filter((f) => !f.departmentId);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-2xl font-semibold">{t("Factors")}</h1>
        <Modal buttonLabel={t("Restore defaults")} buttonClassName="btn-secondary" title={t("Restore defaults")}>
          <form action={resetFactors} className="space-y-3">
            <p className="text-sm text-slate-600">
              {t("Replaces every factor and weight with the instruction's defaults. Evaluations already opened keep theirs.")}
            </p>
            <button className="btn-danger" type="submit">{t("Restore defaults")}</button>
          </form>
        </Modal>
      </div>
      <Flash {...await searchParams} />
      <Group
        t={t}
        title={current ? t("Efficiency factors") : t("Shared efficiency factors")}
        factors={shared}
        total={current ? CURRENT_WEIGHT_TOTAL : DEPT_WEIGHT_TOTAL}
        max={current ? MAX_WEIGHT_CURRENT : MAX_WEIGHT_DEPT}
      />
      {!current &&
        departments.map((d) => (
          <Group
            key={d.id}
            t={t}
            title={t("Effectiveness factors: {department}", { department: d.name })}
            factors={factors.filter((f) => f.departmentId === d.id)}
            total={DEPT_WEIGHT_TOTAL}
            max={MAX_WEIGHT_DEPT}
            departmentId={d.id}
          />
        ))}
    </div>
  );
}
