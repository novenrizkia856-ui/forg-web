/**
 * Render docs/*.md into public/docs.
 *
 * The docs land in public/ rather than going through the bundle, for the same
 * reason the images do: Vite copies public/ verbatim in both dev and build, so
 * one generator covers `npm run dev` and `npm run build` without a plugin.
 *
 * `marked` is a devDependency and runs here only. Nothing it produces reaches
 * a visitor as JavaScript; the output is plain HTML.
 *
 *   node scripts/build-docs.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "docs");
const out = join(root, "public", "docs");

const SITE_NAME = "FORG";
const TAGLINE = "Corporate Action Infrastructure";

/** README is the docs index; everything else keeps its own name. */
const pageFor = (file) => (file === "README.md" ? "index.html" : file.replace(/\.md$/, ".html"));

const escape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The nav, taken from SUMMARY.md so the docs keep one source of truth for
 * their own order. A chapter that is not listed there is not published.
 */
function readSummary() {
  const summary = readFileSync(join(source, "SUMMARY.md"), "utf8");
  const entries = [];
  const line = /^\s*\*\s*\[([^\]]+)\]\(([^)]+\.md)\)/gm;
  let match;
  while ((match = line.exec(summary))) {
    entries.push({ title: match[1].trim(), file: match[2].trim(), page: pageFor(match[2].trim()) });
  }
  if (!entries.length) throw new Error("SUMMARY.md lists no pages");
  return entries;
}

/** The first `# ` heading, which is what the browser tab should say. */
function headingOf(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

/**
 * Point the cross references at the rendered pages.
 *
 * The markdown links chapters as `04-system-architecture.md`, which is correct
 * on GitHub and broken once rendered, so every in-repo target is rewritten to
 * its .html page.
 */
function rewriteLinks(html) {
  return html.replace(/href="([^"]+\.md)(#[^"]*)?"/g, (whole, target, hash = "") => {
    if (/^[a-z]+:/i.test(target) || target.startsWith("/")) return whole;
    return `href="${pageFor(target)}${hash}"`;
  });
}

/** Tables need their own scroll container, or a wide one pushes the page out. */
const wrapTables = (html) =>
  html.replace(/<table>[\s\S]*?<\/table>/g, (table) => `<div class="docs-table-wrap">${table}</div>`);

function navMarkup(entries, current) {
  const items = entries
    .map((entry) => {
      const here = entry.page === current ? ' aria-current="page"' : "";
      return `<li><a href="${entry.page}"${here}>${escape(entry.title)}</a></li>`;
    })
    .join("");
  return `<nav class="docs-nav" aria-label="Documentation"><p class="docs-nav-title">Documentation</p><ol>${items}</ol></nav>`;
}

function pagerMarkup(entries, index) {
  const previous = entries[index - 1];
  const next = entries[index + 1];
  if (!previous && !next) return "";

  const link = (entry, kind, label) =>
    entry
      ? `<a class="docs-pager-${kind}" href="${entry.page}"><span>${label}</span><strong>${escape(entry.title)}</strong></a>`
      : "";

  return `<div class="docs-pager">${link(previous, "prev", "Previous")}${link(next, "next", "Next")}</div>`;
}

function render(entry, index, entries) {
  const markdown = readFileSync(join(source, entry.file), "utf8");
  const heading = headingOf(markdown, entry.title);
  const body = wrapTables(rewriteLinks(marked.parse(markdown)));
  const title = entry.page === "index.html" ? `${SITE_NAME} Docs` : `${heading} | ${SITE_NAME} Docs`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(`${TAGLINE} for Stock Tokens. ${heading}.`)}">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="docs.css">
</head>
<body>
<header class="docs-top">
  <a class="docs-brand" href="/"><img src="/brand/forg-logo.png" alt="${SITE_NAME}" width="480" height="116"></a>
  <div class="docs-top-right">
    <span class="docs-tag">Docs</span>
    <a class="docs-home" href="/">Back to site</a>
  </div>
</header>
<div class="docs-shell">
${navMarkup(entries, entry.page)}
<main class="docs-main">
${body}
${pagerMarkup(entries, index)}
</main>
</div>
</body>
</html>
`;
}

const entries = readSummary();

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

entries.forEach((entry, index) => {
  writeFileSync(join(out, entry.page), render(entry, index, entries));
});

copyFileSync(join(dirname(fileURLToPath(import.meta.url)), "docs.css"), join(out, "docs.css"));

/* A chapter left out of SUMMARY.md is almost always an oversight rather than a
   decision, so say so instead of dropping it silently. */
const listed = new Set(entries.map((entry) => entry.file));
const orphans = readdirSync(source).filter((file) => file.endsWith(".md") && file !== "SUMMARY.md" && !listed.has(file));
if (orphans.length) console.warn(`docs: not in SUMMARY.md, skipped: ${orphans.join(", ")}`);

console.log(`docs: ${entries.length} pages -> public/docs`);
