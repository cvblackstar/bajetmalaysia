// Pure game rules. No DOM here, so it can be tested or run on a server later.
window.KR = window.KR || {};

KR.sim = (function () {
  var C = KR.config;
  var rnd = Math.random;

  function round2(n) { return Math.round(n * 100) / 100; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function product(id) { return C.products.find(function (p) { return p.id === id; }); }
  function upgrade(id) { return C.upgrades.find(function (u) { return u.id === id; }); }
  function owned(s) { return C.upgrades.filter(function (u) { return s.upgrades[u.id]; }); }
  function sumUp(s, key) { return owned(s).reduce(function (t, u) { return t + (u[key] || 0); }, 0); }

  function isUnlocked(s, p) { return !p.requires || !!s.upgrades[p.requires]; }
  function unlockedProducts(s) { return C.products.filter(function (p) { return isUnlocked(s, p); }); }

  function weekday(day) { return (day - 1) % 7; }
  function dayName(day) { return C.dayNames[weekday(day)]; }

  function capacity(s) { return C.baseCapacity + sumUp(s, 'capacity'); }
  function serveCap(s) { return C.baseServe + sumUp(s, 'serve'); }
  function closeHour(s) { return C.closeHour + sumUp(s, 'hours'); }
  function dailyCosts(s) { return C.rent + sumUp(s, 'upkeep'); }

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

  function buyUpgrade(s, id) {
    var u = upgrade(id);
    if (!u || s.upgrades[id] || s.cash < u.price) return false;
    s.cash = round2(s.cash - u.price);
    s.upgrades[id] = true;
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
    s.cash = round2(s.cash - stockSpend);
    C.products.forEach(function (p) { s.stock[p.id] += s.order[p.id] || 0; s.order[p.id] = 0; });

    var traffic = C.baseTraffic * C.dayTraffic[weekday(s.day)] * W.traffic *
      (0.5 + s.rep / 100) * (1 + sumUp(s, 'traffic')) * (ev.traffic || 1);
    var visitors = Math.max(0, Math.round(traffic * (0.9 + rnd() * 0.2)));
    var willingMult = (1 + sumUp(s, 'willing')) * (ev.willing || 1);
    var cap = serveCap(s);
    var available = unlockedProducts(s);

    var perProduct = {};
    C.products.forEach(function (p) { perProduct[p.id] = { sold: 0, revenue: 0, pricey: 0, out: 0 }; });
    var timeline = [];
    for (var i = 0; i < visitors; i++) {
      var t = clamp((i + rnd()) / Math.max(visitors, 1), 0, 0.999);
      if (i >= cap) { timeline.push({ t: t, queue: true }); continue; }
      var wants = [], n = rnd() < 0.35 ? 2 : 1;
      for (var k = 0; k < n; k++) {
        var p = pickWeighted(available, function (x) {
          return x.demand * x.weather[weather] * ((ev.boost && ev.boost[x.id]) || 1);
        });
        wants.push({ id: p.id, willing: p.ref * (0.8 + rnd() * 0.6) * willingMult });
      }
      timeline.push({ t: t, wants: wants });
    }
    // The ones turned away by the queue are spread over the day too.
    timeline.sort(function (x, y) { return x.t - y.t; });

    s.today = {
      weather: weather, visitors: visitors, timeline: timeline, next: 0,
      served: 0, queueLost: 0, revenue: 0, repDelta: 0, stockSpend: stockSpend, midSpend: 0,
      perProduct: perProduct
    };
    return s.today;
  }

  // Serve the next customer in the timeline; returns their entry with bought/complaint filled in.
  function serveNext(s) {
    var d = s.today, e = d.timeline[d.next++];
    if (!e) return null;
    e.bought = [];
    if (e.queue) {
      d.queueLost++; d.repDelta -= 0.4; e.complaint = { type: 'queue' };
      return e;
    }
    d.served++;
    var complaint = null;
    e.wants.forEach(function (w) {
      var price = s.prices[w.id], st = d.perProduct[w.id];
      if (s.stock[w.id] <= 0) {
        st.out++; d.repDelta -= 0.5; complaint = complaint || { type: 'out', id: w.id };
      } else if (price > w.willing) {
        st.pricey++; d.repDelta -= 0.25; complaint = complaint || { type: 'pricey', id: w.id };
      } else {
        s.stock[w.id]--; st.sold++; st.revenue = round2(st.revenue + price);
        d.revenue = round2(d.revenue + price); s.cash = round2(s.cash + price); e.bought.push(w.id);
        d.repDelta += price <= product(w.id).ref ? 0.25 : 0.08;
      }
    });
    e.complaint = e.bought.length ? null : complaint;
    return e;
  }

  // Mid-day restock: wholesale price plus a markup, paid now, on the shelf straight away.
  function restockCost(id, qty) { return round2(product(id).cost * (1 + C.midRestockMarkup) * qty); }
  function canRestock(s, id, qty) {
    return s.cash >= restockCost(id, qty) && totalUnits(s.stock) + qty <= capacity(s) && isUnlocked(s, product(id));
  }
  function restock(s, id, qty) {
    if (!s.today || !canRestock(s, id, qty)) return false;
    var cost = restockCost(id, qty);
    s.cash = round2(s.cash - cost); s.stock[id] += qty;
    s.today.midSpend = round2(s.today.midSpend + cost);
    return true;
  }

  function closeDay(s) {
    var d = s.today;
    while (d.next < d.timeline.length) serveNext(s);

    var perishMult = owned(s).reduce(function (m, u) { return m * (u.perishMult || 1); }, 1);
    var spoiled = {}, spoiledValue = 0;
    C.products.forEach(function (p) {
      var lost = Math.floor(s.stock[p.id] * p.perish * perishMult);
      if (lost > 0) { spoiled[p.id] = lost; s.stock[p.id] -= lost; spoiledValue += lost * p.cost; }
    });
    var bills = dailyCosts(s);
    s.cash = round2(s.cash - bills);

    var repBefore = s.rep;
    s.rep = Math.round(clamp(s.rep + clamp(d.repDelta, -8, 8), 0, 100));
    var profit = round2(d.revenue - d.stockSpend - d.midSpend - bills);

    s.stats.totalProfit = round2(s.stats.totalProfit + profit);
    s.stats.bestDay = Math.max(s.stats.bestDay, profit);
    s.stats.customers += d.served;
    s.stats.streak = profit > 0 ? s.stats.streak + 1 : 0;
    s.history.push(profit);
    if (s.history.length > 14) s.history.shift();

    var report = {
      day: s.day, dayName: dayName(s.day),
      forecast: s.forecast.weather, weather: d.weather, event: s.forecast.event,
      visitors: d.visitors, served: d.served, queueLost: d.queueLost,
      revenue: d.revenue, stockSpend: d.stockSpend, midSpend: d.midSpend, bills: bills, profit: profit,
      spoiled: spoiled, spoiledValue: round2(spoiledValue),
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
    var ups = owned(s).reduce(function (t, u) { return t + u.price; }, 0);
    return round2(s.cash + stock + ups);
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
    return totalUnits(s.stock) === 0 && s.cash < cheapest;
  }

  return {
    product: product, upgrade: upgrade, isUnlocked: isUnlocked, unlockedProducts: unlockedProducts,
    dayName: dayName, capacity: capacity, serveCap: serveCap, closeHour: closeHour, openDay: openDay, serveNext: serveNext, closeDay: closeDay,
    restock: restock, restockCost: restockCost, canRestock: canRestock, dailyCosts: dailyCosts,
    totalUnits: totalUnits, buyCost: buyCost, orderCost: orderCost, canOrder: canOrder,
    buyUpgrade: buyUpgrade, startDay: startDay, runDay: runDay, nextDay: nextDay,
    isBankrupt: isBankrupt, round2: round2, shopValue: shopValue, starsFor: starsFor,
    nextTarget: nextTarget, seasonOver: seasonOver
  };
})();
