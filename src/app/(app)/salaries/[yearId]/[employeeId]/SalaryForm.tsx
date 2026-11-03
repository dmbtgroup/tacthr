"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { ScorePct } from "@/components/Score";
import {
  bonus,
  CEO_MAX,
  coefficient,
  EDUCATION_RANGES,
  experiencePct,
  PERFORMANCE_FLOOR,
  RANK_RANGES,
  salary,
  SKILL_PCT,
  type Education,
  type Rank,
} from "@/lib/calc";
import { latinDigits } from "@/lib/dates";
import { num, pct, rials } from "@/lib/format";
import { difficultyLevelName, educationName, EDUCATIONS, rankName, RANKS, sensitivityName } from "@/lib/salaryNames";
import { saveRecord } from "../../actions";

export type RecordInput = {
  education: string | null;
  educationPct: number | null;
  experienceYears: number | null;
  skillLevel: number | null;
  physical: number | null;
  environment: number | null;
  mental: number | null;
  risk: number | null;
  rank: string | null;
  rankPct: number | null;
  sensitivity: number | null;
  ceoPct: number | null;
  probation: boolean;
  probationSalary: string | null;
  notes: string | null;
};

const toNum = (s: string) => (s.trim() === "" ? null : Number(latinDigits(s)));
const toRials = (s: string) => {
  const v = latinDigits(s).replace(/\s/g, "");
  return /^\d+$/.test(v) ? BigInt(v) : null;
};
const str = (n: number | null | undefined) => (n == null ? "" : String(n));

