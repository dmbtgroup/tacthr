import "server-only";
import bcrypt from "bcryptjs";
import type { EvalMethod, Prisma } from "@prisma/client";
import { db } from "./db";
import { CURRENT_FACTORS, DEPT_FACTORS, DEPT_SHARED_FACTORS } from "./defaults";

type Tx = Prisma.TransactionClient;

/**
 * Gives a company the default factors of its method: the 12 shared factors (current method), or the
 * 19 shared factors plus each default department's own (department method), creating those departments.
 */
export async function seedFactors(tx: Tx, organizationId: string, method: EvalMethod) {
  await tx.indicator.deleteMany({ where: { organizationId } });
  if (method === "CURRENT") {
    await tx.indicator.createMany({
      data: CURRENT_FACTORS.map((f, i) => ({ organizationId, kind: "EFFICIENCY" as const, ...f, position: i })),
    });
    return;
  }
  await tx.indicator.createMany({
    data: DEPT_SHARED_FACTORS.map((f, i) => ({ organizationId, kind: "EFFICIENCY" as const, ...f, position: i })),
  });
  for (const [name, factors] of Object.entries(DEPT_FACTORS)) {
    const dept = await tx.department.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    await tx.indicator.createMany({
      data: factors.map((f, i) => ({ organizationId, kind: "EFFECTIVENESS" as const, departmentId: dept.id, ...f, position: i })),
    });
  }
}

export async function createCompany(input: {
  name: string;
  slug: string;
  method: EvalMethod;
  languages: string[];
  admin: { name: string; email: string; password: string };
}) {
  const passwordHash = await bcrypt.hash(input.admin.password, 10);
  return db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: input.name, slug: input.slug, method: input.method, languages: input.languages },
    });
    await seedFactors(tx, org.id, input.method);
    await tx.user.create({
      data: { organizationId: org.id, name: input.admin.name, email: input.admin.email, passwordHash, role: "HR" },
    });
    return org;
  });
}
