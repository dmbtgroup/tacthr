import "server-only";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { halfRange, jalaliToDate, jalaliYear, salaryDeadline, today } from "./dates";
import { BANDS, coefficient, currentScore, departmentScore, isPoor } from "./calc";
import { checkTwoLow, factorsFor, openPeriod } from "./evaluations";
import { computeRecord, lastYearPerformance } from "./salaries";
import { seedFactors } from "./orgs";

/**
 * Fills a company with made-up staff and three years of evaluations, for demonstrations: invented names,
 * emails on the reserved .example domain, scores drawn from a fixed seed so every load looks the same.
 */
export const DEMO_PASSWORD = "Demo12345";

const FIRST = [
  "آرش", "نیلوفر", "بهرام", "مهسا", "کاوه", "ترانه", "سامان", "پریسا", "رامین", "شیدا",
  "فرهاد", "یاسمن", "بابک", "الهام", "پویا", "مینا", "سهراب", "لاله", "کیان", "نگار",
  "داریوش", "رویا", "امید", "سپیده", "بردیا", "آیدا", "نیما", "غزل", "سینا", "مریم",
  "کامران", "نسترن", "هومن", "سارا", "پیمان", "شبنم", "آرمین", "هستی", "مهیار", "ژاله",
];
const EN_FIRST = [
  "arash", "niloufar", "bahram", "mahsa", "kaveh", "taraneh", "saman", "parisa", "ramin", "sheida",
  "farhad", "yasaman", "babak", "elham", "pouya", "mina", "sohrab", "laleh", "kian", "negar",
  "dariush", "roya", "omid", "sepideh", "bardia", "aida", "nima", "ghazal", "sina", "maryam",
  "kamran", "nastaran", "houman", "sara", "peyman", "shabnam", "armin", "hasti", "mahyar", "jaleh",
];
const LAST = [
  "کیانی", "مهرآبادی", "رستگار", "نوروزی", "پارسا", "آذرنوش", "شکیبا", "روشن", "افشار", "بهاری",
  "نیک‌پور", "فرزانه", "آرمان", "سپهری", "دلاور", "خرسندی", "تابان", "مهرزاد", "صبوری", "آریان",
  "یکتا", "نامدار", "جهان‌بین", "ستوده", "کوشا", "پاکزاد", "رهنما", "سرمدی", "امینی", "نوبخت",
  "شریفی", "دانا", "فرهمند", "بیگی", "نادری", "ثابت", "مقدم", "راد", "حکیمی", "زمانی",
];

/** Departments with their manager's title, staff titles and how well the unit does on the whole. */
const UNITS: { name: string; manager: string; titles: string[]; offset: number }[] = [
  {
    name: "تولید",
    manager: "سرپرست تولید",
    titles: ["اپراتور تولید", "اپراتور تولید", "اپراتور تولید", "تکنسین", "اپراتور تولید", "کنترل کیفیت", "اپراتور تولید", "تکنسین", "کنترل کیفیت"],
    offset: -0.1,
  },
  { name: "فنی و مهندسی", manager: "مدیر فنی", titles: ["کارشناس فنی", "کارشناس طراحی", "تکنسین", "کارشناس فنی", "کارشناس طراحی", "تکنسین"], offset: 0.25 },
  { name: "مالی و اداری", manager: "سرپرست اداری", titles: ["حسابدار", "کارمند اداری", "انباردار", "حسابدار", "کارپرداز", "کارمند اداری"], offset: -0.25 },
  { name: "فروش", manager: "مدیر فروش", titles: ["کارشناس فروش", "کارشناس فروش", "کارشناس بازاریابی", "کارشناس فروش", "کارشناس فروش", "کارشناس بازاریابی"], offset: 0.35 },
  { name: "خدمات پس از فروش", manager: "سرپرست خدمات", titles: ["کارشناس خدمات", "کارشناس خدمات", "اپراتور مرکز تماس", "کارشناس خدمات", "اپراتور مرکز تماس", "کارشناس خدمات"], offset: 0 },
];

const NOTES = [
  "عملکرد خوب در پروژه‌های این دوره.",
  "نیاز به بهبود در مدیریت زمان.",
  "پیشرفت محسوس نسبت به دوره قبل.",
  "در کار تیمی بسیار همراه است.",
  "پیگیری کارها نیاز به یادآوری دارد.",
  "پیشنهادهای خوبی برای بهبود فرایندها داشته است.",
];

const HALVES = 6;

