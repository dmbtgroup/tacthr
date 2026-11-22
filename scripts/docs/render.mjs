// Renders docs/bpmn/*.bpmn to SVG and PNG with bpmn-js (the bpmn.io viewer), failing on any import warning.
// Usage: node scripts/docs/render.mjs <path to bpmn-viewer.production.min.js>
//   (get it with: npm i --prefix /some/dir bpmn-js@17; the file is in node_modules/bpmn-js/dist)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "bpmn");
const viewer = readFileSync(process.argv[2], "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3200, height: 1400 }, deviceScaleFactor: 1.5 });
await page.setContent(`<html><body style="margin:0;background:#fff"><div id="c" style="width:3200px;height:1400px"></div></body></html>`);
await page.addScriptTag({ content: viewer });
let failed = false;
for (const f of readdirSync(dir).filter((n) => n.endsWith(".bpmn")).sort()) {
  const xml = readFileSync(join(dir, f), "utf8");
  const res = await page.evaluate(async (xml) => {
    document.getElementById("c").innerHTML = "";
    const v = new BpmnJS({ container: "#c" });
    const { warnings } = await v.importXML(xml);
    v.get("canvas").zoom("fit-viewport");
    const { svg } = await v.saveSVG();
    return { warnings: warnings.map((w) => w.message), svg };
  }, xml);
  if (res.warnings.length) {
    failed = true;
    console.error(f, res.warnings);
  }
  writeFileSync(join(dir, f.replace(".bpmn", ".svg")), res.svg);
  // The picture: the saved SVG alone, on white, cropped to the diagram.
  const shot = await browser.newPage({ deviceScaleFactor: 2 });
  await shot.setContent(`<html><body style="margin:0;background:#fff">${res.svg}</body></html>`);
  await shot.locator("svg").first().screenshot({ path: join(dir, f.replace(".bpmn", ".png")) });
  await shot.close();
  console.log(f, res.warnings.length ? "WARNINGS" : "ok");
}
await browser.close();
process.exit(failed ? 1 : 0);
