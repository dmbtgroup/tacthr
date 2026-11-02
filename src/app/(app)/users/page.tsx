import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n";
import { Flash } from "@/components/Flash";
import { Modal } from "@/components/Modal";
import { EditIcon } from "@/components/EditIcon";
import { TrashIcon } from "@/components/TrashIcon";
import { deleteUser, saveUser } from "./actions";
import { roleName } from "@/lib/roles";

type U = { id: string; name: string; email: string; role: Role; employeeId: string | null; active: boolean };

function UserForm({ t, u, people }: { t: T; u?: U; people: { id: string; name: string; taken: boolean }[] }) {
  return (
    <form action={saveUser} className="space-y-3 text-start">
      {u && <input type="hidden" name="id" value={u.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("Name")}</label>
          <input className="input" name="name" defaultValue={u?.name} required />
        </div>
        <div>
          <label className="label">{t("Email")}</label>
          <input className="input" name="email" type="email" defaultValue={u?.email} dir="ltr" required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">{t("Role")}</label>
          <select className="input" name="role" defaultValue={u?.role ?? "EMPLOYEE"}>
            {(["EMPLOYEE", "MANAGER", "HR", "CEO"] as Role[]).map((r) => (
              <option key={r} value={r}>{roleName(t, r)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("Staff record")}</label>
          <select className="input" name="employeeId" defaultValue={u?.employeeId ?? ""}>
            <option value="">—</option>
            {people
              .filter((p) => !p.taken || p.id === u?.employeeId)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label className="label">{u ? t("New password") : t("Password")}</label>
          <input className="input" name="password" type="password" minLength={8} dir="ltr" required={!u} autoComplete="new-password" />
        </div>
      </div>
      {u && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={u.active} /> {t("Active (can sign in)")}
        </label>
      )}
      <button className="btn-primary" type="submit">{t("Save")}</button>
    </form>
  );
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireUser(canManage);
  const t = await getT();
  const [users, employees] = await Promise.all([
    db.user.findMany({ where: { organizationId: me.org.id }, orderBy: { name: "asc" }, include: { employee: true } }),
    db.employee.findMany({
      where: { organizationId: me.org.id, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { user: { select: { id: true } } },
    }),
  ]);
  const people = employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, taken: !!e.user }));
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="me-auto text-2xl font-semibold">{t("Users")}</h1>
        <Modal buttonLabel={`+ ${t("New user")}`} title={t("New user")}>
          <UserForm t={t} people={people} />
        </Modal>
      </div>
      <p className="text-sm text-slate-600">
        {t("Everyone signs in at")}{" "}
        <span className="font-medium" dir="ltr">tacthr.dmbtgroup.com/{me.org.slug}</span>
      </p>
      <Flash {...await searchParams} />
      <div className="card overflow-x-auto p-0">
        <table className="table table-stack">
          <thead>
            <tr>
              <th className="ps-4">{t("Name")}</th>
              <th>{t("Email")}</th>
              <th>{t("Role")}</th>
              <th>{t("Staff record")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "text-slate-400"}>
                <td data-label={t("Name")} className="ps-4 font-medium">{u.name}</td>
                <td data-label={t("Email")} dir="ltr" className="text-start">{u.email}</td>
                <td data-label={t("Role")}>{roleName(t, u.role)}</td>
                <td data-label={t("Staff record")}>{u.employee && `${u.employee.firstName} ${u.employee.lastName}`}</td>
                <td className="whitespace-nowrap text-end">
                  <Modal
                    buttonLabel={<EditIcon />}
                    buttonAriaLabel={t("Edit")}
                    buttonClassName="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    title={u.name}
                  >
                    <UserForm t={t} u={u} people={people} />
                  </Modal>
                  {u.id !== me.id && (
                    <form action={deleteUser} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button className="rounded p-1.5 text-red-600 hover:bg-red-50" type="submit" aria-label={t("Delete")} title={t("Delete")}>
                        <TrashIcon />
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
