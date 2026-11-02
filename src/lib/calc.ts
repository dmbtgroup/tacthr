/**
 * Every calculation of the client's Excel workbooks and HR instructions (HR-WI-01 performance, salary
 * instruction, WI1202), with the workbook's errors fixed as the instructions say. Pure functions only:
 * pages and actions call these, and calc.test.ts checks them against the documents' own examples.
 */

// ---------------------------------------------------------------- Performance: current method (out of 100)

/** Weights of the shared factors must total this (HR-WI-01; Excel cell C14). */
export const CURRENT_WEIGHT_TOTAL = 60;
/** Department method: shared factors total 65 and each department's factors total 65 (WI1202). */
export const DEPT_WEIGHT_TOTAL = 65;
export const MAX_SCORE = 5;
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT_CURRENT = 9;
export const MAX_WEIGHT_DEPT = 20;

/** Effectiveness bands, defined on 25 points (HR-WI-01 table 2); scaled when effectiveness is worth more. */
export const BANDS = [
  { key: "VERY_HIGH", min: 21, max: 25 },
  { key: "HIGH", min: 16, max: 20 },
  { key: "MEDIUM", min: 11, max: 15 },
  { key: "LOW", min: 6, max: 10 },
  { key: "VERY_LOW", min: 0, max: 5 },
] as const;
export type BandKey = (typeof BANDS)[number]["key"];

export function isBand(s: unknown): s is BandKey {
  return BANDS.some((b) => b.key === s);
}

/** The band's range for an effectiveness worth `effMax` points (25 now, 50 later). */
export function bandRange(band: BandKey, effMax = 25): { min: number; max: number } {
  const b = BANDS.find((x) => x.key === band)!;
  const f = effMax / 25;
  return { min: b.min * f, max: b.max * f };
}

export type Scored = { weight: number; score: number | null | undefined };

function weighted(items: Scored[]) {
  return items.reduce((s, i) => s + i.weight * (i.score ?? 0), 0);
}

function allScored(items: Scored[]) {
  return items.length > 0 && items.every((i) => i.score != null);
}

export type CurrentResult = {
  efficiency: number | null;
  effectiveness: number | null;
  total: number | null;
  /** What is still missing or wrong, as a message key; null when the total is final. */
  problem: null | "WEIGHTS" | "WAITING" | "CHOOSE_BAND" | "OUT_OF_BAND" | "INCOMPLETE";
  /** The allowed range for the effectiveness number, once a band is chosen. */
  range: { min: number; max: number } | null;
};

/**
 * HR-WI-01: efficiency = Σ(weight × score) ÷ 3 × 0.75 with weights totalling 60, i.e. the share (75) of
 * the weighted score's maximum; effectiveness is the number chosen inside its band; total = both.
 */
export function currentScore(
  items: Scored[],
  band: string | null | undefined,
  effScore: number | null | undefined,
  efficiencyShare = 75,
): CurrentResult {
  const effMax = 100 - efficiencyShare;
  const weightSum = items.reduce((s, i) => s + i.weight, 0);
  const range = isBand(band) ? bandRange(band, effMax) : null;
  if (weightSum !== CURRENT_WEIGHT_TOTAL)
    return { efficiency: null, effectiveness: null, total: null, problem: "WEIGHTS", range };
  const anyScore = items.some((i) => i.score != null);
  const efficiency = anyScore ? round2((weighted(items) / (weightSum * MAX_SCORE)) * efficiencyShare) : null;
  if (!anyScore && effScore == null) return { efficiency, effectiveness: null, total: null, problem: "WAITING", range };
  if (!range) return { efficiency, effectiveness: null, total: null, problem: "CHOOSE_BAND", range };
  if (effScore == null || effScore < range.min || effScore > range.max)
    return { efficiency, effectiveness: null, total: null, problem: "OUT_OF_BAND", range };
  if (!allScored(items)) return { efficiency, effectiveness: effScore, total: null, problem: "INCOMPLETE", range };
  return { efficiency, effectiveness: effScore, total: round2(efficiency! + effScore), problem: null, range };
}

// ---------------------------------------------------------------- Performance: department method (out of 650)

/** The performance coefficient: total ÷ 540, at most 1.2 (workbook LI1201, column AF). */
export const COEFFICIENT_DIVISOR = 540;
export const COEFFICIENT_MAX = 1.2;
export const DEPT_MAX_TOTAL = 650;

export type DeptResult = {
  efficiency: number | null;
  effectiveness: number | null;
  /** Out of 650. */
  total: number | null;
  percent: number | null;
  problem: null | "WEIGHTS" | "WAITING" | "INCOMPLETE";
};

