import "server-only";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { halfRange, jalaliToDate, jalaliYear, today } from "./dates";
import { BANDS } from "./calc";
import { checkTwoLow, factorsFor, openPeriod, recompute } from "./evaluations";

/**
 * Fills an empty company with made-up staff for demonstrations: invented names, emails on the reserved
 * .example domain. Never runs on a company that already has staff.
 */
export const DEMO_PASSWORD = "Demo12345";

const FIRST = ["آرش", "نیلوفر", "بهرام", "مهسا", "کاوه", "ترانه", "سامان", "پریسا", "رامین", "شیدا", "فرهاد", "یاسمن", "بابک", "الهام", "پویا", "مینا", "سهراب", "لاله", "کیان", "نگار", "داریوش", "رویا", "امید", "سپیده"];
const LAST = ["کیانی", "مهرآبادی", "رستگار", "نوروزی", "پارسا", "آذرنوش", "شکیبا", "روشن", "افشار", "بهاری", "نیک‌پور", "فرزانه", "آرمان", "سپهری", "دلاور", "خرسندی", "تابان", "مهرزاد", "صبوری", "آریان", "یکتا", "نامدار", "جهان‌بین", "ستوده"];
const EN_FIRST = ["arash", "niloufar", "bahram", "mahsa", "kaveh", "taraneh", "saman", "parisa", "ramin", "sheida", "farhad", "yasaman", "babak", "elham", "pouya", "mina", "sohrab", "laleh", "kian", "negar", "dariush", "roya", "omid", "sepideh"];

/** Departments and job titles for the current method (the department method brings its own departments). */
const UNITS: { name: string; manager: string; titles: string[] }[] = [
  { name: "تولید", manager: "سرپرست تولید", titles: ["اپراتور تولید", "اپراتور تولید", "تکنسین", "اپراتور تولید"] },
  { name: "فنی و مهندسی", manager: "مدیر فنی", titles: ["کارشناس فنی", "کارشناس طراحی", "تکنسین"] },
  { name: "مالی و اداری", manager: "سرپرست اداری", titles: ["حسابدار", "کارمند اداری", "انباردار"] },
  { name: "فروش و خدمات", manager: "مدیر فروش", titles: ["کارشناس فروش", "کارشناس خدمات", "کارشناس فروش"] },
];

/** Five weeks before the end of the last finished half-year. */
function newcomerStart() {
  const now = today();
  const y = jalaliYear(now);
  const ends = [halfRange(y - 1, 2).end, halfRange(y, 1).end, halfRange(y, 2).end].filter((d) => d < now);
  const d = new Date(ends[ends.length - 1]);
  d.setUTCDate(d.getUTCDate() - 35);
  return d;
}

export async function loadDemoData(organizationId: string): Promise<string | null> {
  const org = await db.organization.findUnique({ where: { id: organizationId }, include: { departments: true } });
  if (!org) return "Company not found.";
  if (await db.employee.count({ where: { organizationId } })) return "Demo data only goes into a company without staff.";
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const host = `${org.slug}.example`;

  await db.$transaction(async (tx) => {
    // The department method already has its departments; the current method gets the demo ones.
    const units =
      org.method === "DEPARTMENT" && org.departments.length
        ? org.departments.map((d, i) => ({ id: d.id, manager: `سرپرست ${d.name}`, titles: UNITS[i % UNITS.length].titles }))
        : await Promise.all(
            UNITS.map(async (u) => {
              const d = await tx.department.upsert({
                where: { organizationId_name: { organizationId, name: u.name } },
                update: {},
                create: { organizationId, name: u.name },
              });
              return { id: d.id, manager: u.manager, titles: u.titles };
            }),
          );

    let n = 0;
    const person = async (jobTitle: string, departmentId: string | null, managerId: string | null, start: number | Date) => {
      const i = n++;
      return tx.employee.create({
        data: {
          organizationId,
          code: String(1001 + i),
          firstName: FIRST[i % FIRST.length],
          lastName: LAST[(i * 7) % LAST.length],
          jobTitle,
          departmentId,
          managerId,
          startDate: start instanceof Date ? start : jalaliToDate(start, ((i * 5) % 12) + 1, ((i * 11) % 28) + 1),
          fullTime: i % 13 !== 12,
        },
      });
    };
    const login = (employeeId: string, i: number, role: "HR" | "CEO" | "MANAGER" | "EMPLOYEE", name: string) =>
      tx.user.create({
        data: { organizationId, name, email: `${EN_FIRST[i % EN_FIRST.length]}${i >= EN_FIRST.length ? Math.floor(i / EN_FIRST.length) + 1 : ""}@${host}`, passwordHash, role, employeeId },
      });

    const ceo = await person("مدیرعامل", null, null, 1390);
    await login(ceo.id, 0, "CEO", `${ceo.firstName} ${ceo.lastName}`);
    const hr = await person("سرپرست منابع انسانی", units[2 % units.length].id, ceo.id, 1396);
    await login(hr.id, 1, "HR", `${hr.firstName} ${hr.lastName}`);

    for (const u of units) {
      const mgr = await person(u.manager, u.id, ceo.id, 1394 + (n % 5));
      await login(mgr.id, n - 1, "MANAGER", `${mgr.firstName} ${mgr.lastName}`);
      for (const [k, title] of u.titles.entries()) {
        // One newcomer, under three months at the end of the last half-year, shows the eligibility rule.
        const newcomer = k === 2 && u === units[0];
        const e = await person(title, u.id, mgr.id, newcomer ? newcomerStart() : 1397 + ((n * 3) % 7));
        if (k === 0) await login(e.id, n - 1, "EMPLOYEE", `${e.firstName} ${e.lastName}`);
      }
    }
  });
  await demoEvaluations(organizationId);
  return null;
}

