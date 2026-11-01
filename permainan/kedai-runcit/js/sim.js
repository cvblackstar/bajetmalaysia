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

  // Simulates the whole day at once and applies it to the state.
  // Returns a report plus a timeline of customer visits for the UI to animate.
  function runDay(s) {
    var weather = actualWeather(s.forecast.weather);
    var ev = event(s) || {};
    var W = C.weathers[weather];

    // 1. Pay for today's order and move it into stock.
    var stockSpend = orderCost(s);
    s.cash = round2(s.cash - stockSpend);
    C.products.forEach(function (p) { s.stock[p.id] += s.order[p.id] || 0; s.order[p.id] = 0; });

    // 2. How many people come by today.
    var traffic = C.baseTraffic * C.dayTraffic[weekday(s.day)] * W.traffic *
      (0.5 + s.rep / 100) * (1 + sumUp(s, 'traffic')) * (ev.traffic || 1);
    var visitors = Math.max(0, Math.round(traffic * (0.9 + rnd() * 0.2)));
    var willingMult = (1 + sumUp(s, 'willing')) * (ev.willing || 1);
    var cap = serveCap(s);
    var available = unlockedProducts(s);

    var perProduct = {};
    C.products.forEach(function (p) { perProduct[p.id] = { sold: 0, revenue: 0, pricey: 0, out: 0 }; });
    var timeline = [], revenue = 0, served = 0, queueLost = 0, repDelta = 0;

    for (var i = 0; i < visitors; i++) {
      var t = clamp((i + rnd()) / Math.max(visitors, 1), 0, 0.999);
      if (served >= cap) {
        queueLost++; repDelta -= 0.4;
        timeline.push({ t: t, bought: [], complaint: { type: 'queue' } });
        continue;
      }
      served++;
      var wants = rnd() < 0.35 ? 2 : 1, bought = [], complaint = null;
      for (var k = 0; k < wants; k++) {
        var p = pickWeighted(available, function (x) {
          return x.demand * x.weather[weather] * ((ev.boost && ev.boost[x.id]) || 1);
        });
        var price = s.prices[p.id];
        var willing = p.ref * (0.8 + rnd() * 0.6) * willingMult;
        var st = perProduct[p.id];
        if (s.stock[p.id] <= 0) {
          st.out++; repDelta -= 0.5; complaint = complaint || { type: 'out', id: p.id };
        } else if (price > willing) {
          st.pricey++; repDelta -= 0.25; complaint = complaint || { type: 'pricey', id: p.id };
        } else {
          s.stock[p.id]--; st.sold++; st.revenue = round2(st.revenue + price);
          revenue += price; bought.push(p.id);
          repDelta += price <= p.ref ? 0.25 : 0.08;
        }
      }
      timeline.push({ t: t, bought: bought, complaint: bought.length ? null : complaint });
    }
    revenue = round2(revenue);

    // 3. Overnight: perishables spoil, bills are paid.
    var perishMult = owned(s).reduce(function (m, u) { return m * (u.perishMult || 1); }, 1);
    var spoiled = {}, spoiledValue = 0;
    C.products.forEach(function (p) {
      var lost = Math.floor(s.stock[p.id] * p.perish * perishMult);
      if (lost > 0) { spoiled[p.id] = lost; s.stock[p.id] -= lost; spoiledValue += lost * p.cost; }
    });
    var bills = dailyCosts(s);
    s.cash = round2(s.cash + revenue - bills);

    var repBefore = s.rep;
    s.rep = Math.round(clamp(s.rep + clamp(repDelta, -8, 8), 0, 100));
    var profit = round2(revenue - stockSpend - bills);

    s.stats.totalProfit = round2(s.stats.totalProfit + profit);
    s.stats.bestDay = Math.max(s.stats.bestDay, profit);
    s.stats.customers += served;
    s.stats.streak = profit > 0 ? s.stats.streak + 1 : 0;
    s.history.push(profit);
    if (s.history.length > 14) s.history.shift();

    var report = {
      day: s.day, dayName: dayName(s.day),
      forecast: s.forecast.weather, weather: weather, event: s.forecast.event,
      visitors: visitors, served: served, queueLost: queueLost,
      revenue: revenue, stockSpend: stockSpend, bills: bills, profit: profit,
      spoiled: spoiled, spoiledValue: round2(spoiledValue),
      perProduct: perProduct, repBefore: repBefore, repAfter: s.rep, cash: s.cash
    };
    report.milestones = checkMilestones(s, report);
    report.cash = s.cash;
    report.value = shopValue(s);
    s.lastReport = report;
    return { report: report, timeline: timeline };
  }

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
    dayName: dayName, capacity: capacity, serveCap: serveCap, dailyCosts: dailyCosts,
    totalUnits: totalUnits, buyCost: buyCost, orderCost: orderCost, canOrder: canOrder,
    buyUpgrade: buyUpgrade, startDay: startDay, runDay: runDay, nextDay: nextDay,
    isBankrupt: isBankrupt, round2: round2, shopValue: shopValue, starsFor: starsFor,
    nextTarget: nextTarget, seasonOver: seasonOver
  };
})();
