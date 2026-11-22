// Builds docs/tactHR-documentation.pdf: a cover, the English documents, the Persian documents (right to
// left, in Vazirmatn) and the client's original specification as an appendix.
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
  let html = marked.parse(readFileSync(file, "utf8"));
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
const logo = dataUri(join(repo, "public", "tacthr-logo.png"), "image/png");

const parts = [
  ["en", ["PERFORMANCE-SPEC.md", "PROCESSES.md", "DATA-ENTRY.md"].map((f) => join(docs, f))],
  ["fa", ["PERFORMANCE-SPEC.md", "PROCESSES.md", "DATA-ENTRY.md"].map((f) => join(docs, "fa", f))],
];

const css = `
@font-face{font-family:Vazirmatn;font-weight:400;src:url(data:font/woff2;base64,${font("Regular")}) format("woff2")}
@font-face{font-family:Vazirmatn;font-weight:600;src:url(data:font/woff2;base64,${font("SemiBold")}) format("woff2")}
@font-face{font-family:Vazirmatn;font-weight:700;src:url(data:font/woff2;base64,${font("Bold")}) format("woff2")}
@page{size:A4 landscape;margin:14mm 14mm 16mm}
*{box-sizing:border-box}
body{font-family:Vazirmatn,sans-serif;font-size:9.6pt;line-height:1.55;color:#1f2933;margin:0}
h1{font-size:19pt;color:#474747;border-bottom:3px solid #f5821f;padding-bottom:4px;margin:0 0 10px;break-before:page}
h2{font-size:13.5pt;color:#c05c12;margin:18px 0 6px;break-after:avoid}
h3{font-size:11pt;color:#474747;margin:12px 0 4px;break-after:avoid}
p{margin:4px 0 6px}
ul,ol{margin:4px 0 8px;padding-inline-start:22px}
li{margin:1px 0}
table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:8.6pt;break-inside:auto}
tr{break-inside:avoid}
th{background:#474747;color:#fff;font-weight:600;text-align:start;padding:4px 6px}
td{border-bottom:1px solid #d9dee4;padding:3px 6px;vertical-align:top}
tr:nth-child(even) td{background:#fafafa}
code{font-family:inherit;background:#f1f3f5;padding:0 3px;border-radius:3px;direction:ltr;unicode-bidi:embed}
img{max-width:100%;max-height:150mm;display:block;margin:6px auto 8px;border:1px solid #e5e7eb}
.diagram{margin:6px 0 10px;direction:ltr}
.diagram svg{width:100%;height:auto;max-height:150mm;display:block}
.doc-processes h2{break-before:page}
hr{border:0;border-top:1px solid #d9dee4;margin:10px 0}
blockquote{margin:6px 0;padding:4px 10px;border-inline-start:3px solid #f5821f;background:#fff7ef}
[dir=rtl]{text-align:right}
[dir=rtl] ol{list-style:persian}
.cover{height:178mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:10px}
.cover img{border:0;max-height:none;width:120mm;margin:0 0 14px}
.cover .t{font-size:22pt;font-weight:700;color:#474747}
.cover .s{font-size:12pt;color:#5b6470}
.cover .d{font-size:10pt;color:#5b6470;margin-top:16px}
.toc{break-before:page}
.toc h2{margin-top:0}
.toc table td{font-size:10pt;padding:6px}
.divider{break-before:page;height:178mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:8px}
.divider .t{font-size:24pt;font-weight:700;color:#474747}
.divider .s{font-size:12pt;color:#c05c12}
`;

const body = [
  `<section class="cover">
    <img src="${logo}" alt="tactHR">
    <div class="t">Specification, processes and data entry</div>
    <div class="t" dir="rtl">مشخصات، فرایندها و ورود داده</div>
    <div class="s">Staff performance evaluation, salary and bonus · ارزیابی عملکرد، حقوق و پاداش پرسنل</div>
    <div class="d">${enDate} · <span dir="rtl">${faDate}</span></div>
    <div class="d">tacthr.dmbtgroup.com · DMBT</div>
  </section>`,
  `<section class="toc">
    <h2>Contents · فهرست</h2>
    <table>
      <tr><th>English</th><th dir="rtl" style="text-align:right">فارسی</th></tr>
      <tr><td>1. Performance evaluation module: specification v1.1 (summary, differences from the app, open questions)</td><td dir="rtl">۱. ماژول ارزیابی عملکرد: مشخصات نسخه ۱.۱ (خلاصه، تفاوت‌ها با نرم‌افزار، پرسش‌ها)</td></tr>
      <tr><td>2. tactHR processes: six BPMN diagrams with their steps</td><td dir="rtl">۲. فرایندهای tactHR: شش نمودار BPMN با گام‌ها</td></tr>
      <tr><td>3. Data entry, page by page</td><td dir="rtl">۳. ورود داده، صفحه به صفحه</td></tr>
      <tr><td>Appendix: the original specification v1.1 (Persian), as received</td><td dir="rtl">پیوست: سند اصلی مشخصات نسخه ۱.۱ (فارسی)، بدون تغییر</td></tr>
    </table>
    <p>The English part comes first, then the Persian part. The BPMN diagrams are also delivered as <code>.bpmn</code> files that open in Camunda Modeler or bpmn.io.</p>
    <p dir="rtl">ابتدا بخش انگلیسی و سپس بخش فارسی آمده است. نمودارهای BPMN به‌صورت فایل <code>.bpmn</code> نیز ارائه شده‌اند که در Camunda Modeler یا bpmn.io باز می‌شوند.</p>
  </section>`,
  `<section class="divider"><div class="t">English</div><div class="s">Specification · Processes · Data entry</div></section>`,
  `<div lang="en" dir="ltr">${parts[0][1].map(render).join("\n")}</div>`,
  `<section class="divider" dir="rtl"><div class="t">فارسی</div><div class="s">مشخصات · فرایندها · ورود داده</div></section>`,
  `<div lang="fa" dir="rtl">${parts[1][1].map(render).join("\n")}</div>`,
  `<section class="divider"><div class="t">Appendix · پیوست</div><div class="s">The original specification v1.1, as received · سند اصلی مشخصات نسخه ۱.۱</div></section>`,
].join("\n");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const main = join(docs, ".tactHR-main.pdf");
await page.pdf({
  path: main,
  format: "A4",
  landscape: true,
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-size:7pt;color:#8a939e;padding:0 14mm;display:flex;justify-content:space-between"><span>tactHR · Specification, processes and data entry</span><span><span class="pageNumber"></span></span></div>`,
  margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" },
});
await browser.close();
const out = join(docs, "tactHR-documentation.pdf");
execFileSync("pdfunite", [main, join(docs, "performance-spec-v1.1-fa.pdf"), out]);
execFileSync("rm", ["-f", main]);
console.log("written", out);
