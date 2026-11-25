// Builds docs/procedures-specification-en.pdf and -fa.pdf for House Of Management Engineering: each a
// cover, the documents in its language (Persian right to left, in Vazirmatn) and the original
// specification as an appendix. Parts between <!-- status --> and <!-- /status --> stay out of the PDF.
// Usage: node scripts/docs/pdf.mjs <node_modules with marked@12 and vazirmatn@33>
//   (from: npm i --prefix /some/dir marked@12 vazirmatn@33); needs pdfunite (poppler-utils).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const mods = process.argv[2];
const { marked } = require(join(mods, "marked"));
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const docs = join(repo, "docs");
const font = (w) => readFileSync(join(mods, "vazirmatn", "fonts", "webfonts", `Vazirmatn-${w}.woff2`)).toString("base64");
const dataUri = (file, type) => `data:${type};base64,${readFileSync(file).toString("base64")}`;

/** A Markdown file as HTML: pictures embedded, links to other documents kept as plain text. */
function render(file) {
  const base = dirname(file);
  const md = readFileSync(file, "utf8").replace(/<!-- status[\s\S]*?<!-- \/status -->\n?/g, "");
  let html = marked.parse(md);
  // Diagrams go in as their SVG (sharp at any zoom); other pictures as images.
  html = html.replace(/<img src="([^"]+)" alt="([^"]*)">/g, (m, src, alt) => {
    const p = resolve(base, src);
    const svg = p.replace(/\.png$/, ".svg");
    if (existsSync(svg)) return `<div class="diagram" role="img" aria-label="${alt}">${readFileSync(svg, "utf8").replace(/^<\?xml[^>]*>/, "")}</div>`;
    return existsSync(p) ? `<img src="${dataUri(p, "image/png")}" alt="${alt}">` : m;
  });
  html = html.replace(/<a href="(?!https?:)[^"]*">(.*?)<\/a>/g, "$1");
  return `<div class="doc doc-${file.split("/").pop().replace(".md", "").toLowerCase()}">${html}</div>`;
}

const today = new Date();
const enDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(today);
const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long", year: "numeric" }).format(today);
const logo = dataUri(join(docs, "assets", "home-logo.png"), "image/png");

const parts = [
  ["en", ["PERFORMANCE-SPEC.md", "USE-CASES.md", "PROCESSES.md", "DATA-ENTRY.md"].map((f) => join(docs, f))],
  ["fa", ["PERFORMANCE-SPEC.md", "USE-CASES.md", "PROCESSES.md", "DATA-ENTRY.md"].map((f) => join(docs, "fa", f))],
];

const css = `
@font-face{font-family:Vazirmatn;font-weight:400;src:url(data:font/woff2;base64,${font("Regular")}) format("woff2")}
@font-face{font-family:Vazirmatn;font-weight:600;src:url(data:font/woff2;base64,${font("SemiBold")}) format("woff2")}
@font-face{font-family:Vazirmatn;font-weight:700;src:url(data:font/woff2;base64,${font("Bold")}) format("woff2")}
@page{size:A4 landscape;margin:14mm 14mm 16mm}
*{box-sizing:border-box}
body{font-family:Vazirmatn,sans-serif;font-size:9.6pt;line-height:1.55;color:#1f2933;margin:0}
h1{font-size:19pt;color:#0b3d6b;border-bottom:3px solid #1488f2;padding-bottom:4px;margin:0 0 10px;break-before:page}
h2{font-size:13.5pt;color:#0f6cc2;margin:18px 0 6px;break-after:avoid}
h3{font-size:11pt;color:#0b3d6b;margin:12px 0 4px;break-after:avoid}
p{margin:4px 0 6px}
ul,ol{margin:4px 0 8px;padding-inline-start:22px}
li{margin:1px 0}
table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:8.6pt;break-inside:auto}
tr{break-inside:avoid}
th{background:#0f6cc2;color:#fff;font-weight:600;text-align:start;padding:4px 6px}
td{border-bottom:1px solid #d9dee4;padding:3px 6px;vertical-align:top}
tr:nth-child(even) td{background:#f4f9fe}
code{font-family:inherit;background:#f1f3f5;padding:0 3px;border-radius:3px;direction:ltr;unicode-bidi:embed}
img{max-width:100%;max-height:150mm;display:block;margin:6px auto 8px;border:1px solid #e5e7eb}
.diagram{margin:6px 0 10px;direction:ltr}
.diagram svg{width:100%;height:auto;max-height:150mm;display:block}
.doc-processes h2{break-before:page}
.doc-use-cases .diagram{break-inside:avoid}
.doc-use-cases .diagram svg{width:auto;max-width:100%;max-height:150mm;margin:0 auto}
.doc-use-cases h2 ~ h2{break-before:page}
.doc-use-cases h3 + table{break-inside:avoid}
.doc-use-cases h3 + table thead{display:none}
.doc-use-cases h3 + table td:first-child{width:17%;font-weight:600;color:#0b3d6b}
hr{border:0;border-top:1px solid #d9dee4;margin:10px 0}
blockquote{margin:6px 0;padding:4px 10px;border-inline-start:3px solid #1488f2;background:#eef6fe}
[dir=rtl]{text-align:right}
[dir=rtl] ol{list-style:persian}
.cover{height:178mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:10px}
.cover img{border:0;max-height:none;width:110mm;margin:0 0 18px}
.cover .band{width:100%;height:6px;background:linear-gradient(90deg,#1488f2,#0b3d6b);margin-top:22px;border-radius:3px}
.cover .t{font-size:22pt;font-weight:700;color:#0b3d6b}
.cover .s{font-size:12pt;color:#5b6470}
.cover .d{font-size:10pt;color:#5b6470;margin-top:16px}
.toc{break-before:page}
.toc h2{margin-top:0}
.toc table td{font-size:10pt;padding:6px}
.divider{break-before:page;height:178mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:8px}
.divider .t{font-size:24pt;font-weight:700;color:#0b3d6b}
.divider .s{font-size:12pt;color:#0f6cc2}
`;

