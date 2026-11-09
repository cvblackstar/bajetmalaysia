// Rendering: turns the state into DOM. Reads state, never changes game rules.
// All text goes through t() so the English switch works (see i18n.js).
window.KR = window.KR || {};

KR.ui = (function () {
  var C = KR.config, S = KR.sim, A = KR.art, t = KR.i18n.t;
  var $ = function (id) { return document.getElementById(id); };

  function rm(n) {
    var neg = n < 0;
    return (neg ? '-RM' : 'RM') + Math.abs(n).toFixed(2);
  }
  function rm0(n) { return (n < 0 ? '-RM' : 'RM') + Math.abs(Math.round(n)).toLocaleString('en-MY'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function dayName(d) { return t(S.dayName(d)); }

  function header(s) {
    $('dayLabel').textContent = t('Bulan {m} · Minggu {w} · Hari {d} · {name}', { m: S.monthOf(s.day), w: S.weekInMonth(s.day), d: s.day, name: dayName(s.day) });
    $('shopName').innerHTML = esc(s.shopName) + (S.level(s, 'ssm') ? ' <span class="ssm-badge" title="' + t('Berdaftar dengan SSM') + '">SSM</span>' : '');
    $('cash').textContent = rm(s.cash);
    $('cash').classList.toggle('neg', s.cash < 0);
    var rating = S.rating(s), bonus = S.adBonus(s);
    $('rep').innerHTML = rating + (bonus ? ' <small class="ad-plus">' + t('+{n} iklan', { n: bonus }) + '</small>' : '');
    $('repBar').style.width = Math.min(100, rating) + '%';
    $('repBar').classList.toggle('boost', !!bonus);
    var used = S.totalUnits(s.stock) + S.totalUnits(s.order);
    $('cap').textContent = used + '/' + S.capacity(s);
    goal(s);
  }

  function starsHtml(n) {
    var out = '';
    for (var i = 0; i < C.starTargets.length; i++) out += A.star(i < n);
    return out;
  }

  function goal(s) {
    var value = S.shopValue(s), stars = S.starsFor(value), target = S.nextTarget(value);
    var inSeason = !s.seasonDone && s.day <= C.seasonDays;
    var prev = stars ? C.starTargets[stars - 1] : 0;
    var pct = target ? Math.max(0, Math.min(100, (value - prev) / (target - prev) * 100)) : 100;
    $('goal').innerHTML =
      '<strong>' + (inSeason ? t('Musim: Hari {d}/{n}', { d: s.day, n: C.seasonDays }) : t('Mod bebas')) + '</strong>' +
      '<span>' + t('Nilai kedai {v}', { v: rm0(value) }) + (target ? t(' · bintang seterusnya {v}', { v: rm0(target) }) : t(' · semua bintang!')) + '</span>' +
      '<span class="stars">' + starsHtml(stars) + '</span>' +
      '<div class="gbar"><i style="width:' + pct + '%"></i></div>';
  }

  function forecast(s) {
    var f = s.forecast, w = C.weathers[f.weather], mail = !!S.level(s, 'petisurat');
    var on = mail ? S.activeEvents(s) : [];       // without the mailbox, events stay a surprise
    var rent = S.rentToday(s), mult = S.rentMult(s.day), R = C.rentRamp;
    var until = Math.ceil(s.day / R.every) * R.every;
    $('forecast').innerHTML =
      '<div class="wicon">' + A.weather(f.weather) + '</div><div>' +
      '<h3>' + t('Ramalan: {w}', { w: t(w.name) }) + '</h3>' +
      '<p>' + t('Kos harian {c}: sewa {r}, bil {b}. Ramalan cuaca tak selalu tepat.',
        { c: rm(S.dailyCosts(s)), r: rm(rent), b: rm(S.round2(S.dailyCosts(s) - rent)) }) + '</p>' +
      '<p class="week-note">' + (S.weekOf(s.day) ? t('Harga borong berubah setiap minggu, dan semua barang naik {i}% seminggu (inflasi).', { i: Math.round(C.inflation * 100) })
        : t('Harga borong berubah setiap minggu. Semak harga sebelum beli stok.')) + '</p>' +
      (mult < 1 ? '<p class="rent-note">' + t('Sewa diskaun: bayar {p}% sampai hari {d}.', { p: Math.round(mult * 100), d: until }) + '</p>' : '') +
      (on.length ? '<p class="mail-line">' + on.map(function (e) { return '<span class="event-tag' + (e.to > e.from ? ' week' : '') + '">' + esc(t(C.events[e.id].name)) + '</span>'; }).join(' ') +
        ' <button class="link" data-goto="syarikat">' + t('Baca di Peti Surat') + '</button></p>' : '') +
      (S.tcgOn(s) ? (S.tcgRelease(s) ? '<span class="event-tag tcg">' + t('Set TCG baru keluar hari ini!') + '</span> <p>' + t('Peminat kad akan datang beratur. Pastikan stok pek booster cukup.') + '</p>'
        : '<p class="rent-note">' + t('Set TCG baru seterusnya dalam {n} hari.', { n: C.tcg.every - S.tcgDays(s) }) + '</p>') : '') +
      '</div>';
  }

  // Products are grouped by the shop lot that sells them; lots not rented yet show what they'd add.
  var LOT_NEED = ['', 'Sewa lot 2 (Besarkan Kedai) untuk jual barang ini.', 'Sewa lot 3 (Besarkan Kedai tahap 2) untuk jual barang ini.'];
  function products(s) {
    var open = S.lotsOpen(s);
    $('products').innerHTML = C.lots.map(function (lot, i) {
      var list = C.products.filter(function (p) { return S.lotOf(p) === i + 1; });
      list = list.filter(function (p) { return S.isUnlocked(s, p); }).concat(list.filter(function (p) { return !S.isUnlocked(s, p); }));   // locked ones last
      var on = list.filter(function (p) { return S.isUnlocked(s, p); }).length;
      return '<h3 class="lot-title lot-' + (i + 1) + (i + 1 > open ? ' locked' : '') + '"><span class="lot-chip">' + (i + 1) + '</span><span>' + t(lot.name) +
        (i + 1 > open ? ' <small>' + t(LOT_NEED[i]) + '</small>' : '') + '</span><em>' + (i + 1 > open ? t('Belum dibuka') : t('{a}/{b} dijual', { a: on, b: list.length })) + '</em></h3>' +
        list.map(productRow.bind(null, s)).join('');
    }).join('');
    $('orderCost').textContent = rm(S.orderCost(s));
    var ordered = S.totalUnits(s.order);
    $('orderUnits').textContent = ordered ? t('{n} unit dipesan', { n: ordered }) : '';
    var last = s.lastOrder ? S.totalUnits(s.lastOrder) : 0;
    $('repeatBtn').classList.toggle('hidden', !last);
    $('repeatBtn').textContent = t('Ulang order semalam ({n} unit)', { n: last });
  }
  function productRow(s, p) {
      if (!S.isUnlocked(s, p)) {
        var need = S.lotOf(p) > S.lotsOpen(s) ? t('Perlu lot {n}', { n: S.lotOf(p) }) : t('Perlu {u}', { u: t(S.upgrade(p.requires).name) });
        return '<div class="product locked"><div class="picon">' + A.product(p.id) + '</div>' +
          '<div><div class="pname">' + t(p.name) + '</div><div class="pmeta"><span class="lock">🔒</span> ' + need + '</div></div><div></div></div>';
      }
      var cost = S.buyCost(s, p), price = s.prices[p.id], unit = S.round2(price - cost), mk = S.marketMult(s, p.id);
      var chip = Math.abs(mk - 1) > 0.001 ? ' <span class="mkt ' + (mk > 1 ? 'up' : 'down') + (Math.abs(mk - 1) >= C.market.big[0] - 0.001 ? ' big' : '') + '">' +
        (mk > 1 ? '▲' : '▼') + Math.round(Math.abs(mk - 1) * 100) + '% ' + t('minggu ini') + '</span>' : '';
      var order = s.order[p.id] || 0, left = S.daysLeft(s, p.id), dem = s.lastDemand && s.lastDemand[p.id];
      return '<div class="product" data-id="' + p.id + '">' +
        '<div class="picon">' + A.product(p.id) + '</div>' +
        '<div><div class="pname">' + t(p.name) + '</div>' +
        '<div class="pmeta">' + t('Borong {c} · Harga biasa {r}', { c: rm(cost), r: rm(S.refPrice(s, p)) }) + chip + (p.perish >= 0.2 ? t(' · cepat rosak') : '') +
          (p.expiry ? t(' · tahan {n} hari', { n: p.expiry }) + (left != null ? t(' (stok lama luput dalam {n} hari)', { n: left }) : '') : '') + '</div>' +
          (dem ? '<div class="demand">' + t('Semalam') + ': <b>' + t('laku {n}', { n: dem.sold }) + '</b>' +
            (dem.out ? ' · <b class="out">' + t('habis {n}', { n: dem.out }) + '</b>' : '') +
            (dem.pricey ? ' · <b class="pricey">' + t('kata mahal {n}', { n: dem.pricey }) + '</b>' : '') + '</div>' : '') + '</div>' +
        '<div class="margin ' + (unit > 0 ? 'good' : 'bad') + '">' + (unit >= 0 ? '+' : '') + rm(unit) + t('/unit') + '</div>' +
        '<div class="controls">' +
          '<div class="group"><label>' + t('Stok') + '</label>' +
            '<button class="step" data-act="order" data-n="-10"' + (order <= 0 ? ' disabled' : '') + '>−10</button>' +
            '<span class="val">' + s.stock[p.id] + (order ? ' + ' + order : '') + '</span>' +
            '<button class="step" data-act="order" data-n="10"' + (S.canOrder(s, p.id, 1) ? '' : ' disabled') + '>+10</button>' +
          '</div>' +
          '<div class="group"><label>' + t('Harga') + '</label>' +
            '<button class="step" data-act="price" data-n="-0.1">−</button>' +
            '<span class="val">' + rm(price) + '</span>' +
            '<button class="step" data-act="price" data-n="0.1">+</button>' +
          '</div>' +
        '</div></div>';
  }

  // Advertisement: pay once for a week of extra rating (the only way above 100).
  function ads(s) {
    var on = S.adOn(s);
    $('adPanel').innerHTML = '<div class="ad-head"><div class="uicon">' + A.upgrade('iklan') + '</div><div><h4>' + t('Iklan Kedai') + '</h4>' +
      '<p>' + t('Bayar sekali, reputasi naik selama seminggu. Hanya iklan boleh bawa reputasi melebihi 100 (sampai {m}).', { m: C.repMax }) + '</p></div></div>' +
      (on ? '<p class="ad-on">' + t('{a} sedang berjalan: +{b} reputasi, tamat hari {d} (tinggal {n} hari).',
          { a: t(C.ads[on.tier].name), b: C.ads[on.tier].bonus, d: on.until, n: on.until - s.day + 1 }) + '</p>'
        : '<div class="ad-btns">' + C.ads.map(function (a, i) {
          return '<button class="btn' + (s.cash >= a.price ? ' primary' : '') + '" data-ad="' + i + '"' + (s.cash < a.price ? ' disabled' : '') + '><strong>' + t(a.name) + '</strong>' +
            '<small>' + t('+{b} reputasi, {n} hari', { b: a.bonus, n: a.days }) + ' · ' + rm0(a.price) + '</small></button>';
        }).join('') + '</div>');
  }

  function upgrades(s) {
    ads(s);
    // Not bought yet first (ones you can buy now before ones that need a lot), owned ones last.
    function rank(u) { return !S.nextLevel(s, u.id) ? 2 : S.upgradeOpen(s, u) ? 0 : 1; }
    var list = C.upgrades.filter(function (u) { return S.upgradeVisible(s, u); });
    list = list.map(function (u, i) { return [u, i]; }).sort(function (a, b) { return rank(a[0]) - rank(b[0]) || a[1] - b[1]; }).map(function (x) { return x[0]; });
    $('upgrades').innerHTML = list.map(function (u) {
      var lvl = S.level(s, u.id), next = S.nextLevel(s, u.id), info = next || u.levels[u.levels.length - 1];
      var steps = u.levels.length > 1 ? ' <small>' + t(' (Tahap {l}/{n})', { l: lvl, n: u.levels.length }) + '</small>' : '';
      var buyable = next && S.upgradeOpen(s, u) && s.cash >= next.price;
      return '<div class="upgrade' + (next ? '' : ' owned') + (S.upgradeOpen(s, u) ? '' : ' locked') + (buyable ? ' buyable' : '') + (u.hidden ? ' secret' : '') + '">' +
        '<div class="uicon">' + A.upgrade(u.id) + '</div><h4>' + t(u.name) + steps + '</h4><p>' + t(info.desc) +
        (info.upkeep ? t(' Kos {c}/hari.', { c: 'RM' + info.upkeep }) : '') +
        (info.rent ? t(' Sewa {c}/hari.', { c: 'RM' + info.rent }) : '') + '</p>' +
        (!next ? '<strong class="pos">' + t('Sudah ada') + '</strong>'
              : !S.upgradeOpen(s, u) ? '<strong class="muted">' + t('Perlu lot {n}', { n: S.lotOf(u) }) + '</strong>'
              : '<button class="btn primary" data-up="' + u.id + '"' + (s.cash < next.price ? ' disabled' : '') + '>' +
                t(lvl ? 'Naik tahap {p}' : 'Beli {p}', { p: rm0(next.price) }) + '</button>' +
                (s.cash < next.price ? '<span class="short">' + t('Perlu {v} lagi', { v: rm0(next.price - s.cash) }) + '</span>' : '')) +
        '</div>';
    }).join('');
    // How many upgrades the player can afford right now, as a badge on the tab
    var canBuy = list.filter(function (u) { var n = S.nextLevel(s, u.id); return n && S.upgradeOpen(s, u) && s.cash >= n.price; }).length;
    var tab = document.querySelector('.tab[data-tab="upgrade"]');
    if (tab) { if (canBuy) tab.setAttribute('data-badge', canBuy); else tab.removeAttribute('data-badge'); }
  }

  function records(s) {
    var h = s.history, max = Math.max.apply(null, h.map(Math.abs).concat([1]));
    $('records').innerHTML =
      '<table><tr><td>' + t('Hari dibuka') + '</td><td>' + (s.day - 1) + '</td></tr>' +
      '<tr><td>' + t('Untung keseluruhan') + '</td><td>' + rm(s.stats.totalProfit) + '</td></tr>' +
      '<tr><td>' + t('Hari paling untung') + '</td><td>' + rm(s.stats.bestDay) + '</td></tr>' +
      '<tr><td>' + t('Pelanggan dilayan') + '</td><td>' + s.stats.customers + '</td></tr>' +
      (s.stats.tips ? '<tr><td>' + t('Jumlah tip') + '</td><td>' + rm(s.stats.tips) + '</td></tr>' : '') + '</table>' +
      (h.length ? '<p class="hint">' + t('Untung 14 hari terakhir') + '</p><div class="spark">' + h.map(function (v) {
        return '<i class="' + (v < 0 ? 'loss' : '') + '" style="height:' + Math.max(4, Math.abs(v) / max * 100) + '%" title="' + rm(v) + '"></i>';
      }).join('') + '</div>' : '');
    var best = KR.state.loadBest();
    if (best.value) $('records').innerHTML += '<p class="hint">' + t('Rekod musim terbaik: {v}', { v: rm0(best.value) }) + ' ' + starsHtml(best.stars) + '</p>';
    $('milestones').innerHTML = C.milestones.map(function (m) {
      return '<div class="milestone' + (s.milestones[m.id] ? ' done' : '') + '"><strong>' + t(m.name) + '</strong>' +
        '<span>' + t(m.desc) + t(' Ganjaran {v}.', { v: rm0(m.reward) }) + '</span></div>';
    }).join('');
    $('nameHint').textContent = S.level(s, 'ssm') ? t('Tukar nama syarikat di tab Syarikat.') : t('Daftar SSM (Naik Taraf) untuk tukar nama syarikat.');
  }

  // ---------- Syarikat tab (after SSM): Peti Surat, leaderboard and company name ----------
  var mailView = 'aktif';
  function setMailView(v) { mailView = v; }
  function daysText(s, e) {
    if (e.from === e.to) return e.to < s.day ? t('Hari {d}', { d: e.from }) : t('Hari ini sahaja');
    if (e.to < s.day) return t('Hari {a} hingga {b}', { a: e.from, b: e.to });
    var left = e.to - s.day + 1;
    return t('Hari {a} hingga {b} · tinggal {n} hari', { a: e.from, b: e.to, n: left });
  }
  function letter(s, e, past) {
    var ev = C.events[e.id];
    return '<div class="letter' + (past ? ' past' : '') + (e.to > e.from ? ' week' : '') + (!past && !e.seen ? ' new' : '') + '">' +
      '<div class="lhead"><span class="from">' + t('Daripada: {f}', { f: t(ev.from || 'Pemberitahuan') }) + '</span><span class="when">' + daysText(s, e) + '</span></div>' +
      '<strong>' + esc(t(ev.name)) + (!past && !e.seen ? ' <em class="new-tag">' + t('Baru') + '</em>' : '') + '</strong>' +
      '<p>' + esc(t(ev.desc)) + '</p></div>';
  }
  function mailbox(s) {
    if (!S.level(s, 'petisurat')) {
      $('mailbox').innerHTML = '<div class="card mail-locked"><div class="uicon">' + A.upgrade('petisurat') + '</div><div><h3 class="sub-title">' + t('Peti Surat Syarikat') + '</h3>' +
        '<p class="hint">' + t('Belum ada peti surat. Beli Peti Surat Syarikat di Naik Taraf untuk tahu acara apa sedang berlaku.') + '</p></div></div>';
      return;
    }
    var act = S.activeEvents(s), past = S.pastEvents(s);
    var list = mailView === 'aktif' ? act : past;
    $('mailbox').innerHTML = '<div class="card mail"><h3 class="sub-title">' + t('Peti Surat Syarikat') + '</h3>' +
      '<div class="subtabs"><button class="subtab' + (mailView === 'aktif' ? ' active' : '') + '" data-mail="aktif">' + t('Sedang berlaku ({n})', { n: act.length }) + '</button>' +
      '<button class="subtab' + (mailView === 'tamat' ? ' active' : '') + '" data-mail="tamat">' + t('Sudah tamat ({n})', { n: past.length }) + '</button></div>' +
      (list.length ? list.map(function (e) { return letter(s, e, mailView !== 'aktif'); }).join('')
        : '<p class="hint">' + t(mailView === 'aktif' ? 'Tiada acara hari ini. Hari biasa di taman.' : 'Belum ada acara yang tamat.') + '</p>') +
      '</div>';
  }
  function board(s) {
    var rows = KR.state.loadBoard().map(function (b) { return { name: b.name, value: b.value, stars: b.stars, note: t('Musim tamat') }; });
    var inSeason = !s.seasonDone && s.day <= C.seasonDays, value = S.shopValue(s);
    if (inSeason) rows.push({ name: s.shopName, value: value, stars: S.starsFor(value), note: t('Musim ini, hari {d}', { d: s.day }), now: true });
    rows.sort(function (a, b) { return b.value - a.value; });
    $('board').innerHTML = '<h3 class="sub-title">' + t('Papan Prestasi Syarikat') + '</h3>' +
      '<p class="hint">' + t('Markah = nilai kedai pada hari ke-{n}. Buat masa ini papan ini tunjuk musim yang dimainkan di peranti ini. Nanti ia akan tunjuk markah {n} hari semua pemain.', { n: C.seasonDays }) + '</p>' +
      (rows.length ? '<table class="board">' + rows.map(function (r, i) {
        return '<tr class="' + (r.now ? 'now' : '') + '"><td class="rank">' + (i + 1) + '</td><td><strong>' + esc(r.name) + '</strong><small>' + r.note + '</small></td>' +
          '<td class="stars">' + starsHtml(r.stars) + '</td><td class="val">' + rm0(r.value) + '</td></tr>';
      }).join('') + '</table>' : '<p class="hint">' + t('Habiskan musim {n} hari untuk masuk papan.', { n: C.seasonDays }) + '</p>');
  }
  function company(s) {
    var reg = !!S.level(s, 'ssm'), tab = document.querySelector('.tab[data-tab="syarikat"]');
    if (tab) {
      tab.classList.toggle('hidden', !reg);
      var n = S.unreadMail(s);
      if (n) tab.setAttribute('data-badge', n); else tab.removeAttribute('data-badge');
    }
    if (!reg) return;
    mailbox(s); board(s);
    if (document.activeElement !== $('nameInput')) $('nameInput').value = s.shopName;
  }

  // Customer statistics: how many served, split by common / rare / unique.
  var TIER_NAMES = { common: 'Biasa', rare: 'Jarang', unique: 'Unik' };
  function tierBars(tiers, served) {
    return ['common', 'rare', 'unique'].map(function (k) {
      var n = tiers[k] || 0, pct = served ? n / served * 100 : 0;
      return '<div class="tier-row tier-' + k + '"><span class="tname">' + t(TIER_NAMES[k]) + '</span>' +
        '<span class="tbar"><i style="width:' + Math.max(n ? 2 : 0, pct) + '%"></i></span>' +
        '<span class="tnum">' + n + ' <small>(' + (pct < 1 && n ? pct.toFixed(1) : Math.round(pct)) + '%)</small></span></div>';
    }).join('');
  }
  function hearts(n) {
    var out = '';
    for (var i = 0; i < C.regularRules.maxHearts; i++) out += '<i class="' + (i < n ? 'on' : '') + '">♥</i>';
    return '<span class="hearts">' + out + '</span>';
  }
  function regularsHtml(s) {
    S.regulars(s);
    return '<div class="card"><h3 class="sub-title">' + t('Pelanggan tetap') + '</h3>' + C.regulars.map(function (r) {
      var st = s.regulars[r.id], p = S.product(r.item);
      var status = !st ? t('Muncul bila reputasi {r}+', { r: r.rep })
        : st.away ? t('Merajuk, datang balik dalam {n} hari', { n: st.away })
        : t('Suka {p}, datang hampir setiap hari', { p: t(p.name) });
      return '<div class="regular' + (st ? (st.away ? ' away' : '') : ' locked') + '"><i class="ic">' + A.product(r.item) + '</i>' +
        '<div><strong>' + esc(r.name) + '</strong><span>' + status + '</span></div>' + (st ? hearts(st.hearts) : '') + '</div>';
    }).join('') + '<p class="hint">' + t('Kalau barang kegemaran mereka habis atau terlalu mahal, mereka kecewa. Hati habis, mereka merajuk seminggu.') + '</p></div>';
  }
  function customers(s) {
    var st = s.stats, last = st.lastDay, T = C.tiers;
    $('custStats').innerHTML = !st.customers ? '<p class="hint">' + t('Belum ada pelanggan lagi. Buka kedai dulu!') + '</p>' + regularsHtml(s) :
      '<div class="card"><h3 class="sub-title">' + t('Semua pelanggan') + '</h3>' +
      '<div class="big-num">' + st.customers + ' <small>' + t('Pelanggan dilayan') + '</small></div>' +
      tierBars(st.tiers || {}, st.customers) +
      '<table class="cust-table"><tr><td>' + t('Beli berganda') + '</td><td>' + (st.multiBuys || 0) + '</td></tr>' +
      '<tr><td>' + t('Balik sebab beratur lama') + '</td><td>' + (st.turnedAway || 0) + '</td></tr></table></div>' +
      (last ? '<div class="card"><h3 class="sub-title">' + t('Semalam') + '</h3>' +
        '<div class="big-num">' + last.served + ' <small>' + t('Pelanggan dilayan') + '</small></div>' +
        tierBars(last.tiers, last.served) +
        '<table class="cust-table"><tr><td>' + t('Beli berganda') + '</td><td>' + last.multiBuys + '</td></tr>' +
        '<tr><td>' + t('Balik sebab beratur lama') + '</td><td>' + last.queueLost + '</td></tr></table></div>' : '') +
      regularsHtml(s) +
      '<p class="hint">' + t('Pelanggan jarang (doktor) datang bila reputasi {r}+ dan selalunya beli 2 kali ganda. Pelanggan unik (kimono) datang bila reputasi {u}+ dan selalunya beli 3 kali ganda.',
        { r: T.rare.rep, u: T.unique.rep }) + '</p>';
  }

  // Bank tab: savings that earn a daily return, and the relationship upgrades.
  var BANK_LEVELS = ['Pelanggan biasa', 'Pelanggan setia', 'Pelanggan premium'];
  function bankTab(s) {
    var B = S.bank(s), rate = S.bankRate(s), next = S.bankNextPrice(s), free = S.bankFree(s);
    function btns(kind, max) {
      return [50, 100, 500].map(function (n) {
        return '<button class="btn small" data-bank="' + kind + '" data-n="' + n + '"' + (max >= n ? '' : ' disabled') + '>' + rm0(n) + '</button>';
      }).join('') + '<button class="btn small" data-bank="' + kind + '" data-n="all"' + (max > 0 ? '' : ' disabled') + '>' + t('Semua') + '</button>';
    }
    $('bankPanel').innerHTML =
      '<div class="card bank-card"><div class="uicon">' + A.upgrade('bank') + '</div><div>' +
        '<h3 class="sub-title">' + t('Simpanan bank') + '</h3>' +
        '<div class="big-num">' + rm(B.balance) + '</div>' +
        '<p class="hint">' + t('Pulangan {p}% sehari atas baki dalam bank, dibayar setiap malam. Jumlah dapat setakat ini: {e}.', { p: +(rate * 100).toFixed(2), e: rm(B.earned || 0) }) + '</p>' +
        (B.balance ? '<p class="hint">' + t('Malam ini dijangka dapat {v}.', { v: rm(S.round2(B.balance * rate)) }) + '</p>' : '') +
      '</div></div>' +
      '<div class="card"><h4>' + t('Simpan') + ' <small>' + t('(duit boleh simpan: {v})', { v: rm(free) }) + '</small></h4><div class="bank-btns">' + btns('in', free) + '</div>' +
      '<h4>' + t('Keluarkan') + '</h4><div class="bank-btns">' + btns('out', B.balance) + '</div>' +
      '<p class="hint">' + t('Duit untuk stok yang dah dipesan hari ini tak boleh disimpan. Duit dalam bank dikira dalam nilai kedai.') + '</p></div>' +
      '<div class="card"><h4>' + t('Hubungan dengan bank') + '</h4>' +
        C.bank.rates.map(function (r, i) {
          return '<div class="bank-level' + (i === B.level ? ' on' : i < B.level ? ' done' : '') + '"><strong>' + t(BANK_LEVELS[i]) + '</strong><span>' +
            t('{p}% sehari', { p: +(r * 100).toFixed(2) }) + (i ? ' · ' + rm0(C.bank.upgrades[i - 1]) : '') + '</span></div>';
        }).join('') +
        (next != null ? '<button class="btn primary" id="bankUpBtn"' + (s.cash < next ? ' disabled' : '') + '>' + t('Naik taraf hubungan {p}', { p: rm0(next) }) + '</button>'
          : '<strong class="pos">' + t('Hubungan tertinggi') + '</strong>') +
      '</div>';
  }

  function plan(s) { header(s); forecast(s); products(s); upgrades(s); bankTab(s); customers(s); records(s); company(s); }

  function tips(r) {
    var out = [];
    if (r.weather !== r.forecast) out.push(t('Cuaca sebenar {w}, bukan seperti ramalan.', { w: t(C.weathers[r.weather].name).toLowerCase() }));
    var worstPricey = null, worstOut = null;
    C.products.forEach(function (p) {
      var st = r.perProduct[p.id];
      if (st.pricey >= 3 && (!worstPricey || st.pricey > worstPricey.n)) worstPricey = { p: p, n: st.pricey };
      if (st.out >= 3 && (!worstOut || st.out > worstOut.n)) worstOut = { p: p, n: st.out };
    });
    if (worstPricey) out.push(t('{n} orang kata {p} mahal. Cuba turunkan sikit harga.', { n: worstPricey.n, p: t(worstPricey.p.name) }));
    if (worstOut) out.push(t('{n} orang cari {p} tapi dah habis. Tambah stok esok.', { n: worstOut.n, p: t(worstOut.p.name) }));
    if (r.queueLost) out.push(t('{n} orang balik sebab lama beratur. Pembantu kedai boleh tolong.', { n: r.queueLost }));
    var spoiledText = Object.keys(r.spoiled).map(function (id) { return r.spoiled[id] + ' ' + t(S.product(id).name); });
    if (spoiledText.length) out.push(t('Rosak semalaman: {list} ({v}).', { list: spoiledText.join(', '), v: rm(r.spoiledValue) }));
    (r.regulars || []).forEach(function (v) {
      var reg = S.regular(v.id), p = t(S.product(reg.item).name);
      if (v.gone) out.push(t('{n} merajuk sebab tak dapat {p}. Dia takkan datang seminggu.', { n: reg.name, p: p }));
      else if (!v.ok) out.push(t(v.why === 'out' ? '{n} kecewa, {p} habis.' : '{n} kecewa, {p} mahal sangat.', { n: reg.name, p: p }));
    });
    if (!out.length) out.push(t('Hari yang lancar. Pelanggan puas hati.'));
    return out;
  }

  function row(label, value, cls) {
    return '<div class="report-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  function report(r) {
    var repDiff = r.repAfter - r.repBefore, tiers = r.tiers || {};
    var sold = C.products.filter(function (p) { return r.perProduct[p.id].sold; }).map(function (p) {
      var st = r.perProduct[p.id];
      return row('<i class="ic">' + A.product(p.id) + '</i>' + t(p.name) + ' × ' + st.sold, rm(st.revenue));
    }).join('');
    $('reportBox').innerHTML =
      '<h2>' + t('Laporan Hari {d} ({name})', { d: r.day, name: dayName(r.day) }) + '</h2>' +
      '<p class="hint"><i class="ic">' + A.weather(r.weather) + '</i>' + t(C.weathers[r.weather].name) + ' · ' +
        t('{s} pelanggan dilayan daripada {v} yang datang', { s: r.served, v: r.visitors }) + '</p>' +
      ((tiers.rare || tiers.unique) ? '<p class="hint special">' + t('Pelanggan istimewa: {r} jarang, {u} unik', { r: tiers.rare || 0, u: tiers.unique || 0 }) + '</p>' : '') +
      (r.regulars && r.regulars.some(function (v) { return v.ok; }) ? '<p class="hint special">' + t('Pelanggan tetap yang gembira: {list}',
        { list: r.regulars.filter(function (v) { return v.ok; }).map(function (v) { return esc(S.regular(v.id).name); }).join(', ') }) + '</p>' : '') +
      (r.factoryDay ? '<p class="hint">' + t('Pekerja kilang singgah waktu rehat tengah hari dan lepas habis syif.') + '</p>' : '') +
      (r.tcgRelease ? '<p class="hint special">' + t('Set TCG baru! {n} peminat kad datang cari pek booster.', { n: r.collectors }) + '</p>'
        : r.collectors ? '<p class="hint">' + t('{n} peminat kad singgah cari pek booster.', { n: r.collectors }) + '</p>' : '') +
      (r.multiBuys ? '<p class="hint special">' + t('{n} orang beli berganda hari ini.', { n: r.multiBuys }) + '</p>' : '') +
      sold +
      row(t('Hasil jualan'), '<span class="pos">' + rm(r.revenue) + '</span>') +
      row(t('Beli stok'), '<span class="loss">' + rm(-r.stockSpend) + '</span>') +
      (r.midSpend ? row(t('Tambah stok (siang)'), '<span class="loss">' + rm(-r.midSpend) + '</span>') : '') +
      row(t('Sewa dan bil'), '<span class="loss">' + rm(-r.bills) + '</span>') +
      (r.claw ? row(t('Mesin capit ({n} kali main)', { n: r.claw.plays }), '<span class="pos">' + rm(r.claw.net) + '</span>') : '') +
      (r.tips ? row(t('Tip daripada pelanggan'), '<span class="pos">' + rm(r.tips) + '</span>') : '') +
      row(t('Untung hari ini'), '<span class="' + (r.profit >= 0 ? 'pos' : 'loss') + '">' + rm(r.profit) + '</span>', 'total') +
      row(t('Reputasi'), r.repBefore + ' → ' + r.repAfter + ' (' + (repDiff >= 0 ? '+' : '') + repDiff + ')') +
      (r.bankInterest ? row(t('Pulangan bank malam ini'), '<span class="pos">+' + rm(r.bankInterest) + '</span> <small>(' + t('baki {v}', { v: rm(r.bankBalance) }) + ')</small>') : '') +
      (r.milestones && r.milestones.length ? '<div class="earned">' + r.milestones.map(function (id) {
        var m = C.milestones.find(function (x) { return x.id === id; });
        return '<p>' + t('Pencapaian baru: {m} (+{v})', { m: t(m.name), v: rm0(m.reward) }) + '</p>';
      }).join('') + '</div>' : '') +
      '<div class="tips">' + tips(r).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>' +
      '<p class="hint">' + t('Untung hari ini termasuk stok yang korang beli. Stok yang belum terjual masih ada untuk esok.') + '</p>' +
      '<button class="btn primary" id="nextBtn">' + t('Hari seterusnya') + '</button>';
    $('reportModal').classList.remove('hidden');
  }

  function bankrupt(s) {
    $('reportBox').innerHTML =
      '<h2>' + t('Kedai terpaksa tutup') + '</h2><p>' + t('Duit dan stok dah habis selepas {d} hari. Untung keseluruhan {v}.', { d: s.day - 1, v: rm(s.stats.totalProfit) }) + '</p>' +
      '<p class="hint">' + t('Tip: mulakan dengan stok yang laku dan harga dekat harga biasa, kemudian naikkan sikit-sikit.') + '</p>' +
      '<button class="btn primary" id="restartBtn">' + t('Buka kedai baru') + '</button>';
    $('reportModal').classList.remove('hidden');
  }

  // End of the 90-day season: a record of everything achieved, then carry on in free play.
  function seasonEnd(s, best, isNewBest) {
    var value = S.shopValue(s), stars = S.starsFor(value), st = s.stats;
    var msg = ['Kedai masih kecil, tapi korang dah belajar selok-belok berniaga.',
               'Bagus! Kedai korang dah mula dikenali.',
               'Hebat! Kedai korang jadi pilihan orang taman.',
               'Tauke sebenar! Kedai korang paling laku.'][stars];
    var normal = C.upgrades.filter(function (u) { return !u.hidden; });
    var owned = normal.filter(function (u) { return S.level(s, u.id); }).length;
    $('reportBox').innerHTML =
      '<h2>' + t('Rekod {n} Hari', { n: C.seasonDays }) + '</h2>' +
      '<div class="big-stars">' + starsHtml(stars) + '</div>' +
      '<p>' + t(msg) + '</p>' +
      row(t('Nilai kedai'), rm0(value), 'total') +
      row(t('Untung keseluruhan'), rm(st.totalProfit)) +
      row(t('Jumlah jualan'), rm(st.revenue || 0)) +
      row(t('Hari paling untung'), rm(st.bestDay)) +
      row(t('Pelanggan dilayan'), st.customers) +
      row('&nbsp;&nbsp;' + t('Biasa') + ' / ' + t('Jarang') + ' / ' + t('Unik'),
        (st.tiers.common || 0) + ' / ' + (st.tiers.rare || 0) + ' / ' + (st.tiers.unique || 0)) +
      row(t('Beli berganda'), st.multiBuys || 0) +
      row(t('Balik sebab beratur lama'), st.turnedAway || 0) +
      row(t('Reputasi'), s.rep) +
      row(t('Naik taraf dimiliki'), owned + '/' + normal.length) +
      row(t('Pencapaian'), Object.keys(s.milestones).length + '/' + C.milestones.length) +
      row(t('Rekod terbaik'), rm0(best.value) + (isNewBest ? t(' (baru!)') : '')) +
      (S.level(s, 'ssm') ? '<p class="hint special">' + t('{c} masuk Papan Prestasi Syarikat dengan markah {v}.', { c: esc(s.shopName), v: rm0(value) }) + '</p>'
        : '<p class="hint">' + t('Daftar SSM (Naik Taraf) supaya musim seterusnya masuk Papan Prestasi Syarikat.') + '</p>') +
      row(t('Simpanan bank'), rm(S.bank(s).balance)) +
      '<p class="hint">' + t('Sasaran bintang: {list}. Nilai kedai = duit + bank + stok + naik taraf.', { list: C.starTargets.map(rm0).join(' / ') }) + '</p>' +
      '<button class="btn primary wide" id="continueBtn">' + t('Teruskan main (mod bebas)') + '</button>' +
      '<button class="btn wide" id="newSeasonBtn">' + t('Mula musim baru') + '</button>';
    $('reportModal').classList.remove('hidden');
  }

  // Cash + bank reached RM7,500: celebrate, and offer a second branch (coming in a later update).
  function celebrate(s) {
    $('reportBox').innerHTML =
      '<h2>' + t('Tahniah, tauke!') + '</h2>' +
      '<div class="big-stars">' + starsHtml(3) + '</div>' +
      '<p>' + t('Duit dan simpanan korang dah capai {v} pada hari {d}. Kedai runcit kecil ni dah jadi perniagaan sebenar!', { v: rm0(s.cash + S.bank(s).balance), d: s.day }) + '</p>' +
      '<p class="hint">' + t('Langkah seterusnya: buka cawangan baru di jalan yang lebih sibuk, dengan barang jualan baru. Pengurus Kedai boleh jaga kedai ini untuk korang.') + '</p>' +
      '<button class="btn primary wide" id="expandBtn" disabled>' + t('Buka cawangan baru (akan datang)') + '</button>' +
      '<button class="btn wide" id="celebrateOk">' + t('Teruskan berniaga') + '</button>';
    $('reportModal').classList.remove('hidden');
  }

  return { company: company, setMailView: setMailView, celebrate: celebrate, bankTab: bankTab, $: $, seasonEnd: seasonEnd, goal: goal, rm: rm, plan: plan, header: header, products: products, upgrades: upgrades,
           customers: customers, records: records, report: report, bankrupt: bankrupt };
})();
