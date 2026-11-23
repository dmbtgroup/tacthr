# Performance evaluation module: specification v1.1

English summary of *سند مشخصات فنی و محصولی جامع — ماژول ارزیابی عملکرد کارکنان (کارایی و اثربخشی)*,
version 1.1, by House Of Management Engineering (خانه مهندسی مدیریت). The original Persian document
([appended in full](performance-spec-v1.1-fa.pdf)) prevails wherever it and this summary differ. References: the workbook "فرم تعیین امتیاز عملکرد پرسنل.xlsx" and the HR-WI-01/00
performance evaluation instruction.

## 1. Purpose
Evaluate staff on two dimensions, **efficiency** (کارایی) and **effectiveness** (اثربخشی). At the start of
evaluation the organization chooses one of two modes, according to how mature its processes are:

- **Mode A: the organization's own factors.** It enters its own efficiency and effectiveness factors.
- **Mode B: the program's standard factors.** It uses the factors built into the software (from the
  reference workbook and the HR-WI-01 instruction); no written job descriptions are needed.

## 2. Mode A: the organization's own factors
For organizations with their own factors and written job descriptions.

**Efficiency factors**
1. The user enters the factors: how many, and each one's title.
2. Each factor gets a weight from **1 to 10**, or **0** to switch it off. The system **normalizes** the
   weights automatically (each weight ÷ the total).

**Effectiveness factors**
1. The user enters the factors, usually taken from the job descriptions: how many, and each title.
2. Each gets a weight from **1 to 10** (or **0**), normalized automatically within effectiveness.

## 3. Mode B: the program's standard factors
For organizations without written job descriptions or predefined efficiency factors.

### 3.1 The 12 fixed efficiency factors
- Loaded by default from the workbook's `Weight_Of_Indicators` sheet.
- **Titles are locked**: the user can't rename or remove them.
- The user only sets each factor's weight: **1 to 9** as in the instruction, or **0** to leave the factor
  out of the calculation. The workbook's default weights total **60**; the system must support either
  keeping the fixed total of 60 or normalizing the weights automatically.

| # | Factor (locked) | Description (from the instruction) | Default weight |
|---|---|---|---|
| 1 | نظم و انضباط | Following 5S; order, discipline and cleanliness of the workplace and equipment | 3 |
| 2 | مدیریت زمان | Punctuality; valuing one's own and others' time; keeping to lunch and break times | 3 |
| 3 | رعایت قوانین و مقررات | Knowing the organization's rules and keeping to management's decisions | 7 |
| 4 | تعادل رفتاری | Good manners and conduct; avoiding tension and side issues; controlling emotions and anger | 5 |
| 5 | همدلی و وفاداری به سازمان و تعهد سازمانی | Loyalty and long-term presence; commitment to goals; extra effort in crises; putting the organization's resources and goals first; caring for the organization and colleagues | 8 |
| 6 | همکاری گروهی | Taking part in teamwork; a spirit of interaction and cooperation | 5 |
| 7 | تمرکز و دقت | Attention to detail; not forgetting; keeping one's own and others' focus at work | 3 |
| 8 | وظیفه‌شناسی، مسئولیت‌پذیری و پیگیری امور محوله | Accepting and keeping to responsibility; needing no reminders; following through on one's own | 9 |
| 9 | سرعت عمل (راندمان) | Workload in proportion to time spent; not procrastinating | 7 |
| 10 | خلاقیت و ابتکار و مشارکت در نظام پیشنهادات | Constructive, useful and innovative ideas and suggestions | 1 |
| 11 | رضایت مراجعین و همکاران | Treating others well and leaving them with a good feeling | 3 |
| 12 | آموزش‌پذیری و آموزش به دیگران | Eagerness to teach and guide colleagues; drive to grow and learn | 6 |
| | **Total** | | **60** |

### 3.2 Effectiveness in mode B: two supported patterns
**a) The program's main pattern: 4 standard effectiveness factors.** The user can change the weights
between them, including setting one to 0:

1. **تحقق نتیجه (achieving results):** how far the person reaches the expected goals and outputs.
2. **تحقق انتظارات کلیدی (meeting key expectations):** how far the key expectations defined for the role are met.
3. **تأثیرگذاری (impact):** how much the person's work affects processes, the team or broader goals.
4. **کیفیت نتیجه (quality of results):** the accuracy, standard and quality of what is delivered.

**b) The instruction's alternative: a direct score from 0 to 25.** As in table 2 of the instruction, when
job descriptions are incomplete the manager scores effectiveness directly, from 0 to 25, in five bands:
very low 0–5, low 6–10, medium 11–15, high 16–20, very high 21–25.

## 4. Weighting, scoring and calculation
### 4.1 The split between efficiency and effectiveness
In both modes the system asks for each dimension's share of the final score:
- **Default: 50 % efficiency, 50 % effectiveness.**
- **Custom**, e.g. 75 / 25: where job descriptions aren't complete and effectiveness can't be measured
  precisely, the temporary split is 75 % efficiency and 25 % effectiveness.

### 4.2 The people evaluated and the 5-point scale
The system takes the people to evaluate and shows each one a scoring form on a **5-point scale, 1 to 5**
(the instruction says 0 to 5 for efficiency; the software standardizes on 1 to 5). Each option **must show
its description**:

| Score | Level | Guidance shown on the form |
|---|---|---|
| 5 | خیلی خوب محقق شده (excellent) | Beyond the standard; the factor fully achieved, with quality |
| 4 | خوب محقق شده (good) | Above expectations; the factor achieved well |
| 3 | متوسط / قابل قبول (acceptable) | The basic, expected standard met as usual |
| 2 | ضعیف / کمتر از انتظار (weak) | The factor partly achieved; needs real improvement |
| 1 | محقق نشده (not achieved) | Not achieved, or far below the minimum standard |

