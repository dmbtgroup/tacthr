import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

/** My results: the person page of the signed-in user's own staff record. */
export default async function MePage() {
  const user = await requireUser();
  redirect(user.employeeId ? `/people/${user.employeeId}` : "/home");
}