/** The last `n` half-years that have ended, oldest first. */
function finishedHalves(n: number) {
  const now = today();
  const y = jalaliYear(now);
  const all: { year: number; half: 1 | 2 }[] = [];
  for (let yy = y - 3; yy <= y; yy++) for (const h of [1, 2] as const) all.push({ year: yy, half: h });
  return all.filter((p) => halfRange(p.year, p.half).end < now).slice(-n);
}

/** A repeatable pseudo-random number in [0, 1) from a few integers. */
function noise(...k: number[]) {
  let h = 2166136261;
  for (const x of k) h = Math.imul(h ^ (x + 0x9e3779b9), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Scores for the last three half-years: the two older ones fully approved, the latest part-way through
 * (some still being scored, some waiting for the manager or the board). Two people score under 50 %
 * twice in a row, which raises the HR alert.
 */
async function demoEvaluations(organizationId: string) {
  const halves = finishedHalves(3);
  const ceo = await db.user.findFirst({ where: { organizationId, role: "CEO" } });
  for (const [pi, h] of halves.entries()) {
    const period = await openPeriod(organizationId, h.year, h.half);
    const full = await db.period.findUniqueOrThrow({
      where: { id: period.id },
      include: { indicators: true, evaluations: { include: { employee: { include: { manager: true } } }, orderBy: { employee: { code: "asc" } } } },
    });
    const last = pi === halves.length - 1;
    await db.$transaction(
      async (tx) => {
        for (const [i, ev] of full.evaluations.entries()) {
          const e = ev.employee;
          const code = Number(e.code ?? i);
          const low = code % 9 === 4; // two people, every half-year
          const ability = low ? 1.5 + noise(code, pi) * 0.4 : 2.7 + noise(code) * 1.9 + (noise(code, pi) - 0.5) * 0.6;
          // In the latest half-year, every fourth person hasn't been scored yet.
          if (last && !low && i % 4 === 0) continue;
          const { shared, own } = factorsFor(full.indicators, full.method, e.departmentId);
          const scores = [...shared, ...own].map((f, j) => ({
            evaluationId: ev.id,
            indicatorId: f.id,
            score: Math.max(0, Math.min(5, Math.round(ability + (noise(code, pi, j) - 0.5) * 1.6))),
          }));
          await tx.evaluationScore.createMany({ data: scores });
          const effMax = 100 - full.efficiencyShare;
          const effScore = Math.round(Math.max(0, Math.min(effMax, (ability / 5) * effMax + (noise(code, pi, 99) - 0.5) * 4)));
          const band = BANDS.find((b) => effScore >= (b.min * effMax) / 25 && effScore <= (b.max * effMax) / 25)!.key;
          const status = !last || low ? "APPROVED" : (["SUBMITTED", "MANAGER_APPROVED", "APPROVED"] as const)[i % 3];
          const supervisor = e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : ceo?.name;
          const at = new Date();
          await tx.evaluation.update({
            where: { id: ev.id },
            data: {
              ...(full.method === "CURRENT" ? { effectivenessBand: band, effectivenessScore: effScore } : {}),
              status,
              scoredByName: supervisor,
              submittedAt: at,
              ...(status !== "SUBMITTED" ? { managerApprovedAt: at, managerApprovedByName: ceo?.name } : {}),
              ...(status === "APPROVED" ? { approvedAt: at, approvedByName: ceo?.name } : {}),
            },
          });
          await recompute(tx, ev.id);
          if (status === "APPROVED") await checkTwoLow(tx, ev.id);
        }
        if (!last) await tx.period.update({ where: { id: period.id }, data: { closed: true } });
      },
      { timeout: 120_000 },
    );
  }
}