/** WI1202: Σ(weight × score) of the shared and the department factors, each set's weights totalling 65. */
export function departmentScore(shared: Scored[], dept: Scored[]): DeptResult {
  const sum = (l: Scored[]) => l.reduce((s, i) => s + i.weight, 0);
  if (sum(shared) !== DEPT_WEIGHT_TOTAL || sum(dept) !== DEPT_WEIGHT_TOTAL)
    return { efficiency: null, effectiveness: null, total: null, percent: null, problem: "WEIGHTS" };
  const any = [...shared, ...dept].some((i) => i.score != null);
  if (!any) return { efficiency: null, effectiveness: null, total: null, percent: null, problem: "WAITING" };
  const efficiency = weighted(shared);
  const effectiveness = weighted(dept);
  if (!allScored(shared) || !allScored(dept))
    return { efficiency, effectiveness, total: null, percent: null, problem: "INCOMPLETE" };
  const total = efficiency + effectiveness;
  return { efficiency, effectiveness, total, percent: round2((total / DEPT_MAX_TOTAL) * 100), problem: null };
}

/**
 * The performance coefficient from a percentage (0–100): total ÷ 540 on the 650 scale, at most 1.2.
 * The current method's percentage is put on the same scale, so both methods give the same coefficient.
 */
export function coefficient(percent: number): number {
  const on650 = (percent / 100) * DEPT_MAX_TOTAL;
  return round2(Math.min(COEFFICIENT_MAX, on650 / COEFFICIENT_DIVISOR));
}

/** Under 50 % is poor performance (no bonus); two such periods in a row call an HR meeting. */
export const POOR_BELOW = 50;
/** Excel colours: 75 and over green, 50 and under red. */
export const GOOD_FROM = 75;

export function isPoor(percent: number | null | undefined) {
  return percent != null && percent < POOR_BELOW;
}

/** Two consecutive half-years under 50 % (the previous and this one). */
export function twoLowInARow(previous: number | null | undefined, current: number | null | undefined) {
  return isPoor(previous) && isPoor(current);
}

/** The year's score: the average of the half-years that were evaluated (Excel column Y). */
export function yearlyPercent(halves: (number | null | undefined)[]): number | null {
  const v = halves.filter((x): x is number => x != null);
  return v.length ? round2(v.reduce((s, x) => s + x, 0) / v.length) : null;
}

// ---------------------------------------------------------------- Salary (percent points of A)

export const EDUCATION_RANGES = {
  DIPLOMA: { min: 0, max: 1 },
  ASSOCIATE: { min: 0, max: 3 },
  BACHELOR: { min: 2, max: 7 },
  MASTER: { min: 3, max: 10 },
  DOCTORATE: { min: 4, max: 10 },
} as const;
export type Education = keyof typeof EDUCATION_RANGES;

/** Experience: 1 % a year, at most 20 % (salary instruction table 2). Zero years is allowed. */
export const EXPERIENCE_MAX = 20;
export function experiencePct(years: number) {
  return Math.max(0, Math.min(EXPERIENCE_MAX, Math.floor(years)));
}

/** Skill level 0–9 (table 3). */
export const SKILL_PCT = [0, 1, 3, 5, 6, 8, 9, 11, 13, 15] as const;
export function skillPct(level: number) {
  return SKILL_PCT[level];
}

/** Job difficulty: four criteria 0–5; their sum ÷ 2 is the percentage, at most 10 (table 4). */
export function difficultyPct(p: number, e: number, m: number, r: number) {
  return (p + e + m + r) / 2;
}

/** The difficulty label, in 2 % steps up to 10 % (Indicator_Range O:R), the same for every person. */
export function difficultyLevel(pct: number): "NONE" | "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
  if (pct === 0) return "NONE";
  if (pct <= 2) return "VERY_LOW";
  if (pct <= 4) return "LOW";
  if (pct <= 6) return "MEDIUM";
  if (pct <= 8) return "HIGH";
  return "VERY_HIGH";
}

export const RANK_RANGES = {
  EMPLOYEE: { min: 0, max: 2 },
  EXPERT: { min: 1, max: 4 },
  SENIOR_EXPERT: { min: 3, max: 8 },
  SUPERVISOR: { min: 6, max: 12 },
  MANAGER: { min: 10, max: 15 },
} as const;
export type Rank = keyof typeof RANK_RANGES;

/** Job sensitivity 0 (none) to 5 (very high) is its own percentage (table 6). */
export const SENSITIVITY_MAX = 5;

/** Last year's performance: 25 % of the yearly average, nothing under 60 (section 5-6). */
export const PERFORMANCE_FLOOR = 60;
export function performancePct(yearly: number | null) {
  if (yearly == null || yearly < PERFORMANCE_FLOOR) return 0;
  return round2(yearly / 4);
}

export const CEO_MAX = 20;

export type SalaryInput = {
  education?: Education | null;
  educationPct?: number | null;
  experienceYears?: number | null;
  skillLevel?: number | null;
  physical?: number | null;
  environment?: number | null;
  mental?: number | null;
  risk?: number | null;
  rank?: Rank | null;
  rankPct?: number | null;
  sensitivity?: number | null;
  ceoPct?: number | null;
  /** Last year's average performance (0–100), or null when the person wasn't evaluated. */
  yearlyPerformance: number | null;
  probation?: boolean;
  probationSalary?: bigint | null;
};