/** The words of each edition. */
const TEXT = {
  en: {
    dir: "ltr",
    title: "Staff performance evaluation, salary and bonus",
    sub: "Specification, use cases, processes and data entry",
    date: enDate,
    org: "House Of Management Engineering",
    contents: "Contents",
    rows: [
      "1. Performance evaluation module: specification v1.1 (summary and questions to settle)",
      "2. Use cases: actors, diagrams and a card for each use case",
      "3. Processes: six BPMN diagrams with their steps",
      "4. Data entry, page by page",
      "Appendix: the original specification v1.1 (Persian), as received",
    ],
    note: "The BPMN diagrams are also delivered as <code>.bpmn</code> files that open in Camunda Modeler or bpmn.io.",
    appendix: ["Appendix", "The original specification v1.1, as received"],
    footer: "House Of Management Engineering · Staff performance evaluation, salary and bonus",
    file: "procedures-specification-en.pdf",
  },
  fa: {
    dir: "rtl",
    title: "ارزیابی عملکرد، حقوق و پاداش پرسنل",
    sub: "مشخصات، موارد کاربرد، فرایندها و ورود داده",
    date: faDate,
    org: "خانه مهندسی مدیریت",
    contents: "فهرست",
    rows: [
      "۱. ماژول ارزیابی عملکرد: مشخصات نسخه ۱.۱ (خلاصه و پرسش‌ها)",
      "۲. موارد کاربرد: نقش‌ها، نمودارها و کارت هر مورد کاربرد",
      "۳. فرایندها: شش نمودار BPMN با گام‌ها",
      "۴. ورود داده، صفحه به صفحه",
      "پیوست: سند اصلی مشخصات نسخه ۱.۱، بدون تغییر",
    ],
    note: "نمودارهای BPMN به‌صورت فایل <code>.bpmn</code> نیز ارائه شده‌اند که در Camunda Modeler یا bpmn.io باز می‌شوند.",
    appendix: ["پیوست", "سند اصلی مشخصات نسخه ۱.۱، بدون تغییر"],
    footer: "خانه مهندسی مدیریت · ارزیابی عملکرد، حقوق و پاداش پرسنل",
    file: "procedures-specification-fa.pdf",
  },
};

const browser = await chromium.launch();
for (const [lang, files] of parts) {
  const T = TEXT[lang];
  const body = [
    `<section class="cover">
      <img src="${logo}" alt="House Of Management Engineering">
      <div class="t">${T.title}</div>
      <div class="s">${T.sub}</div>
      <div class="d">${T.date}</div>
      <div class="d">${T.org}</div>
      <div class="band"></div>
    </section>`,
    `<section class="toc">
      <h2>${T.contents}</h2>
      <table>${T.rows.map((r) => `<tr><td>${r}</td></tr>`).join("")}</table>
      <p>${T.note}</p>
    </section>`,
    files.map(render).join("\n"),
    `<section class="divider"><div class="t">${T.appendix[0]}</div><div class="s">${T.appendix[1]}</div></section>`,
  ].join("\n");
  const html = `<!doctype html><html lang="${lang}" dir="${T.dir}"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const main = join(docs, `.procedures-${lang}.pdf`);
  await page.pdf({
    path: main,
    format: "A4",
    landscape: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div dir="${T.dir}" style="width:100%;font-size:7pt;color:#8a939e;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>${T.footer}</span></div>`,
    margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" },
  });
  await page.close();
  const out = join(docs, T.file);
  execFileSync("pdfunite", [main, join(docs, "performance-spec-v1.1-fa.pdf"), out]);
  execFileSync("rm", ["-f", main]);
  console.log("written", out);
}
await browser.close();
