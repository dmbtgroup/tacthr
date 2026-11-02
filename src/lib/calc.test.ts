import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bandRange,
  bonus,
  coefficient,
  currentScore,
  departmentScore,
  difficultyLevel,
  difficultyPct,
  eligible,
  experiencePct,
  performancePct,
  salary,
  skillPct,
  twoLowInARow,
  yearlyPercent,
} from "./calc";

/** HR-WI-01 table 1 default weights (total 60). */
const W = [3, 3, 7, 5, 8, 5, 3, 9, 7, 1, 3, 6];
const items = (scores: (number | null)[]) => W.map((weight, i) => ({ weight, score: scores[i] }));

test("current: all 5s give the full 75 for efficiency", () => {
  const r = currentScore(items(W.map(() => 5)), "VERY_HIGH", 25);
  assert.equal(r.efficiency, 75);
  assert.equal(r.total, 100);
  assert.equal(r.problem, null);
});

test("current: Σ(weight × score) ÷ 3 × 0.75, as in the workbook (68.5 + 18 = 86.5)", () => {
  // 300 − 9×2 − 8×1 = 274 → 274 ÷ 3 × 0.75 = 68.5
  const s = W.map(() => 5);
  s[7] = 3;
  s[4] = 4;
  const r = currentScore(items(s), "HIGH", 18);
  assert.equal(r.efficiency, 68.5);
  assert.equal(r.total, 86.5);
});

test("current: weights not totalling 60 block every score", () => {
  const r = currentScore([{ weight: 10, score: 5 }], "HIGH", 18);
  assert.equal(r.problem, "WEIGHTS");
  assert.equal(r.total, null);
});

test("current: the effectiveness number must be inside its band", () => {
  const all = items(W.map(() => 4));
  assert.equal(currentScore(all, null, 18).problem, "CHOOSE_BAND");
  assert.equal(currentScore(all, "HIGH", 21).problem, "OUT_OF_BAND");
  assert.deepEqual(currentScore(all, "HIGH", 21).range, { min: 16, max: 20 });
  assert.equal(currentScore(all, "HIGH", 16).problem, null);
  assert.equal(currentScore(items(W.map(() => null)), null, null).problem, "WAITING");
});

test("current: a missing factor score leaves the total open", () => {
  const s: (number | null)[] = W.map(() => 4);
  s[0] = null;
  assert.equal(currentScore(items(s), "HIGH", 18).problem, "INCOMPLETE");
});

test("current: 50/50 split doubles the bands", () => {
  assert.deepEqual(bandRange("HIGH", 50), { min: 32, max: 40 });
  const r = currentScore(items(W.map(() => 5)), "VERY_HIGH", 50, 50);
  assert.equal(r.efficiency, 50);
  assert.equal(r.total, 100);
});

test("department: out of 650 with both sets totalling 65", () => {
  const shared = Array.from({ length: 13 }, () => ({ weight: 5, score: 5 }));
  const dept = Array.from({ length: 5 }, () => ({ weight: 13, score: 5 }));
  const r = departmentScore(shared, dept);
  assert.equal(r.total, 650);
  assert.equal(r.percent, 100);
  // The PR sheet's weights totalled 60: refused, not scored out of 600.
  assert.equal(departmentScore(shared, [{ weight: 60, score: 5 }]).problem, "WEIGHTS");
});

test("coefficient: total ÷ 540, at most 1.2", () => {
  assert.equal(coefficient((540 / 650) * 100), 1);
  assert.equal(coefficient(100), 1.2);
  assert.equal(coefficient(50), 0.6);
});

test("two half-years in a row under 50", () => {
  assert.equal(twoLowInARow(49, 45), true);
  assert.equal(twoLowInARow(50, 45), false);
  assert.equal(twoLowInARow(null, 10), false);
});

test("yearly score is the average of both halves (workbook error: it used the first half only)", () => {
  assert.equal(yearlyPercent([72.8, 86.5]), 79.65);
  assert.equal(yearlyPercent([null, 80]), 80);
  assert.equal(yearlyPercent([null, null]), null);
});

