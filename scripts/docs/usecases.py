"""Draws the UML use case diagrams in docs/usecases/ (English) and docs/usecases/fa/ (Persian) as SVG.

Run: python3 scripts/docs/usecases.py

One diagram per area: the people on one side, the system on the other, the use cases in the system
boundary between them. Persian diagrams are mirrored (people on the right).
"""
import os
from xml.sax.saxutils import escape

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "usecases")

FA = {
    "Company and staff": "شرکت و پرسنل",
    "Factors and half-year evaluation": "شاخص‌ها و ارزیابی نیم‌سالانه",
    "Salary and bonus": "حقوق و پاداش",
    "Results and reports": "نتایج و گزارش‌ها",
    "System administrator": "مدیر سیستم",
    "HR / CEO": "منابع انسانی / مدیرعامل",
    "Any user": "هر کاربر",
    "System": "سامانه",
    "Scorer": "امتیازدهنده",
    "CEO / board": "مدیرعامل / هیئت‌مدیره",
    "HR": "منابع انسانی",
    "Employee": "کارمند",
    "Manager / supervisor": "مدیر / سرپرست",
    "Create a client company": "ایجاد شرکت مشتری",
    "Add or edit a person": "افزودن یا ویرایش فرد",
    "Import staff from Excel": "ورود پرسنل از اکسل",
    "Choose a person's scorers": "انتخاب امتیازدهندگان فرد",
    "Set a scorer for everyone": "تعیین امتیازدهنده برای همه",
    "Mark a person as left": "ثبت جدایی فرد",
    "Create a user account": "ایجاد حساب کاربری",
    "Sign in and change the password": "ورود و تغییر رمز عبور",
    "Set up the evaluation factors": "تعریف شاخص‌های ارزیابی",
    "Open a half-year": "باز کردن نیم‌سال",
    "Score a person": "امتیازدهی به فرد",
    "Send notifications": "ارسال اعلان‌ها",
    "Average and calculate the results": "میانگین‌گیری و محاسبه نتایج",
    "Close the half-year": "بستن نیم‌سال",
    "Follow up poor performance": "پیگیری عملکرد نامناسب",
    "Set the year's figures": "تعیین ارقام سال",
    "Open a salary year": "باز کردن سال حقوقی",
    "Enter a person's salary factors": "ورود شاخص‌های حقوق فرد",
    "Give the CEO score or probation salary": "امتیاز مدیرعامل یا حقوق دوره آزمایشی",
    "Approve salaries and close the year": "تأیید حقوق‌ها و بستن سال",
    "See own results and salary": "دیدن نتایج و حقوق خود",
    "See reports and ranking": "دیدن گزارش‌ها و رتبه‌بندی",
}

# (file, title, people (left), system side (right), [(id, use case, [actors])])
AREAS = [
    ("uc_a_company_staff", "Company and staff", ["System administrator", "HR / CEO", "Any user"], ["System"], [
        ("01", "Create a client company", ["System administrator", "System"]),
        ("02", "Add or edit a person", ["HR / CEO"]),
        ("03", "Import staff from Excel", ["HR / CEO", "System"]),
        ("04", "Choose a person's scorers", ["HR / CEO"]),
        ("05", "Set a scorer for everyone", ["HR / CEO", "System"]),
        ("06", "Mark a person as left", ["HR / CEO"]),
        ("07", "Create a user account", ["HR / CEO"]),
        ("08", "Sign in and change the password", ["Any user"]),
    ]),
    ("uc_b_evaluation", "Factors and half-year evaluation", ["HR / CEO", "Scorer"], ["System"], [
        ("09", "Set up the evaluation factors", ["HR / CEO", "System"]),
        ("10", "Open a half-year", ["HR / CEO", "System"]),
        ("11", "Score a person", ["Scorer"]),
        ("12", "Send notifications", ["System", "HR / CEO", "Scorer"]),
        ("13", "Average and calculate the results", ["System"]),
        ("14", "Close the half-year", ["HR / CEO"]),
        ("15", "Follow up poor performance", ["System", "HR / CEO"]),
    ]),
    ("uc_c_salary", "Salary and bonus", ["CEO / board", "HR"], ["System"], [
        ("16", "Set the year's figures", ["CEO / board"]),
        ("17", "Open a salary year", ["HR", "System"]),
        ("18", "Enter a person's salary factors", ["HR", "System"]),
        ("19", "Give the CEO score or probation salary", ["CEO / board"]),
        ("20", "Approve salaries and close the year", ["CEO / board"]),
    ]),
    ("uc_d_results", "Results and reports", ["Employee", "Manager / supervisor", "HR / CEO"], [], [
        ("21", "See own results and salary", ["Employee"]),
        ("22", "See reports and ranking", ["Manager / supervisor", "HR / CEO"]),
    ]),
]