/** The last `n` half-years that have ended, oldest first. */
function finishedHalves(n: number) {
  const now = today();
  const y = jalaliYear(now);
  const all: { year: number; half: 1 | 2 }[] = [];
  for (let yy = y - 5; yy <= y; yy++) for (const h of [1, 2] as const) all.push({ year: yy, half: h });
  return all.filter((p) => halfRange(p.year, p.half).end < now).slice(-n);
}

/** A repeatable pseudo-random number in [0, 1) from a few integers. */
function noise(...k: number[]) {
  let h = 2166136261;
  for (const x of k) h = Math.imul(h ^ (x + 0x9e3779b9), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** How a made-up person scores over the half-years: a level, a drift per half-year, and a few set stories. */
type Profile = { base: number; trend: number };
function profile(i: number, offset: number): Profile {
  if (i === 7 || i === 23) return { base: 1.6, trend: 0.02 }; // always weak: two half-years under 50 raise the HR alert
  if (i === 15) return { base: 3.6, trend: -0.42 }; // slides under 50 in the last two half-years
  if (i === 13) return { base: 2.4, trend: 0.38 }; // the one who keeps improving
  if (i === 30) return { base: 4.7, trend: 0 }; // steady top performer
  return { base: 2.7 + noise(i, 1) * 1.6 + offset, trend: (noise(i, 2) - 0.5) * 0.24 };
}

/** Deletes the company's staff, departments, users linked to staff, half-years and alerts, then reloads the demo. */
export async function reloadDemoData(organizationId: string) {
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) return "Company not found.";
  await db.$transaction(
    async (tx) => {
      await tx.alert.deleteMany({ where: { organizationId } });
      await tx.period.deleteMany({ where: { organizationId } });
      await tx.salaryYear.deleteMany({ where: { organizationId } });
      await tx.user.deleteMany({ where: { organizationId, employeeId: { not: null } } });
      await tx.employee.updateMany({ where: { organizationId }, data: { managerId: null } });
      await tx.employee.deleteMany({ where: { organizationId } });
      await tx.indicator.deleteMany({ where: { organizationId } });
      await tx.department.deleteMany({ where: { organizationId } });
      await seedFactors(tx, organizationId, org.method);
    },
    { timeout: 60_000 },
  );
  return loadDemoData(organizationId);
}

export async function loadDemoData(organizationId: string): Promise<string | null> {
  const org = await db.organization.findUnique({ where: { id: organizationId }, include: { departments: true } });
  if (!org) return "Company not found.";
  if (await db.employee.count({ where: { organizationId } })) return "Demo data only goes into a company without staff.";
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const host = `${org.slug}.example`;
  const halves = finishedHalves(HALVES);
  const first = halves[0];
  /** People and their stories, by the order they were created. */
  const people: { id: string; i: number; p: Profile; leaves: boolean }[] = [];

  await db.$transaction(
    async (tx) => {
      // The department method already has its departments (with their factors); the current method gets the demo ones.
      const units =
        org.method === "DEPARTMENT" && org.departments.length
          ? org.departments.map((d, k) => ({ id: d.id, manager: `سرپرست ${d.name}`, titles: UNITS[k % UNITS.length].titles.slice(0, 6), offset: UNITS[k % UNITS.length].offset }))
          : await Promise.all(
              UNITS.map(async (u) => {
                const d = await tx.department.upsert({
                  where: { organizationId_name: { organizationId, name: u.name } },
                  update: {},
                  create: { organizationId, name: u.name },
                });
                return { id: d.id, manager: u.manager, titles: u.titles, offset: u.offset };
              }),
            );

      let n = 0;
      const person = async (jobTitle: string, departmentId: string | null, managerId: string | null, start: Date, offset: number, opts?: { partTime?: boolean }) => {
        const i = n++;
        const e = await tx.employee.create({
          data: {
            organizationId,
            code: String(1001 + i),
            firstName: FIRST[i % FIRST.length],
            lastName: LAST[(i * 13 + 5) % LAST.length],
            jobTitle,
            departmentId,
            managerId,
            startDate: start,
            fullTime: !opts?.partTime,
          },
        });
        people.push({ id: e.id, i, p: profile(i, offset), leaves: i === 17 });
        return e;
      };
      const login = (employeeId: string, i: number, role: "HR" | "CEO" | "MANAGER" | "EMPLOYEE", name: string) =>
        tx.user.create({
          data: {
            organizationId,
            name,
            email: `${EN_FIRST[i % EN_FIRST.length]}${i >= EN_FIRST.length ? Math.floor(i / EN_FIRST.length) + 1 : ""}@${host}`,
            passwordHash,
            role,
            employeeId,
          },
        });
      // Most people were there before the first half-year; a few joined during the three years.
      const longAgo = (i: number) => jalaliToDate(first.year - 1 - Math.floor(noise(i, 3) * 8), ((i * 5) % 12) + 1, ((i * 11) % 28) + 1);
      const joinedDuring = (k: number) => {
        const h = halves[Math.min(k, halves.length - 1)];
        const s = new Date(halfRange(h.year, h.half).start);
        s.setUTCDate(s.getUTCDate() - 20);
        return s;
      };

      const ceo = await person("مدیرعامل", null, null, longAgo(0), 0.4);
      await login(ceo.id, 0, "CEO", `${ceo.firstName} ${ceo.lastName}`);
      const hr = await person("سرپرست منابع انسانی", units[2 % units.length].id, ceo.id, longAgo(1), 0.2);
      await login(hr.id, 1, "HR", `${hr.firstName} ${hr.lastName}`);

      for (const [u, unit] of units.entries()) {
        const mgr = await person(unit.manager, unit.id, ceo.id, longAgo(n), unit.offset + 0.2);
        await login(mgr.id, n - 1, "MANAGER", `${mgr.firstName} ${mgr.lastName}`);
        for (const [k, title] of unit.titles.entries()) {
          const i = n;
          // Joiners: two in the second year, two in the last; one newcomer too recent to be evaluated yet.
          const start =
            u === 0 && k === unit.titles.length - 1
              ? (() => {
                  const end = halfRange(halves[halves.length - 1].year, halves[halves.length - 1].half).end;
                  const d = new Date(end);
                  d.setUTCDate(d.getUTCDate() - 35);
                  return d;
                })()
              : i % 9 === 3
                ? joinedDuring(2)
                : i % 11 === 5
                  ? joinedDuring(4)
                  : longAgo(i);
          const e = await person(title, unit.id, mgr.id, start, unit.offset, { partTime: u === 2 && k === 4 });
          if (k === 0) await login(e.id, n - 1, "EMPLOYEE", `${e.firstName} ${e.lastName}`);
        }
      }
    },
    { timeout: 60_000 },
  );

  await demoEvaluations(organizationId, halves, people);
  await demoSalaries(organizationId, halves[halves.length - 1].year, people);
  return null;
}

/** Made-up salary figures (rials) for the two demo years. */
const FIGURES = [
  { minWage: 104_000_000n, maxSalary: 390_000_000n, bonusBase: 60_000_000n },
  { minWage: 130_000_000n, maxSalary: 480_000_000n, bonusBase: 75_000_000n },
];

/**
 * Two salary years: last year closed and fully approved; this year part-way (a few not filled in yet,
 * some waiting for the board), with one salary above the maximum and the newcomer on probation.
 */
async function demoSalaries(organizationId: string, thisYear: number, people: { id: string; i: number }[]) {
  const staff = await db.employee.findMany({ where: { organizationId } });
  const ceoUser = await db.user.findFirst({ where: { organizationId, role: "CEO" } });
  const index = new Map(people.map((x) => [x.id, x.i]));
  for (const [k, y] of [thisYear - 1, thisYear].entries()) {
    const f = FIGURES[k];
    const current = k === 1;
    const sy = await db.salaryYear.create({
      data: { organizationId, year: y, ...f, deadline: salaryDeadline(y), closed: !current },
    });
    const yearStart = jalaliToDate(y, 1, 1);
    const perf = await lastYearPerformance(organizationId, y);
    const records = [];
    for (const e of staff) {
      const i = index.get(e.id) ?? 0;
      // Last year only covers people who were there; the one who left is in last year's only.
      if (!e.startDate || e.startDate >= yearStart) {
        if (!current || !e.active) continue;
      }
      if (current && !e.active) continue;
      if (current && i % 7 === 2 && i > 2) continue; // not filled in yet
      const title = e.jobTitle ?? "";
      const n = (salt: number) => noise(i, salt);
      const isCeo = title === "مدیرعامل";
      const isManager = !isCeo && (title.startsWith("مدیر") || title.startsWith("سرپرست"));
      const isExpert = !isManager && !isCeo && (title.startsWith("کارشناس") || title === "حسابدار");
      const startYear = e.startDate ? jalaliYear(e.startDate) : y;
      const experience = Math.max(0, y - startYear) + Math.floor(n(20) * 6);
      const newcomer = current && i === 11; // joined weeks ago: on probation
      const star = i === 12; // the engineering manager, whose salary ends above the maximum
      const education = isCeo || star ? "MASTER" : isManager ? (n(21) < 0.5 ? "MASTER" : "BACHELOR") : isExpert ? (n(21) < 0.2 ? "MASTER" : "BACHELOR") : n(21) < 0.5 ? "DIPLOMA" : "ASSOCIATE";
      const eduRange = { DIPLOMA: [0, 1], ASSOCIATE: [0, 3], BACHELOR: [2, 7], MASTER: [3, 10] }[education]!;
      const rank = isCeo || star || title.startsWith("مدیر") ? "MANAGER" : isManager ? "SUPERVISOR" : isExpert ? (n(22) < 0.25 ? "SENIOR_EXPERT" : "EXPERT") : "EMPLOYEE";
      const rankRange = { MANAGER: [10, 15], SUPERVISOR: [6, 12], SENIOR_EXPERT: [3, 8], EXPERT: [1, 4], EMPLOYEE: [0, 2] }[rank]!;
      const pick = (r: number[], salt: number) => Math.round((r[0] + n(salt) * (r[1] - r[0])) * 2) / 2;
      const shop = !isCeo && !isManager && !isExpert;
      records.push({
        salaryYearId: sy.id,
        employeeId: e.id,
        education: education as "MASTER" | "BACHELOR" | "DIPLOMA" | "ASSOCIATE",
        educationPct: star ? 10 : pick(eduRange, 23),
        experienceYears: star ? 22 : experience,
        skillLevel: star ? 9 : isCeo ? 9 : isManager ? 6 + Math.floor(n(24) * 3) : isExpert ? 3 + Math.floor(n(24) * 4) : 2 + Math.floor(n(24) * 4),
        physical: star ? 2 : shop ? 3 + Math.floor(n(25) * 3) : Math.floor(n(25) * 2),
        environment: star ? 2 : shop ? 2 + Math.floor(n(26) * 3) : Math.floor(n(26) * 2),
        mental: star ? 5 : isManager || isCeo ? 3 + Math.floor(n(27) * 3) : 1 + Math.floor(n(27) * 3),
        risk: star ? 3 : shop ? 3 + Math.floor(n(28) * 3) : Math.floor(n(28) * 2),
        rank: rank as "MANAGER" | "SUPERVISOR" | "SENIOR_EXPERT" | "EXPERT" | "EMPLOYEE",
        rankPct: star ? 15 : pick(rankRange, 29),
        sensitivity: star || isCeo ? 5 : isManager ? 3 + Math.floor(n(30) * 2) : isExpert ? 1 + Math.floor(n(30) * 3) : Math.floor(n(30) * 2),
        ceoPct: star ? 20 : isCeo ? 0 : Math.round(n(31) * (isManager ? 12 : 8)),
        probation: newcomer,
        probationSalary: newcomer ? f.minWage + 10_000_000n : null,
      });
    }
    await db.salaryRecord.createMany({ data: records });
    // Approve what's complete: everything last year; this year all but every fourth.
    const saved = await db.salaryRecord.findMany({ where: { salaryYearId: sy.id } });
    const approve = saved.filter((r, j) => computeRecord(r, f, perf.get(r.employeeId) ?? null).salary != null && (!current || j % 4 !== 1));
    await db.salaryRecord.updateMany({
      where: { id: { in: approve.map((r) => r.id) } },
      data: { approvedAt: current ? new Date() : jalaliToDate(y, 1, 25), approvedByName: ceoUser?.name },
    });
  }
}

/**
 * Six half-years of scores: the older five fully approved and closed, the latest part-way through
 * (some not scored yet, some half-scored, some waiting for the manager or the board).
 */
async function demoEvaluations(
  organizationId: string,
  halves: { year: number; half: 1 | 2 }[],
  people: { id: string; i: number; p: Profile; leaves: boolean }[],
) {
  const ceo = await db.user.findFirst({ where: { organizationId, role: "CEO" } });
  const byId = new Map(people.map((x) => [x.id, x]));
  for (const [pi, h] of halves.entries()) {
    // One person leaves after the third half-year; their history stays.
    if (pi === 3) {
      const leaver = people.find((x) => x.leaves);
      if (leaver) await db.employee.update({ where: { id: leaver.id }, data: { active: false } });
    }
    const period = await openPeriod(organizationId, h.year, h.half);
    const full = await db.period.findUniqueOrThrow({
      where: { id: period.id },
      include: { indicators: true, evaluations: { include: { employee: { include: { manager: true } } }, orderBy: { employee: { code: "asc" } } } },
    });
    const last = pi === halves.length - 1;
    const effMax = 100 - full.efficiencyShare;
    const at = halfRange(h.year, h.half).end;
    const lowOnes: string[] = [];
    await db.$transaction(
      async (tx) => {
        const allScores: { evaluationId: string; indicatorId: string; score: number }[] = [];
        for (const [k, ev] of full.evaluations.entries()) {
          const who = byId.get(ev.employeeId);
          const i = who?.i ?? k;
          const pr = who?.p ?? { base: 3.2, trend: 0 };
          const ability = Math.max(0.6, Math.min(4.9, pr.base + pr.trend * pi + (noise(i, pi, 7) - 0.5) * 0.5));
          const weakStory = i === 7 || i === 23 || i === 15;
          // Latest half-year: a quarter not started, a few half-scored, the rest spread over the approval steps.
          const stage = !last || weakStory ? 4 : i % 8 === 0 || i % 8 === 5 ? 0 : i % 8 === 2 ? 1 : i % 8 === 3 ? 2 : i % 8 === 6 ? 3 : 4;
          if (stage === 0) continue;

          const { shared, own } = factorsFor(full.indicators, full.method, ev.employee.departmentId);
          const factors = [...shared, ...own];
          const scored = stage === 1 ? factors.slice(0, Math.ceil(factors.length / 2)) : factors;
          const scoreOf = new Map<string, number>();
          for (const [j, f] of scored.entries()) {
            const s = Math.max(0, Math.min(5, Math.round(ability + (noise(i, pi, j) - 0.5) * 1.6)));
            scoreOf.set(f.id, s);
            allScores.push({ evaluationId: ev.id, indicatorId: f.id, score: s });
          }
          const item = (f: { id: string; weight: number }) => ({ weight: f.weight, score: scoreOf.get(f.id) ?? null });
          const effScore = Math.round(Math.max(0, Math.min(effMax, (ability / 5) * effMax + (noise(i, pi, 99) - 0.5) * 4)));
          const band = BANDS.find((b) => effScore >= (b.min * effMax) / 25 && effScore <= (b.max * effMax) / 25)!.key;
          let result: { efficiency: number | null; effectiveness: number | null; total: number | null; percent: number | null };
          if (full.method === "CURRENT") {
            const r = currentScore(shared.map(item), band, effScore, full.efficiencyShare);
            result = { efficiency: r.efficiency, effectiveness: r.effectiveness, total: r.total, percent: r.total };
          } else {
            const r = departmentScore(shared.map(item), own.map(item));
            result = { efficiency: r.efficiency, effectiveness: r.effectiveness, total: r.total, percent: r.percent };
          }
          const status = stage === 1 ? "DRAFT" : stage === 2 ? "SUBMITTED" : stage === 3 ? "MANAGER_APPROVED" : "APPROVED";
          const supervisor = ev.employee.manager ? `${ev.employee.manager.firstName} ${ev.employee.manager.lastName}` : ceo?.name;
          await tx.evaluation.update({
            where: { id: ev.id },
            data: {
              ...(full.method === "CURRENT" ? { effectivenessBand: band, effectivenessScore: effScore } : {}),
              ...result,
              coefficient: result.percent == null ? null : coefficient(result.percent),
              status,
              notes: noise(i, pi, 5) < 0.25 ? NOTES[Math.floor(noise(i, pi, 6) * NOTES.length)] : null,
              scoredByName: supervisor,
              submittedAt: stage >= 2 ? at : null,
              ...(stage >= 3 ? { managerApprovedAt: at, managerApprovedByName: ceo?.name } : {}),
              ...(stage === 4 ? { approvedAt: at, approvedByName: ceo?.name } : {}),
            },
          });
          if (stage === 4 && isPoor(result.percent)) lowOnes.push(ev.id);
        }
        if (allScores.length) await tx.evaluationScore.createMany({ data: allScores });
        for (const id of lowOnes) await checkTwoLow(tx, id);
        if (!last) await tx.period.update({ where: { id: period.id }, data: { closed: true } });
      },
      { timeout: 120_000 },
    );
  }
}
