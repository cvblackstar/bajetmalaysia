#!/usr/bin/env node
// Jana sitemap.xml daripada halaman HTML di akar repo dan artikel yang diterbitkan dalam data/articles.json.
// Jalankan selepas tambah halaman atau artikel baru: node scripts/build-sitemap.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const SITE = 'https://bajetmy.my/';
const EXCLUDE = new Set(['404.html', 'article.html']);
const FIRST = ['index.html'];

function lastCommitDate(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const pages = fs.readdirSync(root)
  .filter(name => name.endsWith('.html') && !EXCLUDE.has(name))
  .sort((a, b) => (FIRST.includes(b) - FIRST.includes(a)) || a.localeCompare(b));

const articles = JSON.parse(fs.readFileSync(path.join(root, 'data', 'articles.json'), 'utf8'))
  .filter(article => article.status === 'published');

const urls = [
  ...pages.map(page => ({ loc: page === 'index.html' ? SITE : SITE + page, lastmod: lastCommitDate(page) })),
  ...articles.map(article => ({ loc: `${SITE}artikel/${article.slug}.html`, lastmod: article.updated || article.published }))
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${loc.replace(/&/g, '&amp;')}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    '  </url>'
  ].join('\n')),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${pages.length} page(s), ${articles.length} article(s).`);
