const root = document.getElementById('article');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug') || new URL(window.location.href).hash.replace(/^#/, '') || '';
const calculatorLinks = {
  dsr: { href: 'dsr.html', label: 'Kira DSR Anda' },
  'emergency-fund': { href: 'emergency.html', label: 'Kira Dana Kecemasan Anda' },
  'monthly-budget': { href: 'budget.html', label: 'Kira Bajet Bulanan Anda' },
  kwsp: { href: 'kwsp.html', label: 'Kira Simpanan KWSP Anda' }
};

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(value) {
  return esc(value)
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

async function loadArticle() {
  try {
    if (!slug) throw new Error('Pautan artikel tidak lengkap.');
    const indexResponse = await fetch(new URL('data/articles.json', document.baseURI).href, { cache: 'no-store' });
    if (!indexResponse.ok) throw new Error('Senarai artikel tidak dapat dimuatkan.');
    const index = await indexResponse.json();
    const meta = index.find(article => article.slug === slug && article.status === 'published');
    if (!meta) throw new Error(`Artikel "${slug}" tidak ditemui.`);
    const articleResponse = await fetch(new URL(meta.path, document.baseURI).href, { cache: 'no-store' });
    if (!articleResponse.ok) throw new Error('Kandungan artikel tidak dapat dimuatkan.');
    const raw = await articleResponse.text();
    const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
    const calc = calculatorLinks[meta.calculator];
    root.innerHTML = `<div class="eyebrow">${esc(meta.category)}</div><h1>${esc(meta.title)}</h1><div class="article-meta">Diterbitkan ${esc(meta.published)} · Dikemas kini ${esc(meta.updated)}</div><div class="article-content">${renderMarkdown(body)}</div>${calc ? `<div class="article-cta"><strong>🧮 Kira berdasarkan angka anda sendiri</strong><p>Gunakan kalkulator Bajet Malaysia yang berkaitan dengan panduan ini.</p><a href="${calc.href}">${calc.label} →</a></div>` : ''}`;
  } catch (error) {
    root.innerHTML = `<div class="article-error"><h1>Artikel tidak dapat dimuatkan</h1><p>${esc(error.message)}</p><p><a href="panduan.html">Kembali ke Panduan</a></p></div>`;
  }
}

loadArticle();
