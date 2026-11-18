// Laman utama: carian global, kalkulator mini gaji bersih, "Baru guna" dan berita terkini.
(function () {
  const $ = id => document.getElementById(id);
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  const fmtDate = d => { const [y, m, day] = String(d).split("-"); return day ? `${+day} ${MONTHS[+m - 1]} ${y}` : d; };

  // Indeks carian: kad kalkulator & permainan (dari HTML), apps, kemudian artikel bila data dimuatkan
  const index = [...document.querySelectorAll(".h-card")].map(a => ({
    href: a.getAttribute("href"), ico: a.querySelector(".h-ico").textContent, title: a.querySelector("h3").textContent,
    text: a.querySelector("p").textContent, kind: a.classList.contains("game") ? "Permainan" : "Kalkulator"
  }));
  document.querySelectorAll(".h-app").forEach(app => index.push({
    href: "#apps", ico: app.querySelector(".h-app-ico").textContent, title: app.querySelector("h3").textContent.replace(/\s+/g, " ").trim(),
    text: app.querySelector("p").textContent, kind: "Apps"
  }));

  const input = $("homeSearch"), out = $("homeResults");
  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { out.hidden = true; return; }
    const words = q.split(/\s+/);
    const hits = index.filter(x => { const hay = (x.title + " " + x.text + " " + x.kind).toLowerCase(); return words.every(w => hay.includes(w)); }).slice(0, 7);
    out.hidden = false;
    out.innerHTML = hits.length
      ? hits.map(x => `<a class="h-hit" href="${esc(x.href)}"><span aria-hidden="true">${x.ico}</span><span><b>${esc(x.title)}</b><small>${x.kind}</small></span></a>`).join("")
      : `<div class="h-hit empty">Tiada padanan untuk “${esc(input.value)}”. Cuba “rumah”, “hutang” atau “KWSP”.</div>`;
  };
  input.addEventListener("input", run);
  input.addEventListener("keydown", e => { if (e.key === "Enter") { const first = out.querySelector("a.h-hit"); if (first) location.href = first.href; } });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== input && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    if (e.key === "Escape" && document.activeElement === input) { input.value = ""; run(); }
  });
  document.addEventListener("click", e => { if (!e.target.closest(".h-search")) out.hidden = true; });
  input.addEventListener("focus", run);

  // Baru guna (disimpan dalam pelayar sahaja)
  const paintRecent = () => {
    const items = read("bmyRecent", []).filter(r => r && r.href && r.title);
    $("homeRecent").hidden = !items.length;
    $("homeRecentList").innerHTML = items.map(r => `<a class="h-chip" href="${esc(r.href)}">${r.ico} ${esc(r.title)}</a>`).join("");
  };
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-recent]"); if (!a) return;
    const item = { href: a.getAttribute("href"), ico: a.querySelector(".h-ico").textContent, title: a.querySelector("h3").textContent };
    write("bmyRecent", [item, ...read("bmyRecent", []).filter(r => r.href !== item.href)].slice(0, 4));
  });
  paintRecent();

  // Kalkulator mini: anggaran ringkas sebelum PCB (KWSP 11%, PERKESO 0.5% & SIP 0.2% atas gaji sehingga RM6,000)
  const gross = $("miniGross");
  const fmt = v => "RM" + v.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let shown = 0, raf;
  const calc = () => {
    const g = Math.max(0, Number(gross.value) || 0), cap = Math.min(g, 6000);
    const kwsp = Math.ceil(g * 0.11), socso = cap * 0.005 + cap * 0.002, net = Math.max(0, g - kwsp - socso);
    $("miniKwsp").textContent = fmt(kwsp); $("miniSocso").textContent = fmt(socso);
    const from = shown, t0 = performance.now(); cancelAnimationFrame(raf);
    const step = t => { const p = Math.min(1, (t - t0) / 450); shown = from + (net - from) * (1 - Math.pow(1 - p, 3)); $("miniNet").textContent = fmt(shown); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  gross.addEventListener("input", calc); calc();

  // Berita & panduan terkini
  fetch("data/articles.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []).then(all => {
    const published = all.filter(a => a.status === "published");
    published.forEach(a => index.push({ href: `artikel/${encodeURIComponent(a.slug)}.html`, ico: a.type === "berita" ? "📰" : a.type === "sudut-pandang" ? "💭" : "📘", title: a.title, text: `${a.description} ${a.category} ${(a.tags || []).join(" ")}`, kind: a.type === "berita" ? "Berita" : a.type === "sudut-pandang" ? "Sudut Pandang" : "Panduan" }));
    const latest = [...published].sort((a, b) => String(b.published).localeCompare(String(a.published))).slice(0, 3);
    if (latest.length) $("homeNews").innerHTML = latest.map(a => `<a class="glow" href="artikel/${encodeURIComponent(a.slug)}.html"><span class="d">${a.type === "berita" ? "Berita" : a.type === "sudut-pandang" ? "Sudut Pandang" : "Panduan"} · ${fmtDate(a.published)}</span><b>${esc(a.title)}</b><span>${esc(a.description)}</span></a>`).join("");
    if (input.value) run();
  }).catch(() => {});

  // Kad muncul bila skrol
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
})();
