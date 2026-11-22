# tactHR data entry, page by page

Every field a user enters, page by page: the label in English and as shown in Persian, whether it's
required, what it accepts, and notes. ✓ = required. Dates are typed as Jalali (`1404/06/05`) on Persian
screens and Gregorian on English ones; Persian or Latin digits both work. Money is in whole rials.

Fields marked **Proposed** are not in the app yet: they come from the client's personnel sheet or the
documents and are listed for a decision before they are added.

The process each page belongs to is in [`PROCESSES.md`](PROCESSES.md).

---

## 1. Platform: companies (platform admins only)
**New company** (شرکت جدید) and **Edit company** (ویرایش شرکت). Process 1.

| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Company name | نام شرکت | ✓ | Text | Shown on the sign-in page and the menu |
| Address | نشانی | ✓ | Small Latin letters, digits and dashes, up to 40, unique | Sign-in at `tacthr.dmbtgroup.com/<address>`; app page names (home, staff, …) can't be used |
| Evaluation method | روش ارزیابی | ✓ | Shared factors, out of 100 / Shared and department factors, out of 650 | Changing it later brings that method's default factors |
| Languages | زبان‌ها | ✓ | فارسی, English (at least one) | Both by default |
| First user (HR): name | نام | ✓ (new) | Text | Gets the HR role |
| First user: email | ایمیل | ✓ (new) | Email | Sign-in name |
| First user: password | رمز عبور | ✓ (new) | 8 characters or more | |
| Active | فعال | | Yes / no (edit only) | Unticked = suspended: nobody can sign in, data kept |

**Delete company** and **Reload demo data**: type the company's name to confirm.

**Platform admins** (مدیران سامانه): name ✓, email ✓, password ✓ (8+).

## 2. Settings (HR / CEO)
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Company name | نام شرکت | ✓ | Text | |
| Efficiency / effectiveness | کارایی / اثربخشی | | 75 / 25 or 50 / 50 | Out-of-100 method only; set by the CEO / board. Spec v1.1: default 50 / 50, any split |
| Languages | زبان‌ها | ✓ | فارسی, English | |
| Sign-in address, evaluation method | نشانی ورود، روش ارزیابی | | Shown only | Set by the platform admin |

## 3. Staff (HR / CEO)
**New person** (فرد جدید) and the pencil on a row. Process 2.

### In the app
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| First name | نام | ✓ | Text | |
| Last name | نام خانوادگی | ✓ | Text | |
| Personnel no. | شماره پرسنلی | | Text or digits, unique in the company | Matches people on Excel import |
| Job title | سمت | | Text | |
| Department | واحد | | From the department list | |
| Supervisor | سرپرست | | From the active staff | Scores this person; nobody can be their own supervisor, directly or through others |
| Start date | تاریخ شروع به کار | | Date | Decides eligibility (3 months by the end of the half-year) |
| Full-time | تمام‌وقت | | Yes / no (default yes) | Only full-time staff are evaluated |
| Active | فعال | | Yes / no (edit only) | Untick when someone leaves; history stays |

### Proposed (from the client's personnel sheet and the salary instruction)
| Field | Persian label | Format / allowed values | Why |
|---|---|---|---|
| Father's name | نام پدر | Text | Personnel sheet |
| National ID | کد ملی | 10 digits, checked, unique | Personnel sheet; sure identification |
| ID card number | شماره شناسنامه | Digits | Personnel sheet |
| Date of birth | تاریخ تولد | Date | Personnel sheet |
| Marital status | وضعیت تأهل | Single / married | Personnel sheet |
| Phone | شماره تماس | Mobile number | Personnel sheet |
| Home address | آدرس منزل | Text | Personnel sheet |
| Education level | مدرک تحصیلی | Diploma or less / associate / bachelor's / master's / doctorate | Personnel sheet; today entered each year on the salary form |
| Field of study | رشته تحصیلی | Text | Personnel sheet; helps judge relevant education |
| Relevant experience before joining | سابقه کار مرتبط قبلی | Years | Salary instruction 5-2; today entered as total years on the salary form |
| Email | ایمیل | Email | For sign-in invitations and reminders |

National ID, date of birth, phone and address are personal data: if added, only HR and the CEO should
see them.

### Excel import (ورود از اکسل)
One person per row under a heading row, in this column order:

