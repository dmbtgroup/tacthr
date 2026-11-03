// Lists English UI text that has no Persian (src/lib/i18n/fa.ts) translation.
// Usage: node scripts/i18n-check.mjs   (exits 1 when something is missing)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(f) && !/i18n\/fa\.ts$/.test(p) && !/\.test\.ts$/.test(p)) files.push(p);
  }
})("src");

const str = String.raw`"((?:[^"\\]|\\.)*)"`;
const patterns = [
  new RegExp(String.raw`\bt\(\s*${str}`, "g"), // t("…")
  new RegExp(String.raw`\bt\.n\([^,]+,\s*${str},\s*${str}`, "g"), // t.n(n, "…", "…")
  new RegExp(String.raw`\bmsg\(\s*${str}`, "g"),
  new RegExp(String.raw`\bmsgN\([^,]+,\s*${str},\s*${str}`, "g"),
  new RegExp(String.raw`\b(?:fail|done)\(\s*${str}`, "g"),
  new RegExp(String.raw`\b(?:fail|done)\([\w.]+(?:\([\w.]*\))?,\s*${str}`, "g"), // fail(path, "…")
  new RegExp(String.raw`\b(?:error|notice): ${str}`, "g"),
  new RegExp(String.raw`\?(?:[\w=&]*&)?(?:error|notice)=([^"&\`$]+)"`, "g"), // redirect("/x?error=…")
  new RegExp(String.raw`\b(?:label|hint|message|title|text|key): ${str}`, "g"), // { label: "…" }
  new RegExp(String.raw`\bgo\([^,]+,\s*"(?:error|notice)",\s*${str}`, "g"), // go(page, "error", "…")
  new RegExp(String.raw`^\s+[A-Z_]+: ${str},?$`, "gm"), // NAMES = { VERY_HIGH: "Very high" }
  new RegExp(String.raw`\b(?:LAST_ADMIN_ERROR|ARCHIVE_HINT) = ${str}`, "g"),
  new RegExp(String.raw`\.(?:min|regex)\([^"]*${str}\)`, "g"), // zod messages
  new RegExp(String.raw`\? ("[A-Z](?:[^"\\]|\\.)*") : ("[A-Z](?:[^"\\]|\\.)*")`, "g"), // cond ? "A" : "B" messages
  new RegExp(String.raw`\?\? ("[A-Z](?:[^"\\]|\\.)*")`, "g"),
];
const keys = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const re of patterns)
    for (const m of src.matchAll(re))
      for (let g of m.slice(1)) {
        if (!g || !/[A-Za-z]{2,}/.test(g)) continue;
        if (g.startsWith('"')) g = g.slice(1, -1); // the ternary patterns capture the quotes
        if (g.split(" ").every((w) => /^[a-z0-9:\-[\]/.]+$/.test(w) && w.includes("-"))) continue; // CSS classes, not text
        if (/^\//.test(g) || /^[A-Z_]+$/.test(g)) continue; // a path or an enum value
        keys.add(JSON.parse(`"${g}"`));
      }
}
let failed = false;
for (const [file, language] of [["src/lib/i18n/fa.ts", "Persian"]]) {
  const dict = readFileSync(file, "utf8");
  const have = new Set([...dict.matchAll(new RegExp(String.raw`^\s*${str}:`, "gm"))].map((m) => JSON.parse(`"${m[1]}"`)));
  const missing = [...keys].filter((k) => !have.has(k)).sort();
  const unused = [...have].filter((k) => !keys.has(k)).sort();
  for (const k of missing) console.log(JSON.stringify(k));
  if (unused.length) console.error(`\n${unused.length} ${language} entries no longer used:\n` + unused.map((k) => "  " + JSON.stringify(k)).join("\n"));
  console.error(`\n${keys.size} texts, ${missing.length} missing ${language}`);
  if (missing.length) failed = true;
}
process.exit(failed ? 1 : 0);