test("performance part: 25 % of the average, nothing under 60 (60 itself counts)", () => {
  assert.equal(performancePct(79.65), 19.91);
  assert.equal(performancePct(60), 15);
  assert.equal(performancePct(59.99), 0);
  assert.equal(performancePct(null), 0);
});

test("salary tables", () => {
  assert.equal(experiencePct(0), 0);
  assert.equal(experiencePct(2), 2);
  assert.equal(experiencePct(25), 20);
  assert.equal(skillPct(5), 8);
  assert.equal(skillPct(9), 15);
  // The instruction's example: physical 4, environment 2, mental 1, risk 5 → 12 → 6 %.
  assert.equal(difficultyPct(4, 2, 1, 5), 6);
  assert.equal(difficultyLevel(6), "MEDIUM");
  // Workbook error: rows after the first used 1 % steps, giving "very high" here.
  assert.equal(difficultyLevel(4.5), "MEDIUM");
  assert.equal(difficultyLevel(10), "VERY_HIGH");
});

const base = {
  education: "BACHELOR" as const,
  educationPct: 5,
  experienceYears: 18,
  skillLevel: 7,
  physical: 5,
  environment: 5,
  mental: 4,
  risk: 4,
  rank: "MANAGER" as const,
  rankPct: 14,
  sensitivity: 5,
  ceoPct: 5,
  yearlyPerformance: 79.65,
};

test("salary = minimum wage + A × total %", () => {
  const r = salary(base, 120_000_000n, 450_000_000n);
  // 5 + 18 + 11 + 9 + 19 + 19.91 + 5 = 86.91 %
  assert.equal(r.totalPct, 86.91);
  assert.equal(r.extra, 286_803_000n);
  assert.equal(r.salary, 406_803_000n);
  assert.equal(r.aboveMax, false);
  assert.deepEqual(r.problems, []);
});

test("salary checks each value against its own range", () => {
  assert.deepEqual(salary({ ...base, educationPct: 8 }, 1n, 2n).problems, ["EDUCATION_RANGE"]);
  // Workbook error: rank was checked against the education range; 14 is valid for a manager.
  assert.deepEqual(salary({ ...base, rankPct: 9 }, 1n, 2n).problems, ["RANK_RANGE"]);
  assert.deepEqual(salary({ ...base, ceoPct: 21 }, 1n, 2n).problems, ["CEO_RANGE"]);
  assert.ok(salary({ ...base, risk: null }, 1n, 2n).problems.includes("DIFFICULTY"));
  assert.deepEqual(salary({ ...base, experienceYears: 0 }, 1n, 2n).problems, []);
});

test("salary above the maximum is flagged (total can reach 120 %)", () => {
  const r = salary(
    { ...base, educationPct: 10, education: "MASTER", experienceYears: 20, skillLevel: 9, mental: 5, risk: 5, rankPct: 15, ceoPct: 20, yearlyPerformance: 100 },
    100n,
    200n,
  );
  assert.equal(r.totalPct, 120);
  assert.equal(r.salary, 220n);
  assert.equal(r.aboveMax, true);
});

test("probation salary: set by the CEO, never below the minimum wage", () => {
  assert.equal(salary({ ...base, probation: true, probationSalary: 150n }, 120n, 450n).salary, 150n);
  assert.deepEqual(salary({ ...base, probation: true, probationSalary: 100n }, 120n, 450n).problems, ["PROBATION_BELOW_MIN"]);
});

test("bonus: base × coefficient, nothing under 50 %", () => {
  assert.equal(bonus(1_000_000n, 100), 1_200_000n);
  assert.equal(bonus(1_000_000n, 49), 0n);
  assert.equal(bonus(1_000_000n, null), 0n);
});

test("eligibility: full-time with 3 months by the end of the period", () => {
  const end = new Date(Date.UTC(2025, 8, 22));
  assert.equal(eligible(new Date(Date.UTC(2025, 5, 22)), true, end), true);
  assert.equal(eligible(new Date(Date.UTC(2025, 5, 23)), true, end), false);
  assert.equal(eligible(new Date(Date.UTC(2020, 0, 1)), false, end), false);
});
