#!/usr/bin/env node
// Jana halaman statik artikel/<slug>.html untuk setiap artikel yang diterbitkan dalam data/articles.json,
// menggunakan article.html sebagai templat. Halaman statik membolehkan Google, Facebook dan WhatsApp
// membaca tajuk, penerangan dan kandungan setiap artikel tanpa menjalankan JavaScript.
// Jalankan selepas tambah atau ubah artikel: node scripts/build-articles.js

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SITE = 'https://bajetmy.my/';
const OUT_DIR = 'artikel';

const calculatorLinks = {
  dsr: { href: 'dsr.html', label: 'Kira DSR Anda' },
  'emergency-fund': { href: 'emergency.html', label: 'Kira Dana Kecemasan Anda' },
  'monthly-budget': { href: 'budget.html', label: 'Kira Bajet Bulanan Anda' },
  kwsp: { href: 'kwsp.html', label: 'Kira Simpanan KWSP Anda' },
  pelaburan: { href: 'pelaburan.html', label: 'Kira Pertumbuhan Pelaburan Anda' },
  'kumpulan-pendapatan': { href: 'kumpulan-pendapatan.html', label: 'Semak Kumpulan Pendapatan Anda' },
  fuel: { href: 'fuel.html', label: 'Kira Kos Minyak Anda' },
  'kos-beli-rumah': { href: 'kos-beli-rumah.html', label: 'Kira Kos Beli Rumah Anda' },
  'jual-rumah': { href: 'jual-rumah.html', label: 'Kira Untung Jual Rumah Anda' },
  'pendapatan-youtube': { href: 'pendapatan-youtube.html', label: 'Anggarkan Pendapatan YouTube' },
  'bayar-hutang': { href: 'bayar-hutang.html', label: 'Kira Pelan Bayar Hutang Anda' },
  'gaji-bersih': { href: 'gaji-bersih.html', label: 'Kira Gaji Bersih Anda' }
};
const typeLabels = { berita: 'Berita', 'sudut-pandang': 'Sudut Pandang' };

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(value) {
  return esc(value)
    .replace(/!video\[([^\]]*)\]\(([^)\s]+)\)/g, '<figure class="article-figure"><video controls playsinline preload="metadata" src="$2"></video><figcaption>$1</figcaption></figure>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<figure class="article-figure"><img src="$2" alt="$1" loading="lazy"><figcaption>$1</figcaption></figure>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/), out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('# ')) { out.push(`<h1>${inline(line.slice(2))}</h1>`); i++; continue; }
    if (line.startsWith('## ')) { out.push(`<h2>${inline(line.slice(3))}</h2>`); i++; continue; }
    if (line.startsWith('### ')) { out.push(`<h3>${inline(line.slice(4))}</h3>`); i++; continue; }
    if (line.startsWith('> ')) { out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); i++; continue; }
    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(lines[i + 1])) {
      const headers = line.split('|').slice(1, -1).map(x => `<th>${inline(x.trim())}</th>`).join('');
      const rows = []; i += 2;
      while (i < lines.length && /^\|.*\|$/.test(lines[i])) { rows.push(`<tr>${lines[i].split('|').slice(1, -1).map(x => `<td>${inline(x.trim())}</td>`).join('')}</tr>`); i++; }
      out.push(`<table><thead><tr>${headers}</tr></thead><tbody>${rows.join('')}</tbody></table>`); continue;
    }
    if (/^[-*] /.test(line)) { const items = []; while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(`<li>${inline(lines[i].slice(2))}</li>`); i++; } out.push(`<ul>${items.join('')}</ul>`); continue; }
    if (/^\d+\. /.test(line)) { const items = []; while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\d+\. /, ''))}</li>`); i++; } out.push(`<ol>${items.join('')}</ol>`); continue; }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('# ') && !lines[i].startsWith('## ') && !lines[i].startsWith('### ') && !lines[i].startsWith('> ') && !/^[-*] /.test(lines[i]) && !/^\d+\. /.test(lines[i]) && !/^\|.*\|$/.test(lines[i])) { paragraph.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return out.join('');
}

function articleUrl(slug) {
  return `${SITE}${OUT_DIR}/${slug}.html`;
}

function replaceOnce(text, pattern, replacement, what) {
  if (!pattern.test(text)) throw new Error(`article.html: template marker not found (${what})`);
  return text.replace(pattern, replacement);
}

// Halaman dijana berada satu folder ke bawah, jadi pautan relatif perlu ../ di hadapan.
function relocate(html) {
  return html.replace(/\b(href|src)="(?!https?:|mailto:|tel:|data:|#|\/|\.\.\/)([^"]*)"/g, '$1="../$2"');
}

// Google memotong tajuk melebihi ~65 aksara, jadi akhiran jenama digugurkan untuk tajuk panjang.
function pageTitle(title) {
  const branded = `${title} | Bajet MY`;
  return branded.length <= 65 ? branded : title;
}

// Pilih sehingga 3 artikel lain: kategori sama dahulu, kemudian paling banyak tag dikongsi, kemudian terbaru.
function relatedArticles(meta, published) {
  const tags = new Set(meta.tags || []);
  return published
    .filter(other => other.slug !== meta.slug)
    .map(other => ({
      other,
      score: (other.category === meta.category ? 10 : 0) + (other.tags || []).filter(tag => tags.has(tag)).length
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || String(b.other.published).localeCompare(String(a.other.published)))
    .slice(0, 3)
    .map(item => item.other);
}

function renderPage(template, meta, markdown, published = []) {
  const url = articleUrl(meta.slug);
  const title = pageTitle(meta.title);
  const body = markdown.replace(/^---[\s\S]*?---\s*/, '').trim()
    .replace(/^#\s+.*(\r?\n)+/, ''); // buang H1 di awal: templat sudah papar meta.title sebagai <h1>
  const image = (body.match(/!\[[^\]]*\]\(([^)\s]+)\)/) || [])[1];
  const imageUrl = image ? new URL(image, SITE).href : `${SITE}assets/og-image.png`;
  const calc = calculatorLinks[meta.calculator];
  const typeLabel = typeLabels[meta.type];
  const eyebrow = typeLabel ? `${typeLabel} · ${meta.category}` : meta.category;
  const related = relatedArticles(meta, published);
  const relatedHtml = related.length ? `<nav class="article-related" aria-label="Artikel berkaitan"><h2>Artikel berkaitan</h2><ul>${related.map(other => `<li><a href="${OUT_DIR}/${encodeURIComponent(other.slug)}.html">${esc(other.title)}</a></li>`).join('')}</ul></nav>` : '';
  const opinionNote = meta.type === 'sudut-pandang' ? '<blockquote>Sudut Pandang ialah tulisan renungan untuk membuka perbincangan, bukan nasihat kewangan peribadi. Keadaan setiap orang berbeza.</blockquote>' : '';
  const article = `<div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(meta.title)}</h1><div class="article-meta">Diterbitkan ${esc(meta.published)} · Dikemas kini ${esc(meta.updated)}</div><div class="article-content">${renderMarkdown(body)}${opinionNote}</div>${calc ? `<div class="article-cta"><strong>🧮 Kira berdasarkan angka anda sendiri</strong><p>Gunakan kalkulator Bajet MY yang berkaitan dengan panduan ini.</p><a href="${calc.href}">${calc.label} →</a></div>` : ''}${relatedHtml}`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': meta.type === 'berita' ? 'NewsArticle' : meta.type === 'sudut-pandang' ? 'OpinionNewsArticle' : 'Article',
    headline: meta.title,
    description: meta.description,
    image: imageUrl,
    datePublished: meta.published,
    dateModified: meta.updated,
    articleSection: meta.category,
    inLanguage: 'ms-MY',
    mainEntityOfPage: url,
    publisher: { '@type': 'Organization', name: 'Bajet MY', url: SITE }
  }).replace(/</g, '\\u003c');
  const head = [
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta property="article:published_time" content="${esc(meta.published)}">`,
    `<meta property="article:modified_time" content="${esc(meta.updated)}">`
  ].join('\n');

  let html = template;
  html = replaceOnce(html, /<title id="pageTitle">[^<]*<\/title>/, `<title>${esc(title)}</title>`, 'title');
  html = replaceOnce(html, /<meta id="pageDescription" name="description" content="[^"]*">/, `<meta name="description" content="${esc(meta.description)}">`, 'description');
  html = replaceOnce(html, /<!-- Template for scripts\/build-articles\.js[\s\S]*?-->/, head, 'template comment');
  html = replaceOnce(html, /<meta id="ogTitle" property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`, 'og:title');
  html = replaceOnce(html, /<meta id="ogDescription" property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(meta.description)}">`, 'og:description');
  html = replaceOnce(html, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${imageUrl}">`, 'og:image');
  html = replaceOnce(html, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${imageUrl}">`, 'twitter:image');
  html = replaceOnce(html, /<\/head>/, `<script type="application/ld+json">${jsonLd}</script>\n</head>`, '</head>');
  html = replaceOnce(html, /<script src="article\.js[^"]*"[^>]*><\/script>\n?/, '', 'article.js script');
  html = relocate(html);
  // Kandungan disisip selepas relocate() supaya pautan dalam artikel juga diselaraskan tepat sekali.
  html = replaceOnce(html, /<div id="article">[\s\S]*?<\/div>/, `<article id="article">${relocate(article)}</article>`, 'article root');
  return html;
}

function buildArticlePages() {
  const template = fs.readFileSync(path.join(root, 'article.html'), 'utf8');
  const published = publishedArticles();
  return published.map(meta => ({
    file: `${OUT_DIR}/${meta.slug}.html`,
    html: renderPage(template, meta, fs.readFileSync(path.join(root, meta.path), 'utf8'), published)
  }));
}

function publishedArticles() {
  const articles = JSON.parse(fs.readFileSync(path.join(root, 'data', 'articles.json'), 'utf8'));
  return articles.filter(article => article.status === 'published');
}

// panduan.html memuatkan senarai artikel dengan JavaScript. Kad yang sama ditulis terus ke dalam HTML
// supaya enjin carian nampak pautan ke setiap artikel tanpa menjalankan skrip; skrip menggantikannya bila dimuatkan.
const PANDUAN = 'panduan.html';
const panduanGroups = [
  { type: 'berita', group: 'groupNews', list: 'listNews', read: 'Baca berita', byDate: true },
  { type: 'sudut-pandang', group: 'groupOpinion', list: 'listOpinion', read: 'Baca &amp; fikirkan', byDate: true, cls: 'opinion' },
  { type: 'panduan', group: 'groupGuides', list: 'listGuides', read: 'Baca panduan', byDate: false }
];
function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return isNaN(d) ? iso : d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function buildPanduanPage() {
  let html = fs.readFileSync(path.join(root, PANDUAN), 'utf8');
  const published = publishedArticles();
  const typeOf = a => (a.type === 'berita' || a.type === 'sudut-pandang' ? a.type : 'panduan');
  for (const g of panduanGroups) {
    let items = published.filter(a => typeOf(a) === g.type);
    if (g.byDate) items = [...items].sort((x, y) => String(y.published).localeCompare(String(x.published)));
    const cards = items.map(a => {
      const date = g.byDate ? `<span class="date">${esc(formatDate(a.published))}</span>` : '';
      return `<a class="article-card${g.cls ? ' ' + g.cls : ''}" href="${OUT_DIR}/${encodeURIComponent(a.slug)}.html"><div class="meta-row">${date}<span class="category">${esc(a.category)}</span></div><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p><span class="read">${g.read} →</span></a>`;
    }).join('');
    const pattern = new RegExp(`<section class="content-group" id="${g.group}"( hidden)?>([\\s\\S]*?)<div class="article-list" id="${g.list}">[\\s\\S]*?</div></section>`);
    if (!pattern.test(html)) throw new Error(`${PANDUAN}: list marker not found (${g.list})`);
    html = html.replace(pattern, (_, __, head) => `<section class="content-group" id="${g.group}"${items.length ? '' : ' hidden'}>${head}<div class="article-list" id="${g.list}">${cards}</div></section>`);
  }
  return { file: PANDUAN, html };
}

module.exports = { calculatorLinks, buildArticlePages, buildPanduanPage, OUT_DIR };

if (require.main === module) {
  const pages = buildArticlePages();
  const outDir = path.join(root, OUT_DIR);
  fs.mkdirSync(outDir, { recursive: true });
  const keep = new Set(pages.map(page => path.basename(page.file)));
  for (const name of fs.readdirSync(outDir)) {
    if (name.endsWith('.html') && !keep.has(name)) {
      fs.unlinkSync(path.join(outDir, name));
      console.log(`removed ${OUT_DIR}/${name}`);
    }
  }
  for (const page of pages) fs.writeFileSync(path.join(root, page.file), page.html);
  console.log(`${OUT_DIR}/: ${pages.length} article page(s) written.`);
  const panduan = buildPanduanPage();
  fs.writeFileSync(path.join(root, panduan.file), panduan.html);
  console.log(`${panduan.file}: static article list written.`);
}
