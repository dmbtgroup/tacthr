import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Creates the first platform admin, only while there are no platform admins at all; after that they
 * are managed on the Platform page. Never overwrites an existing account.
 */
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    console.log("SEED_ADMIN_PASSWORD not set; skipping platform admin seed.");
    return;
  }
  if (password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  const passwordHash = await bcrypt.hash(password, 10);

  // SEED_ADMIN_RESET_PASSWORD=true is a one-off recovery switch: it resets SEED_ADMIN_EMAIL's password
  // to SEED_ADMIN_PASSWORD on the next deploy. Turn it off afterwards, or every deploy resets it.
  if (process.env.SEED_ADMIN_RESET_PASSWORD === "true") {
    const { count } = await prisma.user.updateMany({
      where: { email, isPlatformAdmin: true },
      data: { passwordHash, active: true },
    });
    console.log(count ? `Platform admin ${email}: password reset` : `No platform admin ${email} to reset`);
    return;
  }

  const existing = await prisma.user.count({ where: { isPlatformAdmin: true } });
  if (existing) {
    console.log(`${existing} platform admin(s) exist; nothing to seed.`);
    return;
  }
  await prisma.user.create({
    data: { email, name: "Platform admin", isPlatformAdmin: true, passwordHash, role: "HR" },
  });
  console.log(`Platform admin created: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
