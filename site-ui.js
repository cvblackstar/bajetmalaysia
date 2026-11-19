// UI dikongsi semua halaman: mod gelap (tema kaca sahaja), navigasi bawah di telefon, pautan aktif dan sorotan kad.
// Dimuatkan dalam <head> tanpa defer supaya tema gelap digunakan sebelum halaman dilukis (elak kelipan).
(function () {
  const script = document.currentScript;
  const skin = script.dataset.skin || "glass"; // glass | sticker | home
  const base = new URL(".", script.src).href;
  const root = document.documentElement;
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  root.dataset.skin = skin;
  if (skin !== "sticker") root.dataset.theme = read("bmyTheme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.addEventListener("DOMContentLoaded", () => {
    const here = location.pathname.replace(/\/index\.html$/, "/");
    const section = /\/artikel\/|panduan\.html|article\.html/.test(here) ? "panduan" : /permainan/.test(here) ? "permainan" : here.endsWith("/") ? "utama" : skin === "sticker" ? "kalkulator" : "";

    document.querySelectorAll(".main-nav a").forEach(a => {
      const target = new URL(a.getAttribute("href"), location.href);
      if (target.pathname.replace(/\/index\.html$/, "/") === here && !target.hash) a.setAttribute("aria-current", "page");
    });

    const inner = document.querySelector(".site-header .header-inner");
    if (inner && skin !== "sticker" && !document.querySelector(".theme-btn")) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "theme-btn";
      const paint = () => { const dark = root.dataset.theme === "dark"; btn.textContent = dark ? "☀️" : "🌙"; btn.setAttribute("aria-label", dark ? "Tukar ke mod cerah" : "Tukar ke mod gelap"); };
      btn.addEventListener("click", () => { root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark"; write("bmyTheme", root.dataset.theme); paint(); });
      paint(); inner.append(btn);
    }

    if (!document.querySelector(".bottom-nav")) {
      const items = [["utama", "🏠", "Utama", "index.html"], ["kalkulator", "🧮", "Kalkulator", "index.html#kalkulator"], ["permainan", "🎮", "Main", "permainan.html"], ["panduan", "📚", "Panduan", "panduan.html"], ["apps", "📱", "Apps", "index.html#apps"]];
      const nav = document.createElement("nav");
      nav.className = "bottom-nav"; nav.setAttribute("aria-label", "Navigasi utama");
      nav.innerHTML = items.map(([key, ico, label, href]) => `<a href="${base}${href}"${key === section ? ' class="on" aria-current="page"' : ""}><b aria-hidden="true">${ico}</b>${label}</a>`).join("");
      document.body.append(nav);
    }

    document.addEventListener("pointermove", e => {
      const card = e.target.closest && e.target.closest(".article-card,.glow");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", e.clientX - r.left + "px");
      card.style.setProperty("--y", e.clientY - r.top + "px");
    }, { passive: true });
  });
})();