/** The salary form: each factor with its range, and the salary, the maximum check and the bonus as you type. */
export function SalaryForm({
  yearId,
  employeeId,
  initial,
  minWage,
  maxSalary,
  bonusBase,
  yearly,
  board,
  editable,
}: {
  yearId: string;
  employeeId: string;
  initial: RecordInput;
  minWage: string;
  maxSalary: string;
  bonusBase: string;
  /** Last year's average performance, or null. */
  yearly: number | null;
  board: boolean;
  editable: boolean;
}) {
  const t = useT();
  const [education, setEducation] = useState(initial.education ?? "");
  const [educationPct, setEducationPct] = useState(str(initial.educationPct));
  const [experience, setExperience] = useState(str(initial.experienceYears));
  const [skill, setSkill] = useState(str(initial.skillLevel));
  const [crit, setCrit] = useState([initial.physical, initial.environment, initial.mental, initial.risk].map(str));
  const [rank, setRank] = useState(initial.rank ?? "");
  const [rankPct, setRankPct] = useState(str(initial.rankPct));
  const [sensitivity, setSensitivity] = useState(str(initial.sensitivity));
  const [ceo, setCeo] = useState(str(initial.ceoPct));
  const [probation, setProbation] = useState(initial.probation);
  const [probationSalary, setProbationSalary] = useState(initial.probationSalary ?? "");

  const min = BigInt(minWage);
  const max = BigInt(maxSalary);
  const res = salary(
    {
      education: (education || null) as Education | null,
      educationPct: toNum(educationPct),
      experienceYears: toNum(experience),
      skillLevel: toNum(skill),
      physical: toNum(crit[0]),
      environment: toNum(crit[1]),
      mental: toNum(crit[2]),
      risk: toNum(crit[3]),
      rank: (rank || null) as Rank | null,
      rankPct: toNum(rankPct),
      sensitivity: toNum(sensitivity),
      ceoPct: toNum(ceo),
      yearlyPerformance: yearly,
      probation,
      probationSalary: toRials(probationSalary),
    },
    min,
    max,
  );
  const bonusAmount = probation ? 0n : bonus(BigInt(bonusBase), yearly);
  const eduRange = education ? EDUCATION_RANGES[education as Education] : null;
  const rankRange = rank ? RANK_RANGES[rank as Rank] : null;
  const dis = !editable;

  const problemText: Record<string, string> = {
    EDUCATION: t("Choose the education level."),
    EDUCATION_RANGE: eduRange ? t("The education score is from {min} to {max} % for this level.", { min: num(t, eduRange.min), max: num(t, eduRange.max) }) : "",
    EXPERIENCE: t("Enter the years of experience."),
    SKILL: t("Choose the skill level."),
    DIFFICULTY: t("Score the four job difficulty criteria."),
    RANK: t("Choose the job rank."),
    RANK_RANGE: rankRange ? t("The rank score is from {min} to {max} % for this rank.", { min: num(t, rankRange.min), max: num(t, rankRange.max) }) : "",
    SENSITIVITY: t("Choose the job sensitivity."),
    CEO_RANGE: t("The CEO's score is from 0 to {max} %.", { max: num(t, CEO_MAX) }),
    FIGURES: t("Check the year's minimum wage and maximum salary."),
    PROBATION_BELOW_MIN: t("A probation salary can't be below the minimum wage."),
  };

  const share = (v: number | null) => <span className="text-sm font-semibold text-slate-800">{v == null ? "—" : pct(t, v)}</span>;
  const row = (label: string, value: number | null, children: React.ReactNode) => (
    <div className="grid items-end gap-3 border-b border-slate-100 py-3 sm:grid-cols-[10rem_1fr_5rem]">
      <p className="font-medium">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <p className="sm:text-end">{share(value)}</p>
    </div>
  );
  const levels = (n: number, name: (i: number) => string) =>
    Array.from({ length: n }, (_, i) => (
      <option key={i} value={i}>
        {name(i)}
      </option>
    ));

  return (
    <form action={saveRecord} className="space-y-5">
      <input type="hidden" name="yearId" value={yearId} />
      <input type="hidden" name="employeeId" value={employeeId} />

      <section className="card">
        {row(
          t("Education"),
          res.parts.education,
          <>
            <div>
              <label className="label">{t("Level")}</label>
              <select className="input" name="education" value={education} onChange={(e) => setEducation(e.target.value)} disabled={dis}>
                <option value="">—</option>
                {EDUCATIONS.map((e) => (
                  <option key={e} value={e}>
                    {educationName(t, e)} ({pct(t, EDUCATION_RANGES[e].min)}–{pct(t, EDUCATION_RANGES[e].max)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{eduRange ? t("Score ({min}–{max} %)", { min: num(t, eduRange.min), max: num(t, eduRange.max) }) : t("Score (%)")}</label>
              <input className="input" name="educationPct" inputMode="decimal" value={educationPct} onChange={(e) => setEducationPct(e.target.value)} disabled={dis || !education} />
            </div>
          </>,
        )}
        {row(
          t("Relevant experience"),
          res.parts.experience,
          <div>
            <label className="label">{t("Years (1 % a year, up to 20 %)")}</label>
            <input className="input" name="experienceYears" inputMode="numeric" value={experience} onChange={(e) => setExperience(e.target.value)} disabled={dis} />
          </div>,
        )}
        {row(
          t("Skill"),
          res.parts.skill,
          <div>
            <label className="label">{t("Level (0–9)")}</label>
            <select className="input" name="skillLevel" value={skill} onChange={(e) => setSkill(e.target.value)} disabled={dis}>
              <option value="">—</option>
              {levels(10, (i) => `${num(t, i)} → ${pct(t, SKILL_PCT[i])}`)}
            </select>
          </div>,
        )}
        {row(
          t("Job difficulty"),
          res.parts.difficulty,
          <>
            {[t("Physical strain"), t("Work environment"), t("Mental pressure"), t("Risk and safety")].map((label, k) => (
              <div key={label}>
                <label className="label">{label}</label>
                <select
                  className="input"
                  name={["physical", "environment", "mental", "risk"][k]}
                  value={crit[k]}
                  onChange={(e) => setCrit((c) => c.map((v, j) => (j === k ? e.target.value : v)))}
                  disabled={dis}
                >
                  <option value="">—</option>
                  {levels(6, (i) => num(t, i))}
                </select>
              </div>
            ))}
            {res.difficultyLevel && <p className="text-sm text-slate-600 sm:col-span-2">{t("Level: {level}", { level: difficultyLevelName(t, res.difficultyLevel) })}</p>}
          </>,
        )}
        {row(
          t("Job grade"),
          res.parts.grade,
          <>
            <div>
              <label className="label">{t("Job rank")}</label>
              <select className="input" name="rank" value={rank} onChange={(e) => setRank(e.target.value)} disabled={dis}>
                <option value="">—</option>
                {RANKS.map((r) => (
                  <option key={r} value={r}>
                    {rankName(t, r)} ({pct(t, RANK_RANGES[r].min)}–{pct(t, RANK_RANGES[r].max)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{rankRange ? t("Rank score ({min}–{max} %)", { min: num(t, rankRange.min), max: num(t, rankRange.max) }) : t("Rank score (%)")}</label>
              <input className="input" name="rankPct" inputMode="decimal" value={rankPct} onChange={(e) => setRankPct(e.target.value)} disabled={dis || !rank} />
            </div>
            <div>
              <label className="label">{t("Job sensitivity")}</label>
              <select className="input" name="sensitivity" value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} disabled={dis}>
                <option value="">—</option>
                {levels(6, (i) => `${sensitivityName(t, i)} (${pct(t, i)})`)}
              </select>
            </div>
          </>,
        )}
        {row(
          t("Last year's performance"),
          res.parts.performance,
          <p className="text-sm text-slate-600 sm:col-span-2">
            {yearly == null ? (
              t("No approved evaluation last year.")
            ) : (
              <>
                {t("Yearly average")}: <ScorePct t={t} value={yearly} /> ·{" "}
                {yearly < PERFORMANCE_FLOOR ? t("Under {floor}: no performance share.", { floor: num(t, PERFORMANCE_FLOOR) }) : t("A quarter of it counts.")}
              </>
            )}
          </p>,
        )}
        {row(
          t("CEO / board score"),
          res.parts.ceo,
          <div>
            <label className="label">{t("Score (0–{max} %)", { max: num(t, CEO_MAX) })}</label>
            <input className="input" name="ceoPct" inputMode="decimal" value={ceo} onChange={(e) => setCeo(e.target.value)} disabled={dis || !board} />
          </div>,
        )}
      </section>

      <section className="card space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="probation" checked={probation} onChange={(e) => setProbation(e.target.checked)} disabled={dis || !board} />
          {t("On probation: the CEO sets the salary")}
        </label>
        {probation && (
          <div className="max-w-xs">
            <label className="label">{t("Probation salary (rials)")}</label>
            <input className="input" name="probationSalary" inputMode="numeric" dir="ltr" value={probationSalary} onChange={(e) => setProbationSalary(e.target.value)} disabled={dis || !board} />
          </div>
        )}
        <div>
          <label className="label">{t("Notes")}</label>
          <textarea className="input" name="notes" rows={2} defaultValue={initial.notes ?? ""} disabled={dis} />
        </div>
      </section>

      <section className="card space-y-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">{t("Total share of A")}</p>
            <p className="text-xl font-semibold">{probation ? t("Probation") : res.totalPct == null ? "—" : pct(t, res.totalPct)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("Above the minimum wage")}</p>
            <p className="text-xl font-semibold">{res.extra == null ? "—" : rials(t, res.extra)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("Salary")}</p>
            <p className={`text-xl font-semibold ${res.aboveMax ? "text-amber-700" : ""}`}>{res.salary == null ? "—" : rials(t, res.salary)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("Bonus")}</p>
            <p className="text-xl font-semibold">{rials(t, bonusAmount)}</p>
            {yearly != null && !probation && <p className="text-xs text-slate-500">{t("Coefficient {c}", { c: num(t, coefficient(yearly)) })}</p>}
          </div>
        </div>
        {res.aboveMax && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠ {t("This salary is above the year's maximum salary.")}</p>}
        {res.problems.length > 0 && (
          <ul className="list-disc space-y-0.5 ps-5 text-sm text-amber-800">
            {res.problems.map((p) => (
              <li key={p}>{problemText[p]}</li>
            ))}
          </ul>
        )}
        {editable && <button className="btn-primary" type="submit">{t("Save")}</button>}
      </section>

      {/* Disabled boxes aren't sent with the form; the board-only values are kept by the server. */}
    </form>
  );
}