export type SalaryProblem =
  | "EDUCATION"
  | "EDUCATION_RANGE"
  | "EXPERIENCE"
  | "SKILL"
  | "DIFFICULTY"
  | "RANK"
  | "RANK_RANGE"
  | "SENSITIVITY"
  | "CEO_RANGE"
  | "FIGURES"
  | "PROBATION_BELOW_MIN";

export type SalaryResult = {
  parts: {
    education: number | null;
    experience: number | null;
    skill: number | null;
    difficulty: number | null;
    grade: number | null;
    performance: number;
    ceo: number;
  };
  difficultyLevel: ReturnType<typeof difficultyLevel> | null;
  /** Sum of the parts, percent of A (up to 120). */
  totalPct: number | null;
  /** Rials above the minimum wage. */
  extra: bigint | null;
  salary: bigint | null;
  aboveMax: boolean;
  problems: SalaryProblem[];
};

function inRange(v: number | null | undefined, r: { min: number; max: number }) {
  return v != null && v >= r.min && v <= r.max;
}

/**
 * Salary = minimum wage + A × (education + experience + skill + difficulty + grade + performance + CEO),
 * where A = maximum salary − minimum wage. Fixes the workbook's errors: the performance part uses the
 * yearly average, rank is checked against its own range, difficulty applies to every person.
 */
export function salary(input: SalaryInput, minWage: bigint, maxSalary: bigint): SalaryResult {
  const problems: SalaryProblem[] = [];
  const A = maxSalary - minWage;
  if (minWage <= 0n || A < 0n) problems.push("FIGURES");

  let education: number | null = null;
  if (!input.education) problems.push("EDUCATION");
  else if (!inRange(input.educationPct, EDUCATION_RANGES[input.education])) problems.push("EDUCATION_RANGE");
  else education = input.educationPct!;

  let experience: number | null = null;
  if (input.experienceYears == null || input.experienceYears < 0) problems.push("EXPERIENCE");
  else experience = experiencePct(input.experienceYears);

  let skill: number | null = null;
  if (input.skillLevel == null || input.skillLevel < 0 || input.skillLevel > 9) problems.push("SKILL");
  else skill = skillPct(input.skillLevel);

  const crit = [input.physical, input.environment, input.mental, input.risk];
  let difficulty: number | null = null;
  if (crit.some((c) => c == null || c < 0 || c > 5)) problems.push("DIFFICULTY");
  else difficulty = difficultyPct(crit[0]!, crit[1]!, crit[2]!, crit[3]!);

  let grade: number | null = null;
  if (!input.rank) problems.push("RANK");
  else if (!inRange(input.rankPct, RANK_RANGES[input.rank])) problems.push("RANK_RANGE");
  if (input.sensitivity == null || input.sensitivity < 0 || input.sensitivity > SENSITIVITY_MAX) problems.push("SENSITIVITY");
  if (!problems.includes("RANK") && !problems.includes("RANK_RANGE") && !problems.includes("SENSITIVITY"))
    grade = input.rankPct! + input.sensitivity!;

  const ceo = input.ceoPct ?? 0;
  if (ceo < 0 || ceo > CEO_MAX) problems.push("CEO_RANGE");

  const performance = performancePct(input.yearlyPerformance);
  const parts = { education, experience, skill, difficulty, grade, performance, ceo };
  const level = difficulty == null ? null : difficultyLevel(difficulty);

  if (input.probation) {
    const s = input.probationSalary ?? null;
    const below = s != null && s < minWage;
    return {
      parts,
      difficultyLevel: level,
      totalPct: null,
      extra: null,
      salary: below ? null : s,
      aboveMax: s != null && s > maxSalary,
      problems: below ? ["PROBATION_BELOW_MIN"] : [],
    };
  }

  if (problems.length)
    return { parts, difficultyLevel: level, totalPct: null, extra: null, salary: null, aboveMax: false, problems };

  const totalPct = round2(education! + experience! + skill! + difficulty! + grade! + performance + ceo);
  // Rials are whole: A × percent ÷ 100, computed in hundredths of a percent to stay exact.
  const extra = (A * BigInt(Math.round(totalPct * 100))) / 10000n;
  const total = minWage + extra;
  return { parts, difficultyLevel: level, totalPct, extra, salary: total, aboveMax: total > maxSalary, problems };
}

// ---------------------------------------------------------------- Bonus

/** Bonus = base × coefficient of last year's average; nothing under 50 %. */
export function bonus(base: bigint, yearly: number | null): bigint {
  if (yearly == null || isPoor(yearly) || base <= 0n) return 0n;
  return (base * BigInt(Math.round(coefficient(yearly) * 100))) / 100n;
}

// ---------------------------------------------------------------- Helpers

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Full-time staff with at least 3 months' service by the end of the period are evaluated (HR-WI-01 4-1). */
export function eligible(startDate: Date | null | undefined, fullTime: boolean, periodEnd: Date) {
  if (!fullTime) return false;
  if (!startDate) return true;
  const three = new Date(startDate);
  three.setUTCMonth(three.getUTCMonth() + 3);
  return three.getTime() <= periodEnd.getTime();
}
