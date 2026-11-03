// Controller: wires buttons to the rules, plays the day animation, saves progress.
(function () {
  var C = KR.config, S = KR.sim, UI = KR.ui, P = KR.platform, A = KR.art, SFX = KR.audio, S3 = KR.scene3d, $ = UI.$;
  var I18N = KR.i18n, t = I18N.t;
  var state = KR.state.load();
  var day = null; // current playback
  var day0Cash = 0;

  function save() { KR.state.save(state); }

  function showPlan() {
    $('plan').classList.remove('hidden');
    $('dayView').classList.add('hidden');
    UI.plan(state);
  }

  // ---------- Planning ----------
  $('products').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var id = b.closest('.product').dataset.id, n = parseFloat(b.dataset.n);
    SFX.click();
    if (b.dataset.act === 'order') {
      if (n < 0) state.order[id] = Math.max(0, state.order[id] + n);
      else for (var i = 0; i < n && S.canOrder(state, id, 1); i++) state.order[id]++;
    } else {
      var p = S.product(id);
      state.prices[id] = Math.min(p.ref * 3, Math.max(0.1, S.round2(state.prices[id] + n)));
    }
    UI.header(state); UI.products(state); save();
  });

  $('upgrades').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-up]');
    if (b && S.buyUpgrade(state, b.dataset.up)) { SFX.kaching(); P.sdk.happytime(); save(); UI.plan(state); }
  });

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('active', x === t); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.add('hidden'); });
      $('tab-' + t.dataset.tab).classList.remove('hidden');
    });
  });

  $('nameInput').addEventListener('change', function () {
    state.shopName = this.value.trim().slice(0, 28) || 'Kedai Runcit Bajet';
    save(); UI.header(state);
  });

  $('resetBtn').addEventListener('click', function () {
    if (!window.confirm(t('Padam semua kemajuan dan mula semula?'))) return;
    restart();
  });

  function restart() {
    state = KR.state.reset();
    state.seenIntro = true;
    S.startDay(state); save();
    $('reportModal').classList.add('hidden');
    showPlan();
  }

  $('openBtn').addEventListener('click', function () {
    if (S.totalUnits(state.stock) + S.totalUnits(state.order) === 0) {
      if (!window.confirm(t('Tiada stok langsung. Buka kedai juga?'))) return;
    }
    S.openDay(state);
    save(); // the day in progress is saved, so a reload finishes it instead of replaying it
    playDay();
  });

  // ---------- Day playback ----------
  function playDay() {
    var today = state.today;
    var shown = S.unlockedProducts(state).filter(function (p) { return state.stock[p.id] || today.perProduct[p.id].sold; });
    P.sdk.gameplayStart();
    $('plan').classList.add('hidden');
    $('dayView').classList.remove('hidden');
    var scene = $('scene');
    scene.className = 'scene w-' + today.weather;
    $('sceneSign').textContent = state.shopName.toUpperCase();
    $('shelf').innerHTML = shown.map(function (p) { return A.product(p.id); }).join('');
    $('walkers').innerHTML = '';
    var use3d = S3.isReady();
    scene.classList.toggle('is3d', use3d);
    if (use3d) S3.start({
      host: scene, overlay: $('walkers'), weather: today.weather, shopName: state.shopName,
      products: S.unlockedProducts(state).map(function (p) { return A.product(p.id); }),
      staff: state.upgrades.pembantu ? 2 : 1,
      lots: S.level(state, 'rak'),                               // shop lots rented next door
      capacity: 5 + 3 * S.level(state, 'rak') + (state.upgrades.pembantu ? 2 : 0),   // customers inside at once
      timeScale: function () { return day && !day.paused ? day.speed : 0; }
    });
    $('liveCust').textContent = '0';
    $('liveSales').textContent = 'RM0.00';
    UI.header(state);
    day0Cash = state.cash;
    $('cash').textContent = UI.rm(day0Cash);

    var hours = S.closeHour(state) - C.openHour, visitors = today.timeline.length;
    day = { use3d: use3d, elapsed: 0, paused: false, last: performance.now(), speed: day ? day.speed : 1,
            timers: [], customers: 0, sales: 0, done: false, hours: hours, dur: hours * C.hourMs };
    // Time a customer spends browsing and paying (on top of ~3.5s walking around inside): short
    // enough that the shop keeps up on average, so a line only builds up in a rush.
    day.dwell = Math.max(250, Math.min(1800, 0.75 * (5 + 3 * S.level(state, 'rak') + (state.upgrades.pembantu ? 2 : 0)) * day.dur / Math.max(1, visitors) - 3500));
    setSpeed(day.speed);
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!day || day.done) return;
    var dt = Math.min(100, now - day.last); day.last = now;
    if (!day.paused) day.elapsed += dt * day.speed;
    var tl = state.today.timeline, dur = day.dur;
    while (state.today.next < tl.length && tl[state.today.next].t * dur <= day.elapsed) {
      spawn(S.serveNext(state));                           // buys from the stock on the shelf right now
      if (state.today.next % 10 === 0) save();
    }
    var mins = C.openHour * 60 + Math.min(1, day.elapsed / dur) * day.hours * 60;
    var h = Math.floor(mins / 60), m = Math.floor(mins % 60 / 15) * 15;
    if (day.use3d) S3.setHour(mins / 60);
    $('clock').textContent = ((h - 1) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + ' ' + t(h < 12 ? 'pagi' : h < 19 ? 'petang' : 'malam');
    if (day.elapsed >= dur + (day.use3d ? 9000 : 2500)) return finishDay();   // let the last customers come out
    requestAnimationFrame(tick);
  }

  function later(fn, ms) { day.timers.push(setTimeout(fn, ms)); }

  // What the customer says and how the live counters change when they reach the door.
  function outcome(entry) {
    if (entry.bought.length) {
      SFX.coin();
      day.customers++;
      entry.bought.forEach(function (id) { day.sales += state.prices[id]; });
      $('liveCust').textContent = day.customers;
      $('liveSales').textContent = UI.rm(day.sales);
      $('cash').textContent = UI.rm(day0Cash + day.sales - state.today.midSpend);
      var counts = {};
      entry.bought.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
      return { bad: false, tier: entry.tier, html: Object.keys(counts).map(function (id) {
        return A.product(id) + (counts[id] > 1 ? '<b>×' + counts[id] + '</b>' : '');
      }).join('') };
    }
    if (day.speed === 1) SFX.sad();
    var c = entry.complaint || {};
    return { bad: true, html: c.type === 'pricey' ? t('Mahalnya') + ' ' + A.product(c.id)
      : c.type === 'out' ? t('{p} habis?', { p: A.product(c.id) }) : t('Lama sangat!') };
  }

  function spawn3d(entry) {
    S3.spawn({
      seed: Math.floor(Math.random() * 1000), fromLeft: Math.random() < 0.5, rep: state.rep, tier: entry.tier,
      dwell: day.dwell, patience: 2500, bx: (Math.random() - 0.5) * 1.6,
      giveUp: !!(entry.complaint && entry.complaint.type === 'queue'),
      outcome: function () { return outcome(entry); }
    });
  }

  function spawn(entry) {
    if (day.use3d) return spawn3d(entry);
    var scene = $('scene'), w = scene.clientWidth, sp = day.speed;
    var door = scene.querySelector('.door').getBoundingClientRect().left - scene.getBoundingClientRect().left + 20;
    var el = document.createElement('div');
    el.className = 'walker';
    el.innerHTML = A.person(Math.floor(Math.random() * 1000));
    var fromLeft = Math.random() < 0.5;
    if (!fromLeft) el.classList.add('flip');
    el.style.left = (fromLeft ? -40 : w + 10) + 'px';
    $('walkers').appendChild(el);
    var walk = 1400 / sp;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      el.style.transitionDuration = walk + 'ms';
      el.style.left = door + 'px';
    }); });
    later(function () {
      var o = outcome(entry);
      var bubble = document.createElement('div');
      bubble.className = 'bubble' + (o.bad ? ' bad' : '');
      bubble.innerHTML = o.html;
      el.appendChild(bubble);
      later(function () {
        el.classList.add('leaving');
        el.style.left = (fromLeft ? w + 10 : -40) + 'px';
        later(function () { el.remove(); }, walk);
      }, 1100 / sp);
    }, walk);
  }

  function setSpeed(n) {
    if (day) day.speed = n;
    document.querySelectorAll('[data-speed]').forEach(function (b) { b.classList.toggle('active', +b.dataset.speed === n); });
  }
  document.querySelectorAll('[data-speed]').forEach(function (b) {
    b.addEventListener('click', function () { setSpeed(+b.dataset.speed); });
  });
  $('skipBtn').addEventListener('click', function () { if (day) finishDay(); });

  // ---------- Mid-day restock ----------
  // Pauses the day; stock bought here costs C.midRestockMarkup more and is on the shelf at once.
  function renderRestock() {
    $('restockList').innerHTML = S.unlockedProducts(state).map(function (p) {
      return '<div class="restock-row" data-id="' + p.id + '"><span class="ricon">' + A.product(p.id) + '</span>' +
        '<span class="rname">' + t(p.name) + '<small>' + t('Stok: {n} | {c} seunit', { n: state.stock[p.id], c: UI.rm(S.restockCost(p.id, 1)) }) + '</small></span>' +
        [5, 10].map(function (n) {
          return '<button class="btn small" data-n="' + n + '"' + (S.canRestock(state, p.id, n) ? '' : ' disabled') + '>+' + n +
            ' (' + UI.rm(S.restockCost(p.id, n)) + ')</button>';
        }).join('') + '</div>';
    }).join('');
    $('restockCash').textContent = UI.rm(state.cash);
  }
  $('restockBtn').addEventListener('click', function () {
    if (!day || day.done) return;
    day.paused = true; SFX.click();
    renderRestock();
    $('restockModal').classList.remove('hidden');
  });
  $('restockList').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-n]');
    if (!b || !day) return;
    var id = b.closest('.restock-row').dataset.id;
    if (S.restock(state, id, +b.dataset.n)) {
      SFX.coin(); save(); renderRestock();
      $('cash').textContent = UI.rm(day0Cash + day.sales - state.today.midSpend);
    }
  });
  $('restockClose').addEventListener('click', function () {
    $('restockModal').classList.add('hidden');
    if (day) { day.paused = false; day.last = performance.now(); }
  });

  function finishDay() {
    if (!day || day.done) return;
    day.done = true;
    day.timers.forEach(clearTimeout);
    if (day.use3d) S3.stop();
    P.sdk.gameplayStop();
    $('restockModal').classList.add('hidden');
    var report = S.closeDay(state);
    save();
    UI.header(state);
    if (report.profit > 0 || report.milestones.length) SFX.kaching();
    UI.report(report, state);
  }

  $('reportBox').addEventListener('click', function (e) {
    if (e.target.id === 'restartBtn' || e.target.id === 'newSeasonBtn') return restart();
    if (e.target.id === 'continueBtn') {
      state.seasonDone = true; save();
      $('reportModal').classList.add('hidden');
      return showPlan();
    }
    if (e.target.id !== 'nextBtn') return;
    $('reportModal').classList.add('hidden');
    S.nextDay(state); save();
    if (S.seasonOver(state)) return endSeason();
    if (S.isBankrupt(state)) return UI.bankrupt(state);
    showPlan();
  });

  function endSeason() {
    var value = S.shopValue(state), best = KR.state.loadBest(), isNew = value > best.value;
    if (isNew) { best = { value: value, stars: S.starsFor(value), day: state.day - 1 }; KR.state.saveBest(best); }
    P.leaderboard.submit({ shopName: state.shopName, value: value, stars: S.starsFor(value), season: true });
    P.sdk.happytime();
    SFX.kaching();
    showPlan();
    UI.seasonEnd(state, best, isNew);
  }

  $('introBtn').addEventListener('click', function () {
    state.seenIntro = true; save();
    $('introModal').classList.add('hidden');
  });

  function renderMute() {
    var m = SFX.isMuted();
    $('muteBtn').textContent = t(m ? 'Bunyi: tutup' : 'Bunyi: buka');
    $('muteBtn').setAttribute('aria-pressed', String(!m));
  }
  $('muteBtn').addEventListener('click', function () { SFX.setMuted(!SFX.isMuted()); renderMute(); SFX.click(); });
  renderMute();

  function renderGfx() {
    var on = S3.wanted() && !S3.failed();
    $('gfxBtn').textContent = t(on ? 'Grafik: 3D' : 'Grafik: 2D');
    $('gfxBtn').disabled = S3.failed();
  }
  $('gfxBtn').addEventListener('click', function () {
    S3.setWanted(!S3.wanted()); renderGfx(); S3.load().then(renderGfx);
  });
  renderGfx();
  S3.load().then(renderGfx);

  // Language: Bahasa Melayu / English
  function renderLang() {
    $('langBtn').textContent = I18N.lang() === 'en' ? 'Language: EN' : 'Bahasa: BM';
    $('introLang').textContent = I18N.lang() === 'en' ? 'Bahasa Melayu' : 'English';
  }
  $('introLang').addEventListener('click', function () { $('langBtn').click(); });
  $('langBtn').addEventListener('click', function () {
    I18N.set(I18N.lang() === 'en' ? 'ms' : 'en'); SFX.click();
    renderLang(); renderMute(); renderGfx();
    UI.plan(state);
    if (!$('reportModal').classList.contains('hidden')) {        // re-show whatever the modal was showing
      if ($('nextBtn') && state.lastReport) UI.report(state.lastReport, state);
      else if ($('continueBtn')) UI.seasonEnd(state, KR.state.loadBest(), false);
      else if ($('restartBtn')) UI.bankrupt(state);
    }
    if (!$('restockModal').classList.contains('hidden')) renderRestock();
  });
  I18N.apply(); renderLang(); // three.js loads in the background; 2D is used until it's ready

  // ---------- Boot ----------
  // A day left half-played (page closed mid-day): serve the rest of it and show the report.
  if (state.today) { S.closeDay(state); save(); }
  // A day that was simulated but whose report wasn't closed: show the report again.
  if (state.lastReport) {
    UI.plan(state);
    UI.report(state.lastReport, state);
  } else {
    S.startDay(state); save();
    if (S.seasonOver(state)) endSeason();
    else { showPlan(); if (S.isBankrupt(state)) UI.bankrupt(state); }
  }
  if (!state.seenIntro) $('introModal').classList.remove('hidden');
})();
