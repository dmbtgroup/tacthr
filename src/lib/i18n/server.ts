import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { companyLangs, isLang, LANG_COOKIE, LANGS, makeT, type Lang } from ".";
import { getCurrentUser } from "../auth";
import { db } from "../db";
import { COMPANY_HEADER } from "../session";

/** The languages on offer: the signed-in user's company's, or on a company's sign-in page that company's. */
export const getLanguages = cache(async (): Promise<Lang[]> => {
  const user = await getCurrentUser();
  if (user?.org) return companyLangs(user.org.languages);
  const slug = (await headers()).get(COMPANY_HEADER);
  if (slug) {
    const org = await db.organization.findUnique({ where: { slug }, select: { languages: true } });
    if (org) return companyLangs(org.languages);
  }
  return [...LANGS];
});

/** The visitor's language: their choice, else their browser's, else the first on offer. */
export const getLang = cache(async (): Promise<Lang> => {
  const offered = await getLanguages();
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(chosen) && offered.includes(chosen)) return chosen;
  const accept = (await headers()).get("accept-language") ?? "";
  const browser: Lang = /^\s*en\b/i.test(accept) ? "en" : "fa";
  return offered.includes(browser) ? browser : offered[0];
});

export const getT = cache(async () => makeT(await getLang()));
