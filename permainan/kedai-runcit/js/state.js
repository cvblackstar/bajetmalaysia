// Save data: creating, loading, migrating and saving the game state.
window.KR = window.KR || {};

KR.state = (function () {
  var C = KR.config;

  function fresh() {
    var prices = {}, stock = {}, order = {};
    C.products.forEach(function (p) { prices[p.id] = p.ref; stock[p.id] = 0; order[p.id] = 0; });
    return {
      version: C.version,
      shopName: 'Kedai Runcit Bajet',
      day: 1,
      cash: C.startCash,
      rep: C.startRep,
      stock: stock,
      prices: prices,
      order: order,
      upgrades: {},
      forecast: null,
      stats: { totalProfit: 0, bestDay: 0, customers: 0, streak: 0, revenue: 0,
               tiers: { common: 0, rare: 0, unique: 0 }, multiBuys: 0, turnedAway: 0 },
      milestones: {},
      seasonDone: false,
      history: [],
      lastReport: null,
      batches: {},
      regulars: {},        // regulars' hearts (see sim.regulars)
      bank: { balance: 0, level: 0, earned: 0 },   // savings (see sim bank)
      lastOrder: null,     // yesterday's morning order, for "repeat order"
      lastDemand: null,    // yesterday's sold / ran out / too pricey per product         // dated stock for products that expire
      today: null,         // a day in progress (see sim.openDay)
      managerOn: true,     // the store manager runs the day (once hired)
      celebrated: false,   // the RM7,500 celebration has been shown
      seenIntro: false
    };
  }

  // Fill in any fields missing from an older save so new products/upgrades don't break it.
  function migrate(saved) {
    var base = fresh();
    if (!saved || typeof saved !== 'object') return base;
    var s = Object.assign(base, saved);
    ['stock', 'prices', 'order'].forEach(function (k) {
      s[k] = Object.assign(fresh()[k], saved[k] || {});
    });
    s.stats = Object.assign(fresh().stats, saved.stats || {});
    s.stats.tiers = Object.assign(fresh().stats.tiers, (saved.stats && saved.stats.tiers) || {});
    s.milestones = Object.assign({}, saved.milestones || {});
    s.bank = Object.assign(fresh().bank, saved.bank || {});
    s.version = C.version;
    return s;
  }

  function load() { return migrate(KR.platform.storage.load(C.saveKey)); }
  function save(s) { return KR.platform.storage.save(C.saveKey, s); }
  function reset() { KR.platform.storage.remove(C.saveKey); return fresh(); }

  // Best season result survives "Mula semula" so players can try to beat it.
  function loadBest() { return KR.platform.storage.load(C.bestKey) || { value: 0, stars: 0 }; }
  function saveBest(b) { return KR.platform.storage.save(C.bestKey, b); }

  return { fresh: fresh, load: load, save: save, reset: reset, loadBest: loadBest, saveBest: saveBest };
})();
