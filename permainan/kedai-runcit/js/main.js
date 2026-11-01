// Controller: wires buttons to the rules, plays the day animation, saves progress.
(function () {
  var C = KR.config, S = KR.sim, UI = KR.ui, P = KR.platform, $ = UI.$;
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
    if (b && S.buyUpgrade(state, b.dataset.up)) { P.sdk.happytime(); save(); UI.plan(state); }
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
      .map(function (p) { return '<span>' + p.icon + '</span>'; }).join('');
    $('walkers').innerHTML = '';
    $('liveCust').textContent = '0';
    $('liveSales').textContent = 'RM0.00';
    UI.header(state);
    day0Cash = result.report.cash - result.report.revenue + result.report.bills - (result.report.rewards || 0);
    $('cash').textContent = UI.rm(day0Cash);

    day = { result: result, next: 0, elapsed: 0, last: performance.now(), speed: day ? day.speed : 1,
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

  function spawn(entry) {
    var scene = $('scene'), w = scene.clientWidth, sp = day.speed;
    var door = scene.querySelector('.door').getBoundingClientRect().left - scene.getBoundingClientRect().left + 20;
    var el = document.createElement('div');
    el.className = 'walker';
    el.textContent = C.customers[Math.floor(Math.random() * C.customers.length)];
    var fromLeft = Math.random() < 0.5;
    el.style.left = (fromLeft ? -40 : w + 10) + 'px';
    $('walkers').appendChild(el);
    var walk = 1400 / sp;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      el.style.transitionDuration = walk + 'ms';
      el.style.left = door + 'px';
    }); });
    later(function () {
      var bubble = document.createElement('div');
      if (entry.bought.length) {
        bubble.className = 'bubble';
        bubble.textContent = entry.bought.map(function (id) { return S.product(id).icon; }).join('');
        day.customers++;
        entry.bought.forEach(function (id) { day.sales += state.prices[id]; });
        $('liveCust').textContent = day.customers;
        $('liveSales').textContent = UI.rm(day.sales);
        $('cash').textContent = UI.rm(day0Cash + day.sales);
      } else {
        bubble.className = 'bubble bad';
        var c = entry.complaint || {};
        bubble.textContent = c.type === 'pricey' ? 'Mahalnya ' + S.product(c.id).icon
          : c.type === 'out' ? S.product(c.id).icon + ' habis?' : 'Lama sangat!';
      }
      el.appendChild(bubble);
      later(function () {
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
    P.sdk.gameplayStop();
        UI.header(state);
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
    showPlan();
    UI.seasonEnd(state, best, isNew);
  }

  $('introBtn').addEventListener('click', function () {
    state.seenIntro = true; save();
    $('introModal').classList.add('hidden');
  });

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
