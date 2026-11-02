import { db } from "@/lib/db";
import { canManage, canScore, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";
import { Flash } from "@/components/Flash";
import { Modal } from "@/components/Modal";
import { EditIcon } from "@/components/EditIcon";
import { TrashIcon } from "@/components/TrashIcon";
import { DateField } from "@/components/DateField";
import { deleteDepartment, deleteEmployee, importStaff, saveDepartment, saveEmployee } from "./actions";

type Person = {
  id: string;
  code: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  departmentId: string | null;
  managerId: string | null;
  startDate: Date | null;
  fullTime: boolean;
  active: boolean;
};

function EmployeeForm({
  t,
  e,
  departments,
  people,
}: {
  t: T;
  e?: Person;
  departments: { id: string; name: string }[];
  people: Person[];
}) {
  return (
    <form action={saveEmployee} className="space-y-3 text-start">
      {e && <input type="hidden" name="id" value={e.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">{t("First name")}</label>
          <input className="input" name="firstName" defaultValue={e?.firstName} required />
        </div>
        <div>
          <label className="label">{t("Last name")}</label>
          <input className="input" name="lastName" defaultValue={e?.lastName} required />
        </div>
        <div>
          <label className="label">{t("Personnel no.")}</label>
          <input className="input" name="code" defaultValue={e?.code ?? ""} dir="ltr" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">{t("Job title")}</label>
          <input className="input" name="jobTitle" defaultValue={e?.jobTitle ?? ""} />
        </div>
        <div>
          <label className="label">{t("Department")}</label>
          <select className="input" name="departmentId" defaultValue={e?.departmentId ?? ""}>
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("Supervisor")}</label>
          <select className="input" name="managerId" defaultValue={e?.managerId ?? ""}>
            <option value="">—</option>
            {people
              .filter((p) => p.id !== e?.id && p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
          </select>
        </div>
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <div>
          <label className="label">{t("Start date")}</label>
          <DateField name="startDate" value={e?.startDate} lang={t.lang} />
        </div>
        <label className="flex items-center gap-2 py-2 text-sm">
          <input type="checkbox" name="fullTime" defaultChecked={e?.fullTime ?? true} /> {t("Full-time")}
        </label>
        {e && (
          <label className="flex items-center gap-2 py-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={e.active} /> {t("Active")}
          </label>
        )}
      </div>
      <button className="btn-primary" type="submit">{t("Save")}</button>
    </form>
  );
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; dept?: string; left?: string }>;
}) {
  const user = await requireUser(canScore);
  const t = await getT();
  const sp = await searchParams;
  const manage = canManage(user);
  const orgId = user.org.id;
  const [departments, all] = await Promise.all([
    db.department.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" }, include: { _count: { select: { employees: true } } } }),
    db.employee.findMany({
      where: { organizationId: orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { department: true, manager: true, user: { select: { email: true } } },
    }),
  ]);
  // A manager sees the people they supervise, directly or through their supervisors.
  let visible = all;
  if (!manage) {
    const mine = new Set<string>();
    let frontier = user.employeeId ? [user.employeeId] : [];
    while (frontier.length) {
      const next = all.filter((e) => e.managerId && frontier.includes(e.managerId) && !mine.has(e.id)).map((e) => e.id);
      next.forEach((id) => mine.add(id));
      frontier = next;
    }
    visible = all.filter((e) => mine.has(e.id));
  }
  const shown = visible.filter(
    (e) => (sp.left ? !e.active : e.active) && (!sp.dept || (sp.dept === "none" ? !e.departmentId : e.departmentId === sp.dept)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-2xl font-semibold">{manage ? t("Staff") : t("My team")}</h1>
        {manage && (
          <>
            <Modal buttonLabel={t("Import from Excel")} buttonClassName="btn-secondary" title={t("Import staff from Excel")}>
              <form action={importStaff} className="space-y-3">
                <p className="text-sm text-slate-600">
                  {t("One person per row, under a heading row, in these columns:")}
                </p>
                <ol className="list-decimal space-y-0.5 ps-6 text-sm text-slate-700">
                  <li>{t("Personnel no.")}</li>
                  <li>{t("First name")}</li>
                  <li>{t("Last name")}</li>
                  <li>{t("Job title")}</li>
                  <li>{t("Department")}</li>
                  <li>{t("Supervisor's personnel no.")}</li>
                  <li>{t("Start date (e.g. 1399/11/08)")}</li>
                  <li>{t("Full-time (yes / no)")}</li>
                </ol>
                <p className="text-sm text-slate-600">{t("People already here with the same personnel no. are updated.")}</p>
                <input className="input" type="file" name="file" accept=".xlsx" required />
                <button className="btn-primary" type="submit">{t("Import")}</button>
              </form>
            </Modal>
            <Modal buttonLabel={`+ ${t("New person")}`} title={t("New person")}>
              <EmployeeForm t={t} departments={departments} people={all} />
            </Modal>
          </>
        )}
      </div>
      <Flash error={sp.error} notice={sp.notice} />

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{t("Department")}</label>
          <select className="input" name="dept" defaultValue={sp.dept ?? ""}>
            <option value="">{t("All")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
            <option value="none">{t("No department")}</option>
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm">
          <input type="checkbox" name="left" value="1" defaultChecked={!!sp.left} /> {t("People who left")}
        </label>
        <button className="btn-secondary" type="submit">{t("Show")}</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table table-stack">
          <thead>
            <tr>
              <th className="ps-4">{t("Name")}</th>
              <th>{t("Personnel no.")}</th>
              <th>{t("Job title")}</th>
              <th>{t("Department")}</th>
              <th>{t("Supervisor")}</th>
              <th>{t("Start date")}</th>
              {manage && <th />}
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td data-label={t("Name")} className="ps-4 font-medium">
                  {e.firstName} {e.lastName}
                  {!e.fullTime && <span className="ms-2 rounded bg-slate-100 px-1.5 text-xs text-slate-600">{t("Part-time")}</span>}
                </td>
                <td data-label={t("Personnel no.")}>{e.code}</td>
                <td data-label={t("Job title")}>{e.jobTitle}</td>
                <td data-label={t("Department")}>{e.department?.name}</td>
                <td data-label={t("Supervisor")}>{e.manager && `${e.manager.firstName} ${e.manager.lastName}`}</td>
                <td data-label={t("Start date")}>{formatDate(e.startDate, t.locale)}</td>
                {manage && (
                  <td className="whitespace-nowrap text-end">
                    <Modal
                      buttonLabel={<EditIcon />}
                      buttonAriaLabel={t("Edit")}
                      buttonClassName="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title={`${e.firstName} ${e.lastName}`}
                    >
                      <EmployeeForm t={t} e={e} departments={departments} people={all} />
                    </Modal>
                    <form action={deleteEmployee} className="inline">
                      <input type="hidden" name="id" value={e.id} />
                      <button className="rounded p-1.5 text-red-600 hover:bg-red-50" type="submit" aria-label={t("Delete")} title={t("Delete")}>
                        <TrashIcon />
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="ps-4 text-slate-500">{t("No one to show.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {manage && (
        <section className="card space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="me-auto text-lg font-semibold">{t("Departments")}</h2>
            <Modal buttonLabel={`+ ${t("Add")}`} buttonClassName="btn-secondary" title={t("New department")}>
              <form action={saveDepartment} className="flex gap-2">
                <input className="input" name="name" required />
                <button className="btn-primary shrink-0" type="submit">{t("Add")}</button>
              </form>
            </Modal>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center gap-2 py-1.5">
                <span className="me-auto">
                  {d.name} <span className="text-slate-400">({new Intl.NumberFormat(t.locale).format(d._count.employees)})</span>
                </span>
                <Modal
                  buttonLabel={<EditIcon />}
                  buttonAriaLabel={t("Edit")}
                  buttonClassName="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  title={t("Rename department")}
                >
                  <form action={saveDepartment} className="flex gap-2">
                    <input type="hidden" name="id" value={d.id} />
                    <input className="input" name="name" defaultValue={d.name} required />
                    <button className="btn-primary shrink-0" type="submit">{t("Save")}</button>
                  </form>
                </Modal>
                <form action={deleteDepartment}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="rounded p-1.5 text-red-600 hover:bg-red-50" type="submit" aria-label={t("Delete")} title={t("Delete")}>
                    <TrashIcon />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
