// Pautan lama article.html?slug=<slug> dialihkan ke halaman statik artikel/<slug>.html
// (dijana oleh scripts/build-articles.js). Slug yang tiada atau tidak diterbitkan dipaparkan sebagai ralat.
const root = document.getElementById('article');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug') || new URL(window.location.href).hash.replace(/^#/, '') || '';

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function redirectToArticle() {
  try {
    if (!slug) throw new Error('Pautan artikel tidak lengkap.');
    const indexResponse = await fetch(new URL('data/articles.json', document.baseURI).href, { cache: 'no-store' });
    if (!indexResponse.ok) throw new Error('Senarai artikel tidak dapat dimuatkan.');
    const index = await indexResponse.json();
    const meta = index.find(article => article.slug === slug && article.status === 'published');
    if (!meta) throw new Error(`Artikel "${slug}" tidak ditemui.`);
    window.location.replace(new URL(`artikel/${encodeURIComponent(meta.slug)}.html`, document.baseURI).href);
  } catch (error) {
    const noindex = document.createElement('meta');
    noindex.name = 'robots';
    noindex.content = 'noindex';
    document.head.append(noindex);
    root.innerHTML = `<div class="article-error"><h1>Artikel tidak dapat dimuatkan</h1><p>${esc(error.message)}</p><p><a href="panduan.html">Kembali ke Panduan</a></p></div>`;
  }
}

redirectToArticle();
