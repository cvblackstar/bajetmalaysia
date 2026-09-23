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
  if (!value || isExternal(value)) return;
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

// 2. Ensure calculator CTAs referenced by article metadata exist in article.js.
const articleJsPath = path.join(root, 'article.js');
const articleJs = fs.readFileSync(articleJsPath, 'utf8');
const calculatorBlock = articleJs.match(/const calculatorLinks\s*=\s*\{([\s\S]*?)\n\};/);
const calculatorLinks = new Map();
if (!calculatorBlock) {
  fail('article.js: calculatorLinks mapping not found');
} else {
  const entryRegex = /["']?([\w-]+)["']?\s*:\s*\{\s*href:\s*["']([^"']+)["']/g;
  let match;
  while ((match = entryRegex.exec(calculatorBlock[1]))) calculatorLinks.set(match[1], match[2]);
  for (const article of articles) {
    if (article.status === 'published' && article.calculator && !calculatorLinks.has(article.calculator)) {
      fail(`${article.slug}: calculator "${article.calculator}" is not defined in article.js`);
    }
  }
  for (const [key, href] of calculatorLinks) {
    if (!exists(stripQueryAndHash(href))) fail(`article.js: calculator "${key}" points to missing file -> ${href}`);
  }
}

// 3. Check local HTML/CSS references across the site.
walk(root);

if (failures.length) {
  console.error(`Site validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site validation passed: ${articles.length} article record(s) and local HTML/CSS references checked.`);
