// Renders docs/bpmn/*.bpmn (and docs/bpmn/fa/*.bpmn, in Vazirmatn) to SVG and PNG with bpmn-js, the
// bpmn.io viewer, failing on any import warning.
// Usage: node scripts/docs/render.mjs <bpmn-viewer.production.min.js> <Vazirmatn-Regular.woff2>
//   (from: npm i --prefix /some/dir bpmn-js@17 vazirmatn@33)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "bpmn");
const viewer = readFileSync(process.argv[2], "utf8");
const font = readFileSync(process.argv[3]).toString("base64");
const fontFace = `@font-face{font-family:Vazirmatn;src:url(data:font/woff2;base64,${font}) format("woff2");}`;

const browser = await chromium.launch();
let failed = false;
for (const [dir, family] of [[root, "Arial, sans-serif"], [join(root, "fa"), "Vazirmatn"]]) {
  const page = await browser.newPage({ viewport: { width: 3400, height: 1600 } });
  await page.setContent(`<html><head><style>${fontFace}</style></head><body style="margin:0;background:#fff"><div id="c" style="width:3400px;height:1600px"></div><span style="font-family:Vazirmatn">ا</span></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ content: viewer });
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".bpmn")).sort()) {
    const xml = readFileSync(join(dir, f), "utf8");
    const res = await page.evaluate(
      async ({ xml, family }) => {
        document.getElementById("c").innerHTML = "";
        const v = new BpmnJS({ container: "#c", textRenderer: { defaultStyle: { fontFamily: family, fontSize: 12 }, externalStyle: { fontFamily: family, fontSize: 11 } } });
        const { warnings } = await v.importXML(xml);
        v.get("canvas").zoom("fit-viewport");
        const { svg } = await v.saveSVG();
        return { warnings: warnings.map((w) => w.message), svg };
      },
      { xml, family },
    );
    if (res.warnings.length) {
      failed = true;
      console.error(f, res.warnings);
    }
    writeFileSync(join(dir, f.replace(".bpmn", ".svg")), res.svg);
    // The picture: the saved SVG alone, on white, cropped to the diagram.
    const shot = await browser.newPage({ deviceScaleFactor: 2 });
    await shot.setContent(`<html><head><style>${fontFace}</style></head><body style="margin:0;background:#fff">${res.svg}</body></html>`);
    await shot.evaluate(() => document.fonts.ready);
    await shot.locator("svg").first().screenshot({ path: join(dir, f.replace(".bpmn", ".png")) });
    await shot.close();
    console.log(dir.endsWith("fa") ? `fa/${f}` : f, res.warnings.length ? "WARNINGS" : "ok");
  }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
