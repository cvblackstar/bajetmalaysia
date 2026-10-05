#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function isExternal(value) {
  return /^(?:https?:|mailto:|tel:|javascript:|data:|#)/i.test(value);
}

function stripQueryAndHash(value) {
  return decodeURIComponent(value.split(/[?#]/, 1)[0]);
}

function checkLocalReference(sourceFile, value, kind) {
  if (!value || isExternal(value) || value.includes('${')) return; // skip JS template literals
  const clean = stripQueryAndHash(value);
  if (!clean) return;
  const sourceDir = path.dirname(sourceFile);
  const target = path.normalize(path.join(sourceDir, clean));
  if (target.startsWith('..')) return;
  if (!exists(target)) fail(`${sourceFile}: broken ${kind} -> ${value}`);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(html|css)$/i.test(entry.name)) checkFile(path.relative(root, full));
  }
}

function checkFile(relativeFile) {
  const text = fs.readFileSync(path.join(root, relativeFile), 'utf8');
  const hrefRegex = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(text))) checkLocalReference(relativeFile, match[1], 'reference');

  if (relativeFile.endsWith('.css')) {
    const cssUrlRegex = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    while ((match = cssUrlRegex.exec(text))) checkLocalReference(relativeFile, match[1], 'CSS asset');
  }
}

// 1. Validate every published article path in data/articles.json.
const articleIndexPath = path.join(root, 'data', 'articles.json');
let articles;
try {
  articles = JSON.parse(fs.readFileSync(articleIndexPath, 'utf8'));
} catch (error) {
  fail(`data/articles.json: invalid JSON (${error.message})`);
  articles = [];
}

const slugs = new Set();
for (const article of articles) {
  if (!article.slug) fail('data/articles.json: article is missing slug');
  if (slugs.has(article.slug)) fail(`data/articles.json: duplicate slug -> ${article.slug}`);
  slugs.add(article.slug);
  if (article.status === 'published') {
    if (!article.path) fail(`${article.slug}: published article is missing path`);
    else if (!exists(article.path)) fail(`${article.slug}: article path does not exist -> ${article.path}`);
  }
}

// 2. Ensure calculator CTAs referenced by article metadata exist in scripts/build-articles.js,
// and that the generated artikel/<slug>.html pages match what the build script would write now.
const { calculatorLinks, buildArticlePages, buildPanduanPage, OUT_DIR } = require('./build-articles.js');
for (const article of articles) {
  if (article.status === 'published' && article.calculator && !calculatorLinks[article.calculator]) {
    fail(`${article.slug}: calculator "${article.calculator}" is not defined in scripts/build-articles.js`);
  }
}
for (const [key, link] of Object.entries(calculatorLinks)) {
  if (!exists(stripQueryAndHash(link.href))) fail(`scripts/build-articles.js: calculator "${key}" points to missing file -> ${link.href}`);
}
const articleNote = 'run node scripts/build-articles.js';
let expectedPages = [];
try {
  expectedPages = buildArticlePages();
  const panduan = buildPanduanPage();
  if (fs.readFileSync(path.join(root, panduan.file), 'utf8') !== panduan.html) fail(`${panduan.file}: static article list out of date (${articleNote})`);
} catch (error) {
  fail(`scripts/build-articles.js: ${error.message}`);
}
for (const page of expectedPages) {
  if (!exists(page.file)) fail(`${page.file}: missing (${articleNote})`);
  else if (fs.readFileSync(path.join(root, page.file), 'utf8') !== page.html) fail(`${page.file}: out of date (${articleNote})`);
}
if (exists(OUT_DIR)) {
  const expected = new Set(expectedPages.map(page => page.file));
  for (const name of fs.readdirSync(path.join(root, OUT_DIR))) {
    if (name.endsWith('.html') && !expected.has(`${OUT_DIR}/${name}`)) fail(`${OUT_DIR}/${name}: no published article with this slug (${articleNote})`);
  }
}

// 3. Ensure every public page and published article is listed in sitemap.xml.
const sitemap = exists('sitemap.xml') ? fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8') : '';
const sitemapNote = 'run node scripts/build-sitemap.js';
for (const page of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
  if (page === '404.html' || page === 'article.html') continue;
  const loc = page === 'index.html' ? 'https://bajetmy.my/' : `https://bajetmy.my/${page}`;
  if (!sitemap.includes(`<loc>${loc}</loc>`)) fail(`sitemap.xml: missing ${page} (${sitemapNote})`);
}
for (const article of articles) {
  if (article.status === 'published' && !sitemap.includes(`<loc>https://bajetmy.my/${OUT_DIR}/${article.slug}.html</loc>`)) {
    fail(`sitemap.xml: missing article ${article.slug} (${sitemapNote})`);
  }
}

// 4. Ensure every root page carries the GA4 tag and policy footer in source. GitHub Pages also publishes
// straight from the branch, so tags added only at deploy time can be overwritten.
const analyticsScript = fs.readFileSync(path.join(root, 'scripts', 'inject-analytics.py'), 'utf8');
const measurementId = (analyticsScript.match(/MEASUREMENT_ID\s*=\s*"([^"]+)"/) || [])[1];
for (const page of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
  const text = fs.readFileSync(path.join(root, page), 'utf8');
  if (measurementId && !text.includes(measurementId)) fail(`${page}: missing GA4 tag (run python3 scripts/inject-analytics.py)`);
  if (/<\/footer>/i.test(text) && !text.includes('footer-policies')) fail(`${page}: missing policy footer links (run python3 scripts/inject-analytics.py)`);
}

// 5. Check local HTML/CSS references across the site.
walk(root);

if (failures.length) {
  console.error(`Site validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site validation passed: ${articles.length} article record(s) and local HTML/CSS references checked.`);
