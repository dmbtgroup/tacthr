# TactHR

**TactHR** by DMBT: staff performance evaluation, salary and bonus. It runs at
**https://tacthr.dmbtgroup.com**; each company signs in at its own address, e.g. `/homeco`.

## What it does
- **Companies** (platform admins, `/platform`): create a company with its address, evaluation method and
  languages, and its first HR user; edit, suspend, delete; load made-up demo staff into an empty company.
- **Evaluation methods**, chosen per company:
  - *Shared factors, out of 100* (HR-WI-01): 12 factors weighted 1–9 (total 60), scored 0–5; efficiency
    = Σ(weight × score) ÷ 3 × 0.75 (out of 75), effectiveness chosen inside a band (out of 25).
  - *Shared and department factors, out of 650* (WI1202): 19 shared factors and each department's own,
    each set weighted to 65, scored 0–5; performance coefficient = total ÷ 540, at most 1.2.
- **Roles**: HR (staff, users, periods, factors, settings), CEO / board (all of HR plus approvals, the
  CEO score and salary figures), manager / supervisor (scores their own team), employee (own results).
- **Staff**: personnel no., name, job title, department, supervisor, start date, full-time; import from
  Excel (columns in the import popup); departments.
- **Languages**: Persian (right to left, Jalali dates) and English (Gregorian dates); each company picks
  which it offers, each user switches.

The calculations are in `src/lib/calc.ts` and checked by `npm test`.

## Running it
```
npm install
cp .env.example .env   # set DATABASE_URL, SESSION_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npx prisma migrate dev
npx prisma db seed     # first platform admin
npm run dev
```

## Deploying (Vercel)
Environment variables: `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (from the Neon Postgres integration),
`SESSION_SECRET` (32+ random characters), `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` for the first
platform admin. Each deploy runs the database migrations and the seed (`npm run vercel-build`).
