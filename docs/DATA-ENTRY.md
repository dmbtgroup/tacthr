# Data entry, page by page

Every field entered on each page: the label in English and Persian, whether it's required, what it
accepts, and notes. ✓ = required. Dates are entered as Jalali (`1404/06/05`) on Persian screens and
Gregorian on English ones; Persian or Latin digits both work. Money is in whole rials.

The process each page belongs to is described in [Processes](PROCESSES.md).

---

## 1. Companies (system administrator)
**New company** and **Edit company**. Process 1.

| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Company name | نام شرکت | ✓ | Text | Shown on the sign-in page and the menu |
| Sign-in address | نشانی ورود | ✓ | Small Latin letters, digits and dashes, up to 40, unique | The company's own sign-in page |
| Evaluation mode | حالت ارزیابی | ✓ | A: the organization's own factors / B: standard factors | See specification v1.1 |
| Languages | زبان‌ها | ✓ | فارسی, English (at least one) | Both by default |
| First user (HR): name | نام | ✓ (new) | Text | Gets the HR role |
| First user: email | ایمیل | ✓ (new) | Email | Sign-in name |
| First user: password | رمز عبور | ✓ (new) | 8 characters or more | |
| Active | فعال | | Yes / no (edit only) | Unticked = suspended: nobody can sign in, data kept |

## 2. Settings (HR / CEO)
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Company name | نام شرکت | ✓ | Text | |
| Efficiency / effectiveness split | نسبت کارایی / اثربخشی | ✓ | Default 50 / 50; any split totalling 100 (e.g. 75 / 25) | 75 / 25 while job descriptions are incomplete |
| Languages | زبان‌ها | ✓ | فارسی, English | |

## 3. Staff (HR / CEO)
**New person** and the pencil on a row. Process 2.

| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| First name | نام | ✓ | Text | |
| Last name | نام خانوادگی | ✓ | Text | |
| Father's name | نام پدر | | Text | |
| National ID | کد ملی | | 10 digits, checked, unique | Sure identification |
| ID card number | شماره شناسنامه | | Digits | |
| Date of birth | تاریخ تولد | | Date | |
| Marital status | وضعیت تأهل | | Single / married | |
| Phone | شماره تماس | | Mobile number | |
| Email | ایمیل | | Email | For sign-in invitations and reminders |
| Home address | آدرس منزل | | Text | |
| Personnel no. | شماره پرسنلی | | Text or digits, unique in the company | Matches people on Excel import |
| Job title | سمت | | Text | |
| Department | واحد | | From the department list | |
| Supervisor | سرپرست | ✓ to be scored | From the active staff | The first scorer, always; nobody can be their own supervisor, directly or through others |
| Second scorer | امتیازدهنده دوم | | From the active staff, not the person or the supervisor | Scores the person separately |
| Third scorer | امتیازدهنده سوم | | From the active staff, not the person or the other scorers | Scores the person separately |
| Start date | تاریخ شروع به کار | ✓ | Date | Decides eligibility (3 months by the end of the half-year) |
| Full-time | تمام‌وقت | ✓ | Yes / no (default yes) | Only full-time staff are evaluated |
| Education level | مدرک تحصیلی | | Diploma or less / associate / bachelor's / master's / doctorate | Used for the salary |
| Field of study | رشته تحصیلی | | Text | Helps judge relevant education |
| Relevant experience before joining | سابقه کار مرتبط قبلی | | Years | Used for the salary |
| Active | فعال | | Yes / no (edit only) | Untick when someone leaves; history stays |

National ID, date of birth, phone and home address are personal data: only HR and the CEO see them.

### Second or third scorer for everyone
**Scorer for everyone** on the staff page. Process 2.

| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Which scorer | کدام امتیازدهنده | ✓ | Second / third | |
| Scorer | امتیازدهنده | ✓ | From the active staff | Not set for themselves |
| Apply to | اعمال برای | ✓ | All active staff / one department | |
| Department | واحد | ✓ for one department | From the departments | |
| Replace the current scorers | جایگزینی امتیازدهندگان فعلی | | Yes / no (default no) | No = only people without one get it |

### Excel import
One person per row under a heading row. Columns, in order: personnel no., first name ✓, last name ✓,
job title, department, supervisor's personnel no., start date, full-time (yes / no; empty = yes), then the
other staff fields in the order of the table above. Existing people with the same personnel no. are
updated, not added again; new departments are created; a supervisor can be a row further down.

### Departments
| Field | Persian label | Req. | Format | Notes |
|---|---|---|---|---|
| Name | نام | ✓ | Text, unique in the company | |

## 4. Users (HR / CEO)
**New user** and the pencil on a row. Process 2.

| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Name | نام | ✓ | Text | |
| Email | ایمیل | ✓ | Email, unique in the company | Sign-in name |
| Role | نقش | ✓ | Employee / manager-supervisor / HR / CEO-board | See the rights below |
| Staff record | پرونده پرسنلی | ✓ for manager and employee | One of the active staff, one account per person | Links the account to the person scored or scoring |
| Password | رمز عبور | ✓ (new) | 8 characters or more | Left empty on edit to keep it |
| Active | فعال | | Yes / no (edit only) | Nobody can remove their own access |