| # | Column | Req. | Notes |
|---|---|---|---|
| 1 | Personnel no. | | Existing people with this number are updated, not added again |
| 2 | First name | ✓ | |
| 3 | Last name | ✓ | |
| 4 | Job title | | |
| 5 | Department | | Created when new |
| 6 | Supervisor's personnel no. | | Can point to a row further down |
| 7 | Start date | | Jalali (`1399/11/08`), Gregorian, or an Excel date |
| 8 | Full-time | | yes / no (بله / خیر); empty = yes |

### Departments (واحدها)
| Field | Persian label | Req. | Format | Notes |
|---|---|---|---|---|
| Name | نام | ✓ | Text, unique in the company | In the out-of-650 method each department has its own effectiveness factors |

## 4. Users (HR / CEO)
**New user** (کاربر جدید) and the pencil on a row. Process 2.

| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Name | نام | ✓ | Text | |
| Email | ایمیل | ✓ | Email, unique in the company | Sign-in name |
| Role | نقش | ✓ | Employee / Manager-supervisor / HR / CEO-board | See the rights below |
| Staff record | پرونده پرسنلی | ✓ for manager and employee | One of the active staff, one account per person | Links the account to the person scored or scoring |
| Password / new password | رمز عبور / رمز عبور جدید | ✓ (new) | 8 characters or more | Leave empty on edit to keep it |
| Active | فعال | | Yes / no (edit only) | Nobody can remove their own access |

| Role | Can |
|---|---|
| Employee (کارمند) | See their own approved results and salary |
| Manager / supervisor (مدیر / سرپرست) | Score their team; approve as unit manager; see their team's reports |
| HR (منابع انسانی) | Everything except the board's decisions: staff, users, factors, half-years, salaries, settings |
| CEO / board (مدیرعامل / هیئت‌مدیره) | Everything, plus final approvals, the CEO score, probation salaries and closing a salary year |

**My account** (حساب من): current password ✓, new password ✓ (8+).

## 5. Factors (HR / CEO)
**New factor** (شاخص جدید) and the pencil on a row. Process 3.

| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Factor | شاخص | ✓ | Text | Spec v1.1 mode B: the 12 standard titles are locked |
| Weight | وزن | ✓ | Whole number 1-9 (out of 100) or 1-20 (out of 650) | Shared factors total 60 (out of 100); shared and each department's factors total 65 each (out of 650). Spec v1.1: 0 allowed to switch off, normalized |
| Description | شرح | | Text | Shown under the factor on the scoring form |

**Restore defaults** (بازگرداندن پیش‌فرض‌ها) puts back the instruction's factors and weights. A half-year
already open keeps its own copy.

## 6. Evaluations
### Open a half-year (HR / CEO)
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Half-year | نیم‌سال | ✓ | A half-year of this or last year that has started and isn't open | tactHR sets the deadline (end + 20 days), copies the factors and adds eligible staff |

### Scoring form (supervisor, or HR / CEO). Process 4.
| Field | Persian label | Req. | Format / allowed values | Notes |
|---|---|---|---|---|
| Score per factor | امتیاز (۰ تا ۵) | ✓ to send | 0-5 per factor | Spec v1.1: 1-5, with a description beside each level |
| Effectiveness band | سطح | ✓ to send (out of 100) | Very high 21-25, high 16-20, medium 11-15, low 6-10, very low 0-5 | Doubled when the split is 50 / 50 |
| Effectiveness score | نمره کمی اثربخشی | ✓ to send (out of 100) | Number inside the chosen band | |
| Notes | توضیحات | | Text | |

Shown as you score: efficiency, effectiveness, total, percent and coefficient. **Save** keeps a draft;
**Send for approval** needs every score. Approvals (approve, approve as board, send back) have no fields.

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
| Education level | تحصیلات · سطح | ✓ | Diploma or less / associate / bachelor's / master's / doctorate | |
| Education score | امتیاز | ✓ | % inside the level's range: 0-1, 0-3, 2-7, 3-10, 4-10 | |
| Relevant experience | سابقه کار مرتبط | ✓ | Whole years, 0 or more | 1 % a year, at most 20 % |
| Skill level | مهارت · سطح | ✓ | 0-9 | 0, 1, 3, 5, 6, 8, 9, 11, 13, 15 % |
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

Calculated, not entered: last year's performance (average of the approved half-years; nothing under 60),
the total share of A, the salary, the above-maximum warning and the bonus.
