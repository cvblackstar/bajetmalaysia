// Ciri bacaan untuk halaman artikel: isi kandungan, bar kemajuan, masa baca, kongsi, saiz teks, zum gambar dan reaksi.
// Berfungsi pada artikel/<slug>.html (kandungan statik) dan article.html (kandungan dimuat oleh article.js).
(function () {
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const toast = msg => { const t = el("div", "toast"); t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 1800); };

  function enhance(article) {
    const content = article.querySelector(".article-content");
    if (!content || article.dataset.enhanced) return;
    article.dataset.enhanced = "1";
    const slug = (location.pathname.match(/artikel\/([^/]+)\.html$/) || [])[1] || new URLSearchParams(location.search).get("slug") || "artikel";
    const pageUrl = (document.querySelector('link[rel="canonical"]') || {}).href || location.href;
    const title = (article.querySelector("h1") || document.querySelector("h1") || {}).textContent || document.title;

    // Susun atur dua lajur: artikel + isi kandungan
    const layout = el("div", "art-layout");
    article.before(layout);
    layout.append(article);
    const heads = [...content.querySelectorAll("h2")];
    heads.forEach((h, i) => { if (!h.id) h.id = "bahagian-" + (i + 1); });
    const links = heads.map(h => `<a href="#${h.id}">${h.textContent}</a>`).join("");
    if (heads.length >= 2) {
      const toc = el("aside", "art-toc", `<b>📑 Dalam artikel ini</b><nav>${links}</nav><div class="art-fs">Saiz teks <button type="button" data-fs="-1" aria-label="Kecilkan teks">A−</button><button type="button" data-fs="1" aria-label="Besarkan teks">A+</button></div>`);
      layout.append(toc);
      const mtoc = el("details", "art-mtoc", `<summary>📑 Dalam artikel ini</summary><nav>${links}</nav>`);
      content.before(mtoc);
      mtoc.addEventListener("click", e => { if (e.target.closest("a")) mtoc.open = false; });
    }

    // Masa baca + butang kongsi dalam baris meta
    const meta = article.querySelector(".article-meta");
    if (meta) {
      const words = content.innerText.trim().split(/\s+/).length;
      meta.append(el("span", null, `⏱️ ${Math.max(1, Math.round(words / 200))} min baca`));
      const share = el("span", "art-share", `<a href="https://wa.me/?text=${encodeURIComponent(title + " " + pageUrl)}" target="_blank" rel="noopener">WhatsApp</a><button type="button">🔗 Salin pautan</button>`);
      share.querySelector("button").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(pageUrl); toast("Pautan disalin ✓"); } catch { toast(pageUrl); }
      });
      meta.append(share);
    }

    // Jadual boleh skrol di telefon; gambar boleh dizum
    content.querySelectorAll("table").forEach(t => { if (!t.parentElement.classList.contains("table-wrap")) { const w = el("div", "table-wrap"); t.before(w); w.append(t); } });
    content.querySelectorAll(".article-figure img").forEach(img => img.addEventListener("click", () => {
      const lb = el("div", "art-lightbox"); const big = el("img"); big.src = img.src; big.alt = img.alt;
      lb.append(big); lb.addEventListener("click", () => lb.remove()); document.body.append(lb);
    }));

    // Saiz teks (disimpan dalam pelayar)
    let fs = read("bmyFs", 0);
    const applyFs = () => fs ? document.documentElement.style.setProperty("--fs", fs + "px") : document.documentElement.style.removeProperty("--fs");
    applyFs();
    layout.addEventListener("click", e => {
      const b = e.target.closest("[data-fs]"); if (!b) return;
      const now = fs || parseFloat(getComputedStyle(content).fontSize);
      fs = Math.max(15, Math.min(22, now + Number(b.dataset.fs))); write("bmyFs", fs); applyFs();
    });

    // Reaksi (disimpan dalam pelayar sahaja)
    const react = el("div", "art-react", `<b>Artikel ni membantu?</b><div><button type="button" data-r="ya">👍 Membantu</button><button type="button" data-r="baru">💡 Baru tahu</button><button type="button" data-r="kurang">🤔 Kurang jelas</button></div><small>Maklum balas korang bantu kami tulis lebih baik.</small>`);
    content.after(react);
    const key = "bmyReact-" + slug, paint = v => react.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.r === v));
    paint(read(key, null));
    react.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      write(key, b.dataset.r); paint(b.dataset.r); react.querySelector("small").textContent = "Terima kasih! 🙏";
      if (typeof window.gtag === "function") window.gtag("event", "article_reaction", { reaction: b.dataset.r, article: slug });
    });

    // Bar kemajuan, bahagian aktif dan butang ke atas
    const bar = el("div", "art-progress"); document.body.append(bar);
    const top = el("button", "totop", "↑"); top.type = "button"; top.setAttribute("aria-label", "Kembali ke atas");
    top.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" })); document.body.append(top);
    const tocLinks = [...document.querySelectorAll(".art-toc nav a")];
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, scrollY / max * 100) : 0) + "%";
      top.classList.toggle("show", scrollY > 900);
      let cur = heads[0];
      for (const h of heads) if (h.getBoundingClientRect().top < 140) cur = h;
      if (cur) tocLinks.forEach(a => a.classList.toggle("on", a.hash === "#" + cur.id));
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const article = document.getElementById("article");
    if (!article) return;
    enhance(article);
    if (!article.dataset.enhanced) new MutationObserver((_, obs) => { if (article.querySelector(".article-content")) { obs.disconnect(); enhance(article); } }).observe(article, { childList: true, subtree: true });
  });
})();
