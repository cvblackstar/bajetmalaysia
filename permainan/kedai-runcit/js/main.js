// Controller: wires buttons to the rules, plays the day animation, saves progress.
(function () {
  var C = KR.config, S = KR.sim, UI = KR.ui, P = KR.platform, A = KR.art, SFX = KR.audio, S3 = KR.scene3d, $ = UI.$;
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
    if (!window.confirm('Padam semua kemajuan dan mula semula?')) return;
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
      if (!window.confirm('Tiada stok langsung. Buka kedai juga?')) return;
    }
    var result = S.runDay(state);
    save(); // result is saved before the animation, so a reload can't replay the day
    playDay(result);
  });

  // ---------- Day playback ----------
  function playDay(result) {
    P.sdk.gameplayStart();
    $('plan').classList.add('hidden');
    $('dayView').classList.remove('hidden');
    var scene = $('scene');
    scene.className = 'scene w-' + result.report.weather;
    $('sceneSign').textContent = state.shopName.toUpperCase();
    $('shelf').innerHTML = C.products.filter(function (p) { return state.stock[p.id] || result.report.perProduct[p.id].sold; })
      .map(function (p) { return A.product(p.id); }).join('');
    $('walkers').innerHTML = '';
    var use3d = S3.isReady();
    scene.classList.toggle('is3d', use3d);
    if (use3d) S3.start({
      host: scene, overlay: $('walkers'), weather: result.report.weather, shopName: state.shopName,
      products: C.products.filter(function (p) { return state.stock[p.id] || result.report.perProduct[p.id].sold; })
        .map(function (p) { return A.product(p.id); })
    });
    $('liveCust').textContent = '0';
    $('liveSales').textContent = 'RM0.00';
    UI.header(state);
    day0Cash = result.report.cash - result.report.revenue + result.report.bills - (result.report.rewards || 0);
    $('cash').textContent = UI.rm(day0Cash);

    day = { use3d: use3d, result: result, next: 0, elapsed: 0, last: performance.now(), speed: day ? day.speed : 1,
            timers: [], customers: 0, sales: 0, done: false };
    setSpeed(day.speed);
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!day || day.done) return;
    var dt = Math.min(100, now - day.last); day.last = now;
    day.elapsed += dt * day.speed;
    var tl = day.result.timeline, dur = C.dayLengthMs;
    while (day.next < tl.length && tl[day.next].t * dur <= day.elapsed) spawn(tl[day.next++]);
    var mins = 8 * 60 + Math.min(1, day.elapsed / dur) * 14 * 60;
    var h = Math.floor(mins / 60), m = Math.floor(mins % 60 / 15) * 15;
    $('clock').textContent = ((h - 1) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' pagi' : h < 19 ? ' petang' : ' malam');
    if (day.elapsed >= dur + 2500) return finishDay();
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
      $('cash').textContent = UI.rm(day0Cash + day.sales);
      return { bad: false, html: entry.bought.map(function (id) { return A.product(id); }).join('') };
    }
    if (day.speed === 1) SFX.sad();
    var c = entry.complaint || {};
    return { bad: true, html: c.type === 'pricey' ? 'Mahalnya ' + A.product(c.id)
      : c.type === 'out' ? A.product(c.id) + ' habis?' : 'Lama sangat!' };
  }

  function spawn3d(entry) {
    var sp = day.speed, walk = 1400 / sp, fromLeft = Math.random() < 0.5;
    var h = S3.spawn(Math.floor(Math.random() * 1000), fromLeft, walk);
    later(function () {
      var o = outcome(entry);
      S3.say(h, o.html, o.bad);
      later(function () {
        S3.leave(h, walk);
        later(function () { S3.remove(h); }, walk + 50);
      }, 900 / sp);
    }, walk);
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
      }, 900 / sp);
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

  function finishDay() {
    if (!day || day.done) return;
    day.done = true;
    day.timers.forEach(clearTimeout);
    if (day.use3d) S3.stop();
    P.sdk.gameplayStop();
        UI.header(state);
    if (day.result.report.profit > 0 || day.result.report.milestones.length) SFX.kaching();
    UI.report(day.result.report, state);
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
    $('muteBtn').textContent = m ? 'Bunyi: tutup' : 'Bunyi: buka';
    $('muteBtn').setAttribute('aria-pressed', String(!m));
  }
  $('muteBtn').addEventListener('click', function () { SFX.setMuted(!SFX.isMuted()); renderMute(); SFX.click(); });
  renderMute();

  function renderGfx() {
    var on = S3.wanted() && !S3.failed();
    $('gfxBtn').textContent = on ? 'Grafik: 3D' : 'Grafik: 2D';
    $('gfxBtn').disabled = S3.failed();
  }
  $('gfxBtn').addEventListener('click', function () {
    S3.setWanted(!S3.wanted()); renderGfx(); S3.load().then(renderGfx);
  });
  renderGfx();
  S3.load().then(renderGfx); // three.js loads in the background; 2D is used until it's ready

  // ---------- Boot ----------
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
