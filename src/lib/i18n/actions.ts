"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLang, LANG_COOKIE } from ".";
import { BASE_PATH } from "@/lib/paths";

export async function setLang(form: FormData) {
  const lang = form.get("lang");
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: BASE_PATH || "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