### 4.3 Calculation and required outputs
For each person the system calculates and shows three separate results, as a percentage from 0 to 100:
1. **Efficiency score:** Σ (each efficiency factor's score × its normalized weight).
2. **Effectiveness score:** Σ (each effectiveness factor's score × its normalized weight).
3. **Total performance score:** efficiency × efficiency share + effectiveness × effectiveness share
   (e.g. 50 / 50 or 75 / 25), reported from 0 to 100 %.

## 5. The organization's rules (HR-WI-01)
- **Who is evaluated:** full-time staff with at least **3 months'** service; the system must filter out
  or warn about people with less.
- **Periods:** Farvardin to Esfand in two **half-years**, each evaluated within **20 days** after it ends.
- **Scorers:** each person has up to three scorers, chosen in their profile by HR or the CEO: the
  supervisor (always) and up to two more. Each scores separately; the person's result is the average of
  the scores given by the deadline, and the supervisor's score alone is enough. There is no approval
  step: HR is notified each time a scorer completes a person's scoring.
- **Under 50 %:** a total under 50 % is recorded as **poor performance**. Twice in a row, the system
  raises an alert to review continued employment, for the HR committee, the supervisor or unit manager
  and the CEO.

## 6. The two modes side by side
| | Mode A (organization's own) | Mode B (program standard) |
|---|---|---|
| Efficiency factors | Number and titles entered by the user | The 12 fixed factors (titles locked) |
| Effectiveness factors | Number and titles from the job descriptions | The 4 standard factors (or the 0–25 direct score) |
| Factor weights | 1–10 by the user, normalized; 0 allowed | Weights on the fixed factors (default total 60); 0 allowed |
| Efficiency / effectiveness split | 50 / 50 or the user's own | 50 / 50 or the user's own (e.g. 75 / 25 without job descriptions) |
| Result | Total = efficiency × % efficiency + effectiveness × % effectiveness | The same, from 0 to 100 % |

## 7. Process flow
**Mode A**
1. Enter the number and titles of the efficiency factors.
2. Weight each efficiency factor (1–10, or 0), normalized.
3. Enter the number and titles of the effectiveness factors (from the job descriptions).
4. Weight each effectiveness factor (1–10, or 0), normalized.
5. Set the efficiency / effectiveness split (50 / 50 or custom).
6. Enter the people and score each on the 5-point scale, with the level descriptions shown.
7. Output: efficiency score, effectiveness score and total performance score.

**Mode B**
1. Load the 12 fixed efficiency factors (titles locked).
2. Weight them (default total 60; 0 allowed).
3. Effectiveness with the 4 standard factors (or the 0–25 direct score).
4. Weight the 4 effectiveness factors and set the efficiency / effectiveness split.
5. Enter the eligible people (3 months' service or more) and score each 1 to 5, with the level descriptions shown.
6. Output: efficiency score, effectiveness score and total performance score.

## Questions to settle
1. **Turning 1–5 into a percentage.** v1.1 asks for 0–100 % scores but scores from 1 to 5. Is 5 = 100 %
   and 1 = 20 % (score ÷ 5), or 1 = 0 % and 5 = 100 % ((score − 1) ÷ 4)?
2. **The department method of WI1202** (shared factors plus each department's own, out of 650). v1.1
   doesn't mention it. Keep it as a third option, fold it into mode A (department factors as the
   organization's own), or drop it?
3. **Mode B weights.** Keep the rule that weights total exactly 60, or always normalize (so any total
   works)? v1.1 asks for both to be possible: is it a per-company choice?
4. **Effectiveness in mode B.** Is the choice between the 4 factors and the 0–25 score made per company
   or per half-year?

<!-- status: kept in the repository, left out of the PDF until the procedures are final -->
## Differences from the app today (internal)
What the app does now (performance part; salary and bonus are outside this spec), against v1.1:

| Topic | v1.1 | The app today |
|---|---|---|
| Modes | A (own factors) or B (standard) | "Shared factors, out of 100" (close to B) and "Shared and department factors, out of 650" (WI1202, not in v1.1) |
| Own factors (mode A) | Any number of efficiency and effectiveness factors, entered by the organization | Factors can be added and edited, but effectiveness factors exist only per department in the out-of-650 method |
| Standard factor titles | Locked | Editable, and factors can be deleted |
| Weights | 1–10 (A) or 1–9 (B); **0 switches a factor off**; normalized automatically, or fixed total 60 in B | 1–9 (or 1–20 in the out-of-650 method); 0 not allowed; totals must be exactly 60 (or 65 + 65) |
| Effectiveness in B | 4 standard factors, weighted; or the 0–25 band score | Only the 0–25 band score |
| Efficiency / effectiveness split | Default 50 / 50; any custom split | 75 / 25 or 50 / 50; default 75 / 25 |
| Score scale | **1 to 5**, each option with its description on the form | 0 to 5, no descriptions |
| Scores | Each score shown separately as 0–100 %, total as the weighted mix | Efficiency out of 75 (or its share), effectiveness out of 25, total out of 100 (or out of 650) |
| Eligibility, half-years, 20-day deadline, two halves under 50 % | As in section 5 | Already done |
| Scorers and approval | Up to 3 scorers per person, averaged; no approval, HR notified | One scorer (the supervisor), then unit manager and board approval |

Also to settle then: scores already given on 0–5 (including the demo history): keep them as they are, or
convert them to the 1–5 scale?
<!-- /status -->
