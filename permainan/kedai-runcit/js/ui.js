// Rendering: turns the state into DOM. Reads state, never changes game rules.
window.KR = window.KR || {};

KR.ui = (function () {
  var C = KR.config, S = KR.sim;
  var $ = function (id) { return document.getElementById(id); };

  function rm(n) {
    var neg = n < 0;
    return (neg ? '-RM' : 'RM') + Math.abs(n).toFixed(2);
  }
  function rm0(n) { return (n < 0 ? '-RM' : 'RM') + Math.abs(Math.round(n)).toLocaleString('en-MY'); }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  function header(s) {
    $('dayLabel').textContent = 'Hari ' + s.day + ' · ' + S.dayName(s.day);
    $('shopName').textContent = s.shopName;
    $('cash').textContent = rm(s.cash);
    $('cash').classList.toggle('neg', s.cash < 0);
    $('rep').textContent = s.rep;
    $('repBar').style.width = s.rep + '%';
    var used = S.totalUnits(s.stock) + S.totalUnits(s.order);
    $('cap').textContent = used + '/' + S.capacity(s);
  }

  function forecast(s) {
    var f = s.forecast, w = C.weathers[f.weather], ev = f.event ? C.events[f.event] : null;
    $('forecast').innerHTML =
      '<div class="wicon">' + w.icon + '</div><div>' +
      '<h3>Ramalan: ' + w.name + '</h3>' +
      '<p>Kos harian RM' + S.dailyCosts(s) + ' (sewa dan bil). Ramalan cuaca tak selalu tepat.</p>' +
      (ev ? '<span class="event-tag">' + esc(ev.name) + '</span> <p>' + esc(ev.desc) + '</p>' : '') +
      '</div>';
  }

  function products(s) {
    $('products').innerHTML = C.products.map(function (p) {
      if (!S.isUnlocked(s, p)) {
        var u = S.upgrade(p.requires);
        return '<div class="product locked"><div class="picon">' + p.icon + '</div>' +
          '<div><div class="pname">' + p.name + '</div><div class="pmeta">Perlu ' + u.name + '</div></div><div></div></div>';
      }
      var cost = S.buyCost(s, p), price = s.prices[p.id], unit = S.round2(price - cost);
      var order = s.order[p.id] || 0;
      return '<div class="product" data-id="' + p.id + '">' +
        '<div class="picon">' + p.icon + '</div>' +
        '<div><div class="pname">' + p.name + '</div>' +
        '<div class="pmeta">Borong ' + rm(cost) + ' · Harga biasa ' + rm(p.ref) + (p.perish >= 0.2 ? ' · cepat rosak' : '') + '</div></div>' +
        '<div class="margin ' + (unit > 0 ? 'good' : 'bad') + '">' + (unit >= 0 ? '+' : '') + rm(unit) + '/unit</div>' +
        '<div class="controls">' +
          '<div class="group"><label>Stok</label>' +
            '<button class="step" data-act="order" data-n="-10"' + (order <= 0 ? ' disabled' : '') + '>−10</button>' +
            '<span class="val">' + s.stock[p.id] + (order ? ' + ' + order : '') + '</span>' +
            '<button class="step" data-act="order" data-n="10"' + (S.canOrder(s, p.id, 1) ? '' : ' disabled') + '>+10</button>' +
          '</div>' +
          '<div class="group"><label>Harga</label>' +
            '<button class="step" data-act="price" data-n="-0.1">−</button>' +
            '<span class="val">' + rm(price) + '</span>' +
            '<button class="step" data-act="price" data-n="0.1">+</button>' +
          '</div>' +
        '</div></div>';
    }).join('');
    $('orderCost').textContent = rm(S.orderCost(s));
  }

  function upgrades(s) {
    $('upgrades').innerHTML = C.upgrades.map(function (u) {
      var have = !!s.upgrades[u.id];
      return '<div class="upgrade' + (have ? ' owned' : '') + '">' +
        '<div class="uicon">' + u.icon + '</div><h4>' + u.name + '</h4><p>' + u.desc +
        (u.upkeep ? ' Kos RM' + u.upkeep + '/hari.' : '') + '</p>' +
        (have ? '<strong class="pos">Sudah ada</strong>'
              : '<button class="btn primary" data-up="' + u.id + '"' + (s.cash < u.price ? ' disabled' : '') + '>Beli ' + rm0(u.price) + '</button>') +
        '</div>';
    }).join('');
  }

  function records(s) {
    var h = s.history, max = Math.max.apply(null, h.map(Math.abs).concat([1]));
    $('records').innerHTML =
      '<table><tr><td>Hari dibuka</td><td>' + (s.day - 1) + '</td></tr>' +
      '<tr><td>Untung keseluruhan</td><td>' + rm(s.stats.totalProfit) + '</td></tr>' +
      '<tr><td>Hari paling untung</td><td>' + rm(s.stats.bestDay) + '</td></tr>' +
      '<tr><td>Pelanggan dilayan</td><td>' + s.stats.customers + '</td></tr></table>' +
      (h.length ? '<p class="hint">Untung 14 hari terakhir</p><div class="spark">' + h.map(function (v) {
        return '<i class="' + (v < 0 ? 'loss' : '') + '" style="height:' + Math.max(4, Math.abs(v) / max * 100) + '%" title="' + rm(v) + '"></i>';
      }).join('') + '</div>' : '');
    $('nameInput').value = s.shopName;
  }

  function plan(s) { header(s); forecast(s); products(s); upgrades(s); records(s); }

  function tips(r, s) {
    var out = [];
    if (r.weather !== r.forecast) out.push('Cuaca sebenar ' + C.weathers[r.weather].name.toLowerCase() + ', bukan seperti ramalan.');
    var worstPricey = null, worstOut = null;
    C.products.forEach(function (p) {
      var st = r.perProduct[p.id];
      if (st.pricey >= 3 && (!worstPricey || st.pricey > worstPricey.n)) worstPricey = { p: p, n: st.pricey };
      if (st.out >= 3 && (!worstOut || st.out > worstOut.n)) worstOut = { p: p, n: st.out };
    });
    if (worstPricey) out.push(worstPricey.n + ' orang kata ' + worstPricey.p.name + ' mahal. Cuba turunkan sikit harga.');
    if (worstOut) out.push(worstOut.n + ' orang cari ' + worstOut.p.name + ' tapi dah habis. Tambah stok esok.');
    if (r.queueLost) out.push(r.queueLost + ' orang balik sebab lama beratur. Pembantu kedai boleh tolong.');
    var spoiledText = Object.keys(r.spoiled).map(function (id) { return r.spoiled[id] + ' ' + S.product(id).name; });
    if (spoiledText.length) out.push('Rosak semalaman: ' + spoiledText.join(', ') + ' (' + rm(r.spoiledValue) + ').');
    if (!out.length) out.push('Hari yang lancar. Pelanggan puas hati.');
    return out;
  }

  function report(r, s) {
    var repDiff = r.repAfter - r.repBefore;
    var sold = C.products.filter(function (p) { return r.perProduct[p.id].sold; }).map(function (p) {
      var st = r.perProduct[p.id];
      return '<div class="report-row"><span>' + p.icon + ' ' + p.name + ' × ' + st.sold + '</span><span>' + rm(st.revenue) + '</span></div>';
    }).join('');
    $('reportBox').innerHTML =
      '<h2>Laporan Hari ' + r.day + ' (' + r.dayName + ')</h2>' +
      '<p class="hint">' + C.weathers[r.weather].icon + ' ' + C.weathers[r.weather].name + ' · ' +
        r.served + ' pelanggan dilayan daripada ' + r.visitors + ' yang datang</p>' +
      sold +
      '<div class="report-row"><span>Hasil jualan</span><span class="pos">' + rm(r.revenue) + '</span></div>' +
      '<div class="report-row"><span>Beli stok</span><span class="loss">' + rm(-r.stockSpend) + '</span></div>' +
      '<div class="report-row"><span>Sewa dan bil</span><span class="loss">' + rm(-r.bills) + '</span></div>' +
      '<div class="report-row total"><span>Untung hari ini</span><span class="' + (r.profit >= 0 ? 'pos' : 'loss') + '">' + rm(r.profit) + '</span></div>' +
      '<div class="report-row"><span>Reputasi</span><span>' + r.repBefore + ' → ' + r.repAfter + ' (' + (repDiff >= 0 ? '+' : '') + repDiff + ')</span></div>' +
      '<div class="tips">' + tips(r, s).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
      '<p class="hint">Untung hari ini termasuk stok yang korang beli. Stok yang belum terjual masih ada untuk esok.</p>' +
      '<button class="btn primary" id="nextBtn">Hari seterusnya</button>';
    $('reportModal').classList.remove('hidden');
  }

  function bankrupt(s) {
    $('reportBox').innerHTML =
      '<h2>Kedai terpaksa tutup</h2><p>Duit dan stok dah habis selepas ' + (s.day - 1) + ' hari. ' +
      'Untung keseluruhan ' + rm(s.stats.totalProfit) + '.</p>' +
      '<p class="hint">Tip: mulakan dengan stok yang laku dan harga dekat harga biasa, kemudian naikkan sikit-sikit.</p>' +
      '<button class="btn primary" id="restartBtn">Buka kedai baru</button>';
    $('reportModal').classList.remove('hidden');
  }

  return { $: $, rm: rm, plan: plan, header: header, products: products, upgrades: upgrades,
           records: records, report: report, bankrupt: bankrupt };
})();