W, CASE_W, CASE_H, GAP, TOP = 1100, 330, 52, 22, 70
BLUE, INK, LINE = "#0f6cc2", "#1f2933", "#7a8794"


def wrap(text, n):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > n:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    return lines + [cur]


def text(x, y, s, size, rtl, weight=400, fill=INK, n=34):
    lines = wrap(s, n)
    y0 = y - (len(lines) - 1) * (size + 3) / 2
    d = ' direction="rtl"' if rtl else ""
    return "".join(
        f'<text x="{x}" y="{y0 + i * (size + 3):.1f}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="middle" dominant-baseline="middle"{d}>{escape(l)}</text>'
        for i, l in enumerate(lines))


def actor(x, y, name, rtl):
    return (f'<g stroke="{INK}" stroke-width="2" fill="none"><circle cx="{x}" cy="{y - 34}" r="11" />'
            f'<line x1="{x}" y1="{y - 23}" x2="{x}" y2="{y + 6}" /><line x1="{x - 18}" y1="{y - 12}" x2="{x + 18}" y2="{y - 12}" />'
            f'<line x1="{x}" y1="{y + 6}" x2="{x - 14}" y2="{y + 30}" /><line x1="{x}" y1="{y + 6}" x2="{x + 14}" y2="{y + 30}" /></g>'
            + text(x, y + 50, name, 13, rtl, 600, n=18))


def system_box(x, y, name, rtl):
    return (f'<rect x="{x - 52}" y="{y - 30}" width="104" height="60" rx="6" fill="#eef6fe" stroke="{BLUE}" stroke-width="2" />'
            f'<text x="{x}" y="{y - 36}" font-size="11" fill="{LINE}" text-anchor="middle">«system»</text>'
            + text(x, y, name, 13, rtl, 600, BLUE, 14))


def draw(lang, fname, title, left, right, cases):
    rtl = lang == "fa"
    tr = (lambda s: FA[s]) if rtl else (lambda s: s)
    n = len(cases)
    h = max(TOP + n * (CASE_H + GAP) + 40, TOP + 150 * len(left) + 40)
    pad = (h - 40 - TOP - n * (CASE_H + GAP)) / 2
    cx = W / 2
    lx, rx = (W - 110, 110) if rtl else (110, W - 110)  # people side, system side
    ys = {}
    for i, a in enumerate(left):
        ys[a] = TOP + (i + 0.5) * (h - TOP - 40) / len(left)
    for i, a in enumerate(right):
        ys[a] = TOP + (i + 0.5) * (h - TOP - 40) / len(right)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h + 30}" font-family="Vazirmatn, Arial, sans-serif">',
           f'<rect width="{W}" height="{h + 30}" fill="#fff" />',
           f'<rect x="{cx - CASE_W / 2 - 40}" y="40" width="{CASE_W + 80}" height="{h - 30}" rx="10" fill="#fafcfe" stroke="{BLUE}" stroke-width="1.5" />',
           text(cx, 56, tr(title), 14, rtl, 700, BLUE, 60)]
    lines, shapes = [], []
    for i, (uid, name, actors) in enumerate(cases):
        y = TOP + pad + 10 + i * (CASE_H + GAP) + CASE_H / 2
        shapes.append(f'<ellipse cx="{cx}" cy="{y}" rx="{CASE_W / 2}" ry="{CASE_H / 2}" fill="#fff" stroke="{BLUE}" stroke-width="1.8" />')
        label = f"UC-{uid} · {tr(name)}"
        shapes.append(text(cx, y, label, 13, rtl, n=40))
        for a in actors:
            on_people_side = a in left
            ax = lx if on_people_side else rx
            ex = cx - CASE_W / 2 if (ax < cx) else cx + CASE_W / 2
            sx = ax + (24 if ax < cx else -24) if on_people_side else ax + (52 if ax < cx else -52)
            sy = ys[a] - 12 if on_people_side else ys[a]
            lines.append(f'<line x1="{sx}" y1="{sy}" x2="{ex}" y2="{y}" stroke="{LINE}" stroke-width="1.3" />')
    out += lines + shapes
    out += [actor(lx, ys[a], tr(a), rtl) for a in left]
    out += [system_box(rx, ys[a], tr(a), rtl) for a in right]
    out.append("</svg>")
    d = os.path.join(OUT, "fa") if rtl else OUT
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, f"{fname}.svg"), "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")


for lang in ("en", "fa"):
    for area in AREAS:
        draw(lang, *area)
print("written to", os.path.normpath(OUT), "and", os.path.normpath(os.path.join(OUT, "fa")))
