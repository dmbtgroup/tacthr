# tactHR processes (BPMN)

The procedures of tactHR, drawn in BPMN 2.0. Each `.bpmn` file in [`bpmn/`](bpmn/) opens in Camunda
Modeler, bpmn.io or any BPMN 2.0 tool; the `.png` and `.svg` beside it are pictures of the same diagram.
Lanes show who does each step; gear boxes are steps tactHR does by itself, hand boxes are steps done
outside the app.

They follow the app as it is today, the HR instructions (HR-WI-01, the salary instruction, WI1202) and,
for the factors, specification v1.1 ([`PERFORMANCE-SPEC.md`](PERFORMANCE-SPEC.md)). The diagrams are
written by `scripts/docs/bpmn.py` and drawn by `scripts/docs/render.mjs`; change the script, not the files.

| # | Process | Who | File |
|---|---|---|---|
| 1 | Setting up a client company | Platform admin, HR | [`p1_company_setup.bpmn`](bpmn/p1_company_setup.bpmn) |
| 2 | Staff and user accounts | HR / CEO, staff | [`p2_staff_and_users.bpmn`](bpmn/p2_staff_and_users.bpmn) |
| 3 | Setting up the evaluation factors | HR / CEO | [`p3_factor_setup.bpmn`](bpmn/p3_factor_setup.bpmn) |
| 4 | Half-year performance evaluation | HR, supervisor, unit manager, CEO / board | [`p4_half_year_evaluation.bpmn`](bpmn/p4_half_year_evaluation.bpmn) |
| 5 | Poor performance follow-up | HR, supervisor, unit manager, CEO | [`p5_poor_performance.bpmn`](bpmn/p5_poor_performance.bpmn) |
| 6 | Yearly salary and bonus | CEO / board, HR | [`p6_salary_and_bonus.bpmn`](bpmn/p6_salary_and_bonus.bpmn) |

The fields entered at each step are listed in [`DATA-ENTRY.md`](DATA-ENTRY.md).

## 1. Setting up a client company
![Process 1](bpmn/p1_company_setup.png)

1. A platform admin (DMBT) creates the company on the **Platform** page: name, sign-in address,
   evaluation method, languages and the first user, who gets the HR role.
2. tactHR creates the company with the instruction's default factors and the HR sign-in.
3. For a demonstration, the admin loads made-up demo data (staff, three years of evaluations, two
   salary years).
4. The admin sends HR the address (`tacthr.dmbtgroup.com/<address>`) and password; HR signs in, changes
   the password and checks the settings.

## 2. Staff and user accounts
![Process 2](bpmn/p2_staff_and_users.png)

1. HR adds people one by one, or imports an Excel sheet in the 8 import columns.
2. On import, tactHR checks every row, adds new people and updates existing ones by personnel number,
   creates missing departments and links supervisors. A row in error stops the import, to be fixed and
   imported again.
3. People who need to sign in get a user account: managers and employees must be linked to their staff
   record. HR sends them the address and password; they change the password when they first sign in.
4. People who leave are marked inactive, never deleted, so their history stays.

## 3. Setting up the evaluation factors
![Process 3](bpmn/p3_factor_setup.png)

Following specification v1.1:
- **Mode A (the organization's own factors):** HR enters the efficiency factors and the effectiveness
  factors (from the job descriptions), weighting each from 1 to 10, or 0 to switch it off.
- **Mode B (standard):** tactHR loads the 12 standard efficiency factors with locked titles; HR adjusts
  their weights (1 to 9, or 0). Effectiveness uses either the 4 standard factors (achieving results, key
  expectations, impact, quality of results), weighted, or the direct 0-25 band score.
- In both modes HR sets the efficiency / effectiveness split (default 50 / 50, e.g. 75 / 25), and tactHR
  normalizes the weights.

The app today covers mode B with the 0-25 band score, fixed weight totals and a 75/25 or 50/50 split; see
[the differences](PERFORMANCE-SPEC.md#differences-from-the-app-today).

## 4. Half-year performance evaluation
![Process 4](bpmn/p4_half_year_evaluation.png)

1. When a half-year ends (31 Shahrivar or the end of Esfand), HR opens it.
2. tactHR copies the factors, adds everyone eligible (full-time, three months' service by the half's
   end) and sets the deadline 20 days after the half ends.
3. Each supervisor scores their team on every factor (and effectiveness), then sends each evaluation for
   approval once every score is in.
4. The unit manager (the supervisor's own supervisor) reviews it. Where the supervisor has no one above
   them, it goes straight to the board.
5. The CEO / board gives the final approval, one by one or all waiting at once. The manager or the
   board can send an evaluation back to the supervisor to change.
6. On approval tactHR calculates the results and checks for two half-years under 50 % (process 5).
7. HR chases what's left; when everyone is approved, HR closes the half-year. The results feed the
   reports, the ranking and next year's salary.

Nobody scores or approves their own evaluation.

## 5. Poor performance follow-up
![Process 5](bpmn/p5_poor_performance.png)

1. When the board approves a score under 50 %, tactHR records poor performance (no bonus that year).
2. If the previous half-year was also under 50 %, an alert appears on HR's home page.
3. HR meets the supervisor, the unit manager and the CEO about continuing the employment.
4. HR records the decision: an improvement plan, or the end of employment (the person is marked
   inactive; their history stays). HR then marks the alert done.

## 6. Yearly salary and bonus
![Process 6](bpmn/p6_salary_and_bonus.png)

1. At the start of the Persian year the board sets the minimum wage (labour office), the maximum
   salary and the bonus base; A = maximum − minimum. Salaries are due by 31 Farvardin.
2. HR opens the salary year; tactHR copies last year's factors for everyone, with one more year of
   experience.
3. HR enters or updates each person's education, experience, skill, job difficulty, job rank and
   sensitivity.
4. tactHR adds last year's average performance (approved half-years), calculates the salary
   (minimum wage + A × the sum of the seven percentages) and the bonus (base × performance coefficient;
   nothing under 50 %), and flags salaries above the maximum.
5. The CEO / board gives the CEO score (0-20 %), or for someone on probation sets the probation salary
   (not below the minimum wage, no bonus).
6. If a salary isn't right, HR revises the factors; otherwise the board approves (one by one or all
   complete) and closes the salary year.
