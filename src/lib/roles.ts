import type { Role } from "@prisma/client";
import type { T } from "./i18n";

export function roleName(t: T, r: Role) {
  return { HR: t("HR"), CEO: t("CEO / board"), MANAGER: t("Manager / supervisor"), EMPLOYEE: t("Employee") }[r];
}
