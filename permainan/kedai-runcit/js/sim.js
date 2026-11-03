// Pure game rules. No DOM here, so it can be tested or run on a server later.
window.KR = window.KR || {};

KR.sim = (function () {
  var C = KR.config;
  var rnd = Math.random;

  function round2(n) { return Math.round(n * 100) / 100; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function product(id) { return C.products.find(function (p) { return p.id === id; }); }
  function upgrade(id) { return C.upgrades.find(function (u) { return u.id === id; }); }
  // Upgrade level owned (old saves stored true for a one-level upgrade).
  function level(s, id) { var v = s.upgrades[id]; return v === true ? 1 : (v || 0); }
  function ownedLevels(s) {
    var out = [];
    C.upgrades.forEach(function (u) { for (var i = 0; i < level(s, u.id); i++) out.push(u.levels[i]); });
    return out;
  }
  function sumUp(s, key) { return ownedLevels(s).reduce(function (t, l) { return t + (l[key] || 0); }, 0); }
  function nextLevel(s, id) { var u = upgrade(id); return u.levels[level(s, id)] || null; }

  // Products with an expiry are tracked in batches (oldest first) so they can go out of date.
  function batches(s, id) {
    s.batches = s.batches || {};
    var b = s.batches[id] = s.batches[id] || [], held = b.reduce(function (t, x) { return t + x.qty; }, 0);
    if (held < s.stock[id]) b.push({ qty: s.stock[id] - held, day: s.day });     // older saves: treat as new
    while (held > s.stock[id] && b.length) { var cut = Math.min(b[0].qty, held - s.stock[id]); b[0].qty -= cut; held -= cut; if (!b[0].qty) b.shift(); }
    return b;
  }
  function addStock(s, id, qty) {
    if (product(id).expiry) { batches(s, id); s.batches[id].push({ qty: qty, day: s.day }); }
    s.stock[id] += qty;
  }
  function takeStock(s, id) {
    if (product(id).expiry) { var b = batches(s, id); if (--b[0].qty <= 0) b.shift(); }
    s.stock[id]--;
  }
  // Days left before the oldest batch expires (null when none in stock or no expiry).
  function daysLeft(s, id) {
    var p = product(id);
    if (!p.expiry || !s.stock[id]) return null;
    return p.expiry - (s.day - batches(s, id)[0].day);
  }

  // Lots open: 1 for the first shop, +1 for each "Besarkan Kedai" level.
  function lotsOpen(s) { return 1 + level(s, 'rak'); }
  function lotOf(p) { return p.lot || 1; }
  function isUnlocked(s, p) { return lotOf(p) <= lotsOpen(s) && (!p.requires || !!level(s, p.requires)); }
  // Some upgrades (mesin capit, kad TCG) need their lot rented first.
  function upgradeOpen(s, u) { return lotOf(u) <= lotsOpen(s); }
  function unlockedProducts(s) { return C.products.filter(function (p) { return isUnlocked(s, p); }); }

  function weekday(day) { return (day - 1) % 7; }
  function dayName(day) { return C.dayNames[weekday(day)]; }

  function capacity(s) { return C.baseCapacity + sumUp(s, 'capacity'); }
  function serveCap(s) { return C.baseServe + sumUp(s, 'serve'); }
  function closeHour(s) { return C.closeHour + sumUp(s, 'hours'); }
  // Rent starts discounted and steps up every C.rentRamp.every days (see config).
  function rentMult(day) { var R = C.rentRamp; return Math.min(1, R.start + R.step * Math.floor((day - 1) / R.every)); }
  function rentToday(s) { return round2((C.rent + sumUp(s, 'rent')) * rentMult(s.day)); }
  function dailyCosts(s) { return round2(rentToday(s) + sumUp(s, 'upkeep')); }

  // Which kind of customer walks in, given today's reputation.
  function pickTier(rep, r) {
    var T = C.tiers;
    if (rep >= T.unique.rep && r < T.unique.chance) return 'unique';
    if (rep >= T.rare.rep && r < T.unique.chance + T.rare.chance) return 'rare';
    return 'common';
  }

  function totalUnits(obj) {
    return Object.keys(obj).reduce(function (t, k) { return t + (obj[k] || 0); }, 0);
  }

  function pickWeighted(items, weightFn) {
    var weights = items.map(weightFn);
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var r = rnd() * total;
    for (var i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  // ---------- Kad TCG ----------
  // A new set comes out every C.tcg.every days (day 1, 15, 29...). hype(s) is 1 on release day and
  // fades each day after; tcgRelease(s) is true on the day a new set comes out.
  function tcgDays(s) { return (s.day - 1) % C.tcg.every; }
  function tcgRelease(s) { return tcgDays(s) === 0; }
  function hype(s) { return Math.pow(C.tcg.fade, tcgDays(s)); }
  function tcgOn(s) { return isUnlocked(s, product('tcg')); }

  // ---------- Bank ----------
  // Savings earn rates[level] of the balance every night. Deposits and withdrawals happen in the morning.
  function bank(s) { return s.bank = s.bank || { balance: 0, level: 0, earned: 0 }; }
  function bankRate(s) { return C.bank.rates[bank(s).level]; }
  function bankNextPrice(s) { return C.bank.upgrades[bank(s).level] || null; }
  // Cash that can go to the bank: keep enough for the stock already on today's order.
  function bankFree(s) { return Math.max(0, round2(s.cash - orderCost(s))); }
  function deposit(s, amt) {
    amt = round2(Math.min(amt, bankFree(s)));
    if (amt <= 0) return 0;
    s.cash = round2(s.cash - amt); bank(s).balance = round2(bank(s).balance + amt);
    return amt;
  }
  function withdraw(s, amt) {
    amt = round2(Math.min(amt, bank(s).balance));
    if (amt <= 0) return 0;
    bank(s).balance = round2(bank(s).balance - amt); s.cash = round2(s.cash + amt);
    return amt;
  }
  function bankUpgrade(s) {
    var price = bankNextPrice(s);
    if (price == null || s.cash < price) return false;
    s.cash = round2(s.cash - price); bank(s).level++;
    return true;
  }

  function event(s) { return s.forecast && s.forecast.event ? C.events[s.forecast.event] : null; }

  // Wholesale price today (promo events make stock cheaper).
  function buyCost(s, p) {
    var ev = event(s);
    return round2(p.cost * (ev && ev.costMult ? ev.costMult : 1));
  }

  function makeForecast(day) {
    var w = pickWeighted(C.weatherOrder, function (id) { return C.weathers[id].chance; });
    var ev = null;
    if (day % C.paydayEvery === C.paydayOn) ev = 'gaji';
    else if (day > 2 && rnd() < C.eventChance) ev = C.randomEvents[Math.floor(rnd() * C.randomEvents.length)];
    return { weather: w, event: ev };
  }

  function actualWeather(forecastId) {
    if (rnd() < C.forecastAccuracy) return forecastId;
    var i = C.weatherOrder.indexOf(forecastId);
    var j = clamp(i + (rnd() < 0.5 ? -1 : 1), 0, C.weatherOrder.length - 1);
    return C.weatherOrder[j];
  }

  function orderCost(s) {
    return round2(C.products.reduce(function (t, p) { return t + (s.order[p.id] || 0) * buyCost(s, p); }, 0));
  }

  // Can the player add `qty` units of product `id` to today's order?
  function canOrder(s, id, qty) {
    var p = product(id);
    if (!isUnlocked(s, p)) return false;
    if (qty < 0) return (s.order[id] || 0) + qty >= 0;
    if (totalUnits(s.stock) + totalUnits(s.order) + qty > capacity(s)) return false;
    return orderCost(s) + qty * buyCost(s, p) <= s.cash + 1e-9;
  }

  // Every normal (not hidden) upgrade bought at its top level.
  function allUpgradesOwned(s) {
    return C.upgrades.every(function (u) { return u.hidden || level(s, u.id) >= u.levels.length; });
  }
  // Hidden upgrades (the store manager) only appear once everything else is bought.
  function upgradeVisible(s, u) { return !u.hidden || allUpgradesOwned(s) || !!level(s, u.id); }

  // Store manager's morning order: yesterday's sales plus what ran out, +10%, minus stock on hand.
  function autoOrder(s) {
    unlockedProducts(s).forEach(function (p) {
      var d = s.lastDemand && s.lastDemand[p.id], want = d ? Math.ceil((d.sold + d.out * C.buyQty) * 1.1) + 2 : 10;
      s.order[p.id] = 0;
      for (var i = 0; i < want - s.stock[p.id] && canOrder(s, p.id, 1); i++) s.order[p.id]++;
    });
  }
  // Time to celebrate: cash + savings reached C.expandAt (once per game).
  function canExpand(s) { return !s.celebrated && s.cash + bank(s).balance >= C.expandAt; }

  function buyUpgrade(s, id) {
    var u = upgrade(id), next = u && nextLevel(s, id);
    if (!next || s.cash < next.price || !upgradeOpen(s, u) || !upgradeVisible(s, u)) return false;
    s.cash = round2(s.cash - next.price);
    s.upgrades[id] = level(s, id) + 1;
    return true;
  }

  // Start a new day (called on first load and after each report).
  function startDay(s) {
    if (!s.forecast) s.forecast = makeForecast(s.day);
    C.products.forEach(function (p) { s.order[p.id] = 0; });
  }

  // A day runs in three steps so the player can restock while the shop is open:
  //   openDay   pays for the order, decides who will come and what they want (s.today)
  //   serveNext each customer buys (or not) when they arrive, from the stock at that moment
  //   closeDay  serves anyone left, then overnight spoilage, bills and the report
  // Everything lives in s.today, so a half-played day survives a reload.
  function openDay(s) {
    var weather = actualWeather(s.forecast.weather);
    var ev = event(s) || {};
    var W = C.weathers[weather];

    var stockSpend = orderCost(s);
    if (totalUnits(s.order)) s.lastOrder = Object.assign({}, s.order);   // for "repeat yesterday's order"
    s.cash = round2(s.cash - stockSpend);
    C.products.forEach(function (p) { if (s.order[p.id]) addStock(s, p.id, s.order[p.id]); s.order[p.id] = 0; });

    var R = C.trafficRep;
    var traffic = C.baseTraffic * C.dayTraffic[weekday(s.day)] * W.traffic *
      (R.min + R.scale * Math.pow(s.rep / 100, R.power)) * (1 + sumUp(s, 'traffic')) * (ev.traffic || 1);
    var visitors = Math.max(0, Math.round(traffic * (0.9 + rnd() * 0.2)));
    var willingMult = (1 + sumUp(s, 'willing')) * (ev.willing || 1);
    var cap = serveCap(s);
    var available = unlockedProducts(s);

    var perProduct = {};
    C.products.forEach(function (p) { perProduct[p.id] = { sold: 0, revenue: 0, pricey: 0, out: 0 }; });
    // Who comes today: passers-by from the taman, factory workers on weekdays (lunch break and
    // the end of the shift), and the regulars. Factory hours are turned into a 0..1 day time.
    var hours = closeHour(s) - C.openHour;
    function at(h) { return clamp((h - C.openHour) / hours, 0, 0.999); }
    var people = [];
    for (var i = 0; i < visitors; i++) people.push({ t: clamp((i + rnd()) / Math.max(visitors, 1), 0, 0.999) });
    var F = C.factory, factoryDay = F.days.indexOf(weekday(s.day)) >= 0;
    if (factoryDay) [F.lunch, F.shift].forEach(function (w) {
      var n = w.min + Math.floor(rnd() * (w.max - w.min + 1));
      for (var j = 0; j < n; j++) people.push({ t: at(w.from + rnd() * (w.to - w.from)), from: 'kilang', back: !!w.back });
    });
    people.sort(function (x, y) { return x.t - y.t; });

    function wantsFor(multi, n) {
      var out = [];
      for (var k = 0; k < n; k++) {
        var p = pickWeighted(available, function (x) {
          var tcgMult = x.id === 'tcg' ? (1 + 2 * hype(s)) * (weekday(s.day) >= 5 ? C.tcg.weekend : 1) : 1;
          return x.demand * x.weather[weather] * ((ev.boost && ev.boost[x.id]) || 1) * tcgMult;
        });
        var w = p.ref * (0.8 + rnd() * 0.6) * willingMult;
        if (p.id === 'tcg') w *= 1 + C.tcg.willing * hype(s);      // hyped sets: collectors pay more
        out.push({ id: p.id, qty: multi * C.buyQty, willing: w });
      }
      return out;
    }
    var timeline = [];
    people.forEach(function (e, idx) {
      e.tier = e.from ? 'common' : pickTier(s.rep, rnd());   // factory workers are ordinary customers
      if (idx >= cap) { e.queue = true; timeline.push(e); return; }   // the line was too long, they walk off
      var T = C.tiers[e.tier];
      e.multi = rnd() < T.multiChance ? T.multi : 1;
      e.wants = wantsFor(e.multi, rnd() < 0.35 ? 2 : 1);
      timeline.push(e);
    });
    // Regulars come most days for their favourite item, and are always let in.
    regulars(s).forEach(function (r) {
      var st = s.regulars[r.id];
      if (st.away || !isUnlocked(s, product(r.item)) || rnd() > C.regularRules.visitChance) return;
      timeline.push({ t: at(r.hour + rnd() * 1.5), tier: 'common', regular: r.id, multi: 1,
        wants: [{ id: r.item, qty: (rnd() < 0.3 ? 2 : 1) * C.buyQty, willing: product(r.item).ref * 1.3 * willingMult }] });
    });
    // Card collectors: they line up for booster packs when a new TCG set is out (fewer as the hype fades).
    var collectors = 0;
    if (tcgOn(s)) {
      collectors = Math.round(C.tcg.collectors * hype(s) * (weekday(s.day) >= 5 ? C.tcg.weekend : 1) * (0.8 + rnd() * 0.4));
      var tcg = product('tcg');
      for (var c = 0; c < collectors; c++) {
        timeline.push({ t: rnd() * 0.999, tier: 'common', collector: true, multi: 1,
          wants: [{ id: 'tcg', qty: 1 + Math.floor(rnd() * 3), willing: tcg.ref * (1.1 + rnd() * 0.4) * (1 + C.tcg.willing * hype(s)) * willingMult }] });
      }
    }
    timeline.sort(function (x, y) { return x.t - y.t; });
    visitors = timeline.length;

    s.today = {
      weather: weather, visitors: visitors, timeline: timeline, next: 0,
      served: 0, queueLost: 0, collectors: collectors, tcgRelease: tcgOn(s) && tcgRelease(s), revenue: 0, tiers: { common: 0, rare: 0, unique: 0 }, multiBuys: 0, regulars: [], factoryDay: factoryDay, rent: rentToday(s), repDelta: 0, stockSpend: stockSpend, midSpend: 0,
      perProduct: perProduct
    };
    return s.today;
  }

  // Serve the next customer in the timeline; returns their entry with bought/complaint filled in.
  function serveNext(s) {
    var d = s.today, e = d.timeline[d.next++];
    if (!d.tiers) { d.tiers = { common: 0, rare: 0, unique: 0 }; d.multiBuys = 0; }   // a day started before tiers existed
    if (!e) return null;
    e.bought = [];
    if (e.queue) {
      d.queueLost++; d.repDelta -= 0.4; e.complaint = { type: 'queue' };
      return e;
    }
    d.served++;
    d.tiers[e.tier || 'common']++;
    var complaint = null;
    e.wants.forEach(function (w) {
      var price = s.prices[w.id], st = d.perProduct[w.id];
      if (s.stock[w.id] <= 0) {
        st.out++; d.repDelta -= 0.5; complaint = complaint || { type: 'out', id: w.id };
      } else if (price > w.willing) {
        st.pricey++; d.repDelta -= 0.25; complaint = complaint || { type: 'pricey', id: w.id };
      } else {
        var q = Math.min(w.qty || 1, s.stock[w.id]);        // big spenders take what's left if stock runs short
        for (var k = 0; k < q; k++) { takeStock(s, w.id); e.bought.push(w.id); }
        st.sold += q; st.revenue = round2(st.revenue + price * q);
        d.revenue = round2(d.revenue + price * q); s.cash = round2(s.cash + price * q);
        d.repDelta += price <= product(w.id).ref ? 0.25 : 0.08;
      }
    });
    e.complaint = e.bought.length ? null : complaint;
    if (e.regular) regularVisit(s, d, e);
    if (e.multi > 1 && e.bought.length > e.wants.length * C.buyQty) d.multiBuys++;
    return e;
  }

  // ---------- Regulars ----------
  // Named customers who come most days for one item. Each has hearts: a good visit adds one,
  // a sold-out item takes two, a high price takes one. At zero they sulk (merajuk) and stay away
  // for a week, then come back with two hearts. New regulars turn up as reputation grows.
  function regulars(s) {
    s.regulars = s.regulars || {};
    return C.regulars.filter(function (r) {
      if (!s.regulars[r.id] && s.rep >= r.rep) s.regulars[r.id] = { hearts: C.regularRules.startHearts, away: 0, visits: 0 };
      return !!s.regulars[r.id];
    });
  }
  function regular(id) { return C.regulars.find(function (r) { return r.id === id; }); }
  function regularVisit(s, d, e) {
    var R = C.regularRules, st = s.regulars[e.regular], before = st.hearts;
    st.visits++;
    if (e.bought.length) { st.hearts = Math.min(R.maxHearts, st.hearts + 1); d.repDelta += R.repBonus; }
    else st.hearts -= e.complaint && e.complaint.type === 'out' ? 2 : 1;
    var gone = st.hearts <= 0;
    if (gone) { st.hearts = 0; st.away = R.awayDays; d.repDelta -= 1; }
    d.regulars = d.regulars || [];
    d.regulars.push({ id: e.regular, ok: !!e.bought.length, why: e.complaint && e.complaint.type, hearts: st.hearts, change: st.hearts - before, gone: gone });
  }
  // Overnight: regulars who are away count down, then come back.
  function regularsNight(s) {
    Object.keys(s.regulars || {}).forEach(function (id) {
      var st = s.regulars[id];
      if (st.away && --st.away === 0) st.hearts = 2;
    });
  }

  // Fill today's order with yesterday's (as much as cash and shelf space allow).
  function repeatOrder(s) {
    var last = s.lastOrder || {}, any = false;
    C.products.forEach(function (p) {
      s.order[p.id] = 0;
      for (var i = 0; i < (last[p.id] || 0) && canOrder(s, p.id, 1); i++) { s.order[p.id]++; any = true; }
    });
    return any;
  }

  // Mid-day restock: wholesale price plus a markup, paid now, on the shelf straight away.
  function restockCost(id, qty) { return round2(product(id).cost * (1 + C.midRestockMarkup) * qty); }
  function canRestock(s, id, qty) {
    return s.cash >= restockCost(id, qty) && totalUnits(s.stock) + qty <= capacity(s) && isUnlocked(s, product(id));
  }
  function restock(s, id, qty) {
    if (!s.today || !canRestock(s, id, qty)) return false;
    var cost = restockCost(id, qty);
    s.cash = round2(s.cash - cost); addStock(s, id, qty);
    s.today.midSpend = round2(s.today.midSpend + cost);
    return true;
  }

  function closeDay(s) {
    var d = s.today;
    while (d.next < d.timeline.length) serveNext(s);

    var perishMult = ownedLevels(s).reduce(function (m, l) { return m * (l.perishMult || 1); }, 1);
    var spoiled = {}, spoiledValue = 0;
    C.products.forEach(function (p) {
      var lost = Math.floor(s.stock[p.id] * p.perish * perishMult);
      if (p.expiry && s.stock[p.id]) {                     // out-of-date batches are thrown away
        batches(s, p.id).filter(function (b) { return s.day - b.day >= p.expiry - 1; }).forEach(function (b) { lost += b.qty; });
        s.batches[p.id] = s.batches[p.id].filter(function (b) { return s.day - b.day < p.expiry - 1; });
      }
      if (lost > 0) { spoiled[p.id] = lost; s.stock[p.id] -= lost; spoiledValue += lost * p.cost; }
    });
    var bills = dailyCosts(s);
    s.cash = round2(s.cash - bills);

    // Mesin capit: some of today's visitors have a go; prizes cost part of the takings.
    var claw = null;
    if (sumUp(s, 'claw')) {
      var plays = Math.round(d.visitors * C.claw.playRate * (0.8 + rnd() * 0.4));
      var take = round2(plays * C.claw.price);
      claw = { plays: plays, take: take, net: round2(take * (1 - C.claw.prizeCost)) };
      s.cash = round2(s.cash + claw.net);
    }
    // Bank: tonight's return on the savings balance (added to the balance, so it compounds).
    var B = bank(s), interest = round2(B.balance * bankRate(s));
    B.balance = round2(B.balance + interest); B.earned = round2((B.earned || 0) + interest);

    var repBefore = s.rep;
    s.rep = Math.round(clamp(s.rep + clamp(d.repDelta, -8, 8), 0, 100));
    var profit = round2(d.revenue - d.stockSpend - d.midSpend - bills + (claw ? claw.net : 0));

    s.stats.totalProfit = round2(s.stats.totalProfit + profit);
    s.stats.bestDay = Math.max(s.stats.bestDay, profit);
    s.stats.customers += d.served;
    var tiers = s.stats.tiers = s.stats.tiers || { common: 0, rare: 0, unique: 0 };
    Object.keys(d.tiers).forEach(function (k) { tiers[k] = (tiers[k] || 0) + d.tiers[k]; });
    s.stats.multiBuys = (s.stats.multiBuys || 0) + d.multiBuys;
    s.stats.turnedAway = (s.stats.turnedAway || 0) + d.queueLost;
    s.stats.revenue = round2((s.stats.revenue || 0) + d.revenue);
    regularsNight(s);
    s.lastDemand = {};
    C.products.forEach(function (p) { var st = d.perProduct[p.id]; s.lastDemand[p.id] = { sold: st.sold, out: st.out, pricey: st.pricey }; });
    s.stats.lastDay = { served: d.served, tiers: d.tiers, multiBuys: d.multiBuys, queueLost: d.queueLost };
    s.stats.streak = profit > 0 ? s.stats.streak + 1 : 0;
    s.history.push(profit);
    if (s.history.length > 14) s.history.shift();

    var report = {
      day: s.day, dayName: dayName(s.day),
      forecast: s.forecast.weather, weather: d.weather, event: s.forecast.event,
      visitors: d.visitors, served: d.served, regulars: d.regulars || [], factoryDay: d.factoryDay, queueLost: d.queueLost, tiers: d.tiers, multiBuys: d.multiBuys,
      revenue: d.revenue, stockSpend: d.stockSpend, midSpend: d.midSpend, bills: bills, profit: profit,
      spoiled: spoiled, spoiledValue: round2(spoiledValue), claw: claw, collectors: d.collectors || 0, tcgRelease: !!d.tcgRelease,
      bankInterest: interest, bankRate: bankRate(s), bankBalance: B.balance,
      perProduct: d.perProduct, repBefore: repBefore, repAfter: s.rep, cash: s.cash
    };
    report.milestones = checkMilestones(s, report);
    report.cash = s.cash;
    report.value = shopValue(s);
    s.today = null;
    s.lastReport = report;
    return report;
  }

  // Whole day in one go (used by tests and balance scripts).
  function runDay(s) { openDay(s); return closeDay(s); }

  // Shop value = cash + unsold stock at wholesale cost + upgrades at what they cost.
  function shopValue(s) {
    var stock = C.products.reduce(function (t, p) { return t + s.stock[p.id] * p.cost; }, 0);
    var ups = ownedLevels(s).reduce(function (t, l) { return t + l.price; }, 0);
    return round2(s.cash + stock + ups + bank(s).balance);
  }

  function starsFor(value) {
    return C.starTargets.filter(function (t) { return value >= t; }).length;
  }

  function nextTarget(value) {
    return C.starTargets.find(function (t) { return value < t; }) || null;
  }

  // Award any milestones reached today; rewards are paid straight into cash.
  function checkMilestones(s, r) {
    var earned = [];
    C.milestones.forEach(function (m) {
      if (s.milestones[m.id] || !m.check(s, r)) return;
      s.milestones[m.id] = s.day;
      s.cash = round2(s.cash + m.reward);
      earned.push(m.id);
    });
    r.rewards = earned.reduce(function (t, id) {
      return t + C.milestones.find(function (m) { return m.id === id; }).reward;
    }, 0);
    return earned;
  }

  function seasonOver(s) { return !s.seasonDone && s.day > C.seasonDays; }

  function nextDay(s) {
    s.day++;
    s.forecast = null;
    s.lastReport = null;
    startDay(s);
  }

  // Broke: no cash to restock and nothing left on the shelves.
  function isBankrupt(s) {
    var cheapest = Math.min.apply(null, unlockedProducts(s).map(function (p) { return buyCost(s, p); }));
    return totalUnits(s.stock) === 0 && s.cash + bank(s).balance < cheapest;
  }

  return {
    allUpgradesOwned: allUpgradesOwned, upgradeVisible: upgradeVisible, autoOrder: autoOrder, canExpand: canExpand,
    product: product, upgrade: upgrade, isUnlocked: isUnlocked, lotsOpen: lotsOpen, lotOf: lotOf, upgradeOpen: upgradeOpen,
    tcgOn: tcgOn, tcgRelease: tcgRelease, tcgDays: tcgDays, hype: hype,
    bank: bank, bankRate: bankRate, bankNextPrice: bankNextPrice, bankFree: bankFree, deposit: deposit, withdraw: withdraw, bankUpgrade: bankUpgrade, unlockedProducts: unlockedProducts,
    dayName: dayName, weekday: weekday, regulars: regulars, regular: regular, repeatOrder: repeatOrder, rentMult: rentMult, rentToday: rentToday, pickTier: pickTier, capacity: capacity, serveCap: serveCap, closeHour: closeHour, openDay: openDay, serveNext: serveNext, closeDay: closeDay,
    restock: restock, restockCost: restockCost, canRestock: canRestock, dailyCosts: dailyCosts,
    totalUnits: totalUnits, buyCost: buyCost, orderCost: orderCost, canOrder: canOrder,
    buyUpgrade: buyUpgrade, level: level, nextLevel: nextLevel, daysLeft: daysLeft, startDay: startDay, runDay: runDay, nextDay: nextDay,
    isBankrupt: isBankrupt, round2: round2, shopValue: shopValue, starsFor: starsFor,
    nextTarget: nextTarget, seasonOver: seasonOver
  };
})();
