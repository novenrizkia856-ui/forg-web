/**
 * Copy audit.
 *
 * Two things must stay true of this page:
 *   1. no dashes in visible copy, house style
 *   2. nothing left over from the reference site it was built from
 *
 * Only real text nodes are checked. Styles, scripts and data URIs are
 * stripped first, so CSS property names never trip the dash rule.
 */
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const main = await readFile(new URL("../main.js", import.meta.url), "utf8");

const body = html
  .replace(/data:[a-zA-Z0-9/;+._-]*base64,[A-Za-z0-9+/=]+/g, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<script[\s\S]*?<\/script>/gi, "");

const visibleText = [...body.matchAll(/>([^<>]+)</g)]
  .map((match) => match[1].trim())
  .filter(Boolean)
  .join(" ");

const runtimeLabels = [...main.matchAll(/textContent\s*=\s*["'`]([^"'`]+)["'`]/g)]
  .map((match) => match[1])
  .join(" ");

const copy = `${visibleText} ${runtimeLabels}`;
const failures = [];

const DASHES = { "-": "hyphen", "–": "en dash", "—": "em dash" };
for (const [character, name] of Object.entries(DASHES)) {
  const index = copy.indexOf(character);
  if (index !== -1) {
    failures.push(`${name} in visible copy: ...${copy.slice(Math.max(0, index - 50), index + 50)}...`);
  }
}

/* the page was adapted from a reference template, so guard against leftovers */
const LEFTOVERS = ["compound", "capital for", "backers", "milestone", "onchain home", "launch a project"];
for (const term of LEFTOVERS) {
  const index = html.toLowerCase().indexOf(term);
  if (index !== -1) {
    failures.push(`reference wording "${term}" still present at offset ${index}`);
  }
}

if (failures.length) {
  console.error(`Copy audit failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Visible copy audit passed");
