# Working on TactHR

Conventions the product owner asked for; follow them in every change.

## What it is
Staff performance evaluation, salary and bonus for several companies, built from the client's HR
instructions (HR-WI-01, salary instruction, WI1202) and Excel workbooks. Every calculation lives in
`src/lib/calc.ts` with tests in `src/lib/calc.test.ts`; the app follows the instructions where the
workbooks were wrong. Run `npm test` after touching it.

## UI
- Popups have a × close at the top and **no Cancel button**.
- Edit is a pencil icon, delete a red bin icon, duplicate a copy icon; PDF downloads are green.
- Ask before building when a request is ambiguous, and summarize the understanding first for bigger features.
- Keep forms compact and aligned: related boxes share rows, headings sit on top of the boxes.
- Don't show users explanations of how things work behind the scenes.

## Data
- Demo data is entirely made up: no names or figures from any customer; emails on `.example`.
  The client's personnel sheets hold real personal data: never copy them into code or demo data.

## Code
- Every UI text goes through `t("…")` with a Persian translation in `src/lib/i18n/fa.ts`;
  `npm run -s i18n:check` must report 0 missing.
- Persian screens are right to left with Jalali dates (`src/lib/dates.ts`); English uses Gregorian dates.
  Use start/end spacing and alignment (`ms-`, `me-`, `text-start`, `text-end`) so Persian mirrors.
- No Prettier: it reformats whole files. Match the surrounding style.
- Never put model identifiers in commits or code.
