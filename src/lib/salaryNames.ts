import type { T } from "./i18n";
import type { Education, Rank } from "./calc";

/** Names of the salary instruction's levels, in the viewer's language. */
export function educationName(t: T, e: Education) {
  return { DIPLOMA: t("Diploma or less"), ASSOCIATE: t("Associate degree"), BACHELOR: t("Bachelor's"), MASTER: t("Master's"), DOCTORATE: t("Doctorate or higher") }[e];
}

export function rankName(t: T, r: Rank) {
  return { EMPLOYEE: t("Employee"), EXPERT: t("Expert"), SENIOR_EXPERT: t("Senior expert"), SUPERVISOR: t("Supervisor"), MANAGER: t("Manager") }[r];
}

export function sensitivityName(t: T, n: number) {
  return [t("None"), t("Very low"), t("Low"), t("Medium"), t("High"), t("Very high")][n];
}

export function difficultyLevelName(t: T, l: "NONE" | "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH") {
  return { NONE: t("None"), VERY_LOW: t("Very low"), LOW: t("Low"), MEDIUM: t("Medium"), HIGH: t("High"), VERY_HIGH: t("Very high") }[l];
}

export const EDUCATIONS: Education[] = ["DIPLOMA", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE"];
export const RANKS: Rank[] = ["EMPLOYEE", "EXPERT", "SENIOR_EXPERT", "SUPERVISOR", "MANAGER"];