| Role | Can |
|---|---|
| Employee (کارمند) | See their own results and salary |
| Manager / supervisor (مدیر / سرپرست) | Score the people they are a scorer for; notified of scores still missing; see their team's reports |
| HR (منابع انسانی) | Staff and their scorers, users, factors, half-years, salaries and settings; notified each time a scorer completes a person's scoring, and of whatever needs following up; not the board's decisions |
| CEO / board (مدیرعامل / هیئت‌مدیره) | Everything, plus salary approvals, the CEO score, probation salaries and closing a salary year |

**My account**: current password ✓, new password ✓ (8+).

## 5. Factors (HR / CEO)
Process 3. Fields depend on the evaluation mode.

### Mode A: the organization's own factors
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Efficiency factor | شاخص کارایی | ✓ | Text; as many as needed | |
| Its weight | وزن | ✓ | Whole number 1-10, or 0 to switch it off | Normalized automatically |
| Effectiveness factor | شاخص اثربخشی | ✓ | Text, from the job descriptions; as many as needed | |
| Its weight | وزن | ✓ | Whole number 1-10, or 0 | Normalized within effectiveness |
| Description | شرح | | Text | Shown under the factor on the scoring form |

### Mode B: the standard factors
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Weight of each of the 12 efficiency factors | وزن | ✓ | Whole number 1-9, or 0 to leave it out | Titles locked; default weights total 60 (fixed total of 60, or normalized) |
| Effectiveness pattern | الگوی اثربخشی | ✓ | 4 standard factors / direct 0-25 score | |
| Weight of each of the 4 effectiveness factors | وزن | ✓ (4 factors) | Whole number, or 0 to leave it out | Achieving results, key expectations, impact, quality of results; normalized |

**Restore defaults** puts back the instruction's factors and weights. A half-year already open keeps its
own copy.

## 6. Evaluations
### Open a half-year (HR / CEO)
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Half-year | نیم‌سال | ✓ | A half-year that has started and isn't open | The system sets the deadline (end + 20 days), copies the factors and adds eligible staff |

### Scoring form (each of the person's scorers, separately). Process 4.
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Score per efficiency factor | امتیاز | ✓ to send | 1-5, each option with its description | 5 excellent, 4 good, 3 acceptable, 2 weak, 1 not achieved |
| Score per effectiveness factor | امتیاز | ✓ to send (mode A, or B with 4 factors) | 1-5, each option with its description | |
| Effectiveness band | سطح اثربخشی | ✓ to send (B with the 0-25 score) | Very high 21-25, high 16-20, medium 11-15, low 6-10, very low 0-5 | |
| Effectiveness score | نمره اثربخشی | ✓ to send (B with the 0-25 score) | Number inside the chosen band | |
| Notes | توضیحات | | Text | |

Shown as you score: the efficiency score, the effectiveness score and the total, each 0-100 %. **Save**
keeps a draft; **Complete** needs every score and notifies HR. No approval follows. The person's
result is the average of the scorers who completed their scoring by the deadline, factor by factor; the
supervisor's score alone is enough.

## 7. Salaries and bonus
### Open a salary year / year figures (HR / CEO). Process 6.
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Year | سال | ✓ | Jalali year, e.g. 1405; not already open | Due 31 Farvardin |
| Minimum wage | حداقل دستمزد (اداره کار، ریال) | ✓ | Rials, more than 0 | |
| Maximum salary | سقف حقوق (ریال) | ✓ | Rials, not below the minimum wage | A = maximum − minimum |
| Bonus base | مبنای پاداش (ریال) | | Rials, default 0 | Bonus = base × performance coefficient |

Opening a year copies everyone's factors from the year before, with one more year of experience.
Changing the figures later needs the board's approval again for every salary.

### Salary form, one per person (HR / CEO)
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Education level | سطح تحصیلات | ✓ | Diploma or less / associate / bachelor's / master's / doctorate | |
| Education score | امتیاز تحصیلات | ✓ | % inside the level's range: 0-1, 0-3, 2-7, 3-10, 4-10 | |
| Relevant experience | سابقه کار مرتبط | ✓ | Whole years, 0 or more | 1 % a year, at most 20 % |
| Skill level | سطح مهارت | ✓ | 0-9 | 0, 1, 3, 5, 6, 8, 9, 11, 13, 15 % |
| Physical strain | فشار جسمی | ✓ | 0-5 | Job difficulty = sum of the four ÷ 2 % |
| Work environment | شرایط محیطی | ✓ | 0-5 | |
| Mental pressure | فشار ذهنی و روانی | ✓ | 0-5 | |
| Risk and safety | ریسک و ایمنی | ✓ | 0-5 | |
| Job rank | رتبه شغلی | ✓ | Employee / expert / senior expert / supervisor / manager | |
| Rank score | امتیاز رتبه | ✓ | % inside the rank's range: 0-2, 1-4, 3-8, 6-12, 10-15 | Job grade = rank score + sensitivity |
| Job sensitivity | حساسیت شغلی | ✓ | None to very high = 0-5 % | |
| CEO / board score | امتیاز مدیرعامل / هیئت‌مدیره | | 0-20 % | CEO / board only; empty = 0 |
| On probation | دوره آزمایشی | | Yes / no | CEO / board only |
| Probation salary | حقوق دوره آزمایشی (ریال) | ✓ on probation | Rials, not below the minimum wage | Replaces the calculation; no bonus |
| Notes | توضیحات | | Text | |

Calculated, not entered: last year's performance (average of the completed half-years; nothing under 60),
the total share of A, the salary, the above-maximum warning and the bonus.
