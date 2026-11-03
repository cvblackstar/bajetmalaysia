// Kedai Runcit Tycoon: all tunable game data lives here.
// Balance changes should only need edits in this file.
window.KR = window.KR || {};

KR.config = {
  version: 1,
  saveKey: 'kedaiRuncit.save.v1',
  startCash: 200,
  startRep: 50,
  baseCapacity: 150,     // max units of stock in the shop
  baseTraffic: 60,       // customers on a normal weekday, scaled by reputation (see trafficRep)
  // Reputation -> share of baseTraffic: a new shop (rep 50) gets about 60%, a famous one (rep 100)
  // gets 1.5x, which is more than one person can serve, so long queues pull reputation back down.
  trafficRep: { min: 0.3, scale: 1.2, power: 2 },
  baseServe: 70,         // customers the owner alone can serve per day
  rent: 15,              // RM per day at full price
  // New shops get cheap rent: 60% for the first 30 days, then +20% every 30 days, up to 100%.
  // Applies to the shop's rent and the rent of any extra lots (levels with a 'rent' field).
  rentRamp: { start: 0.6, step: 0.2, every: 30 },
  // Customer tiers. Rare ones (doctors) only come at reputation 80+, unique ones (kimono) at 95+.
  // multiChance = chance they buy multi times what they planned (common 2x, rare 2x, unique 3x).
  tiers: {
    common: { multi: 2, multiChance: 0.08 },
    rare:   { rep: 80, chance: 0.08, multi: 2, multiChance: 0.6 },
    unique: { rep: 95, chance: 0.03, multi: 3, multiChance: 0.6 }
  },
  eventChance: 0.2,
  paydayEvery: 30,
  paydayOn: 25,
  midRestockMarkup: 0.1, // restocking while the shop is open costs 10% more than the morning order
  hourMs: 4000,          // playback length of one opening hour at x1 speed
  openHour: 8,           // 8 pagi
  closeHour: 20,         // 8 malam (the 'lewat' upgrade adds hours)
  bestKey: 'kedaiRuncit.best.v1',

  // Season goal: shop value (cash + stock at cost + upgrades at price) after seasonDays.
  seasonDays: 90,
  starTargets: [3000, 7000, 12000],

  dayNames: ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'],
  dayTraffic: [1, 0.95, 1, 1.05, 1.15, 1.3, 1.25],

  // order matters: actual weather can drift one step from the forecast
  weatherOrder: ['panas', 'cerah', 'mendung', 'hujan', 'ribut'],
  weathers: {
    panas:   { name: 'Panas terik', icon: '☀️', traffic: 0.95, chance: 0.25 },
    cerah:   { name: 'Cerah',       icon: '🌤️', traffic: 1.1,  chance: 0.3 },
    mendung: { name: 'Mendung',     icon: '☁️', traffic: 1.0,  chance: 0.2 },
    hujan:   { name: 'Hujan',       icon: '🌧️', traffic: 0.75, chance: 0.18 },
    ribut:   { name: 'Ribut petir', icon: '⛈️', traffic: 0.5,  chance: 0.07 }
  },
  forecastAccuracy: 0.75,

  // cost = wholesale per unit, ref = price most customers think is fair
  // demand = base pick weight, perish = share of leftover stock lost overnight
  // weather = demand multiplier per weather, requires = upgrade id to unlock
  products: [
    { id: 'air',     name: 'Air Mineral', icon: '💧', cost: 0.6, ref: 1.2,  demand: 1.0,  perish: 0,
      weather: { panas: 1.9, cerah: 1.3, mendung: 1.0, hujan: 0.7, ribut: 0.6 } },
    { id: 'roti',    name: 'Roti',        icon: '🍞', cost: 2.0, ref: 3.5,  demand: 0.9,  perish: 0.35,
      weather: { panas: 0.9, cerah: 1.0, mendung: 1.0, hujan: 1.1, ribut: 1.2 } },
    { id: 'maggi',   name: 'Mi Segera',   icon: '🍜', cost: 0.7, ref: 1.3,  demand: 0.9,  perish: 0,
      weather: { panas: 0.6, cerah: 0.9, mendung: 1.2, hujan: 1.7, ribut: 2.0 } },
    { id: 'telur',   name: 'Telur (10)',  icon: '🥚', cost: 3.5, ref: 5.5,  demand: 0.6,  perish: 0.05,
      weather: { panas: 1, cerah: 1, mendung: 1, hujan: 1, ribut: 1 } },
    { id: 'aiskrim', name: 'Ais Krim',    icon: '🍦', cost: 1.0, ref: 2.5,  demand: 0.8,  perish: 0.03, requires: 'peti',
      weather: { panas: 2.4, cerah: 1.5, mendung: 0.9, hujan: 0.4, ribut: 0.3 } },
    { id: 'payung',  name: 'Payung',      icon: '☂️', cost: 6.0, ref: 12.0, demand: 0.12, perish: 0, requires: 'rak',
      weather: { panas: 0.2, cerah: 0.3, mendung: 0.8, hujan: 6, ribut: 8 } },
    { id: 'cokelat', name: 'Cokelat',     icon: '🍫', cost: 1.5, ref: 3.0,  demand: 0.5,  perish: 0.02,
      weather: { panas: 0.6, cerah: 1.0, mendung: 1.1, hujan: 1.2, ribut: 1.2 } },
    // expiry = days a batch lasts on the shelf before it has to be thrown away
    { id: 'airtin',  name: 'Air Tin',     icon: '🥤', cost: 1.2, ref: 2.2,  demand: 0.7,  perish: 0, expiry: 15,
      weather: { panas: 2.0, cerah: 1.4, mendung: 0.9, hujan: 0.6, ribut: 0.5 } }
  ],

  // upkeep = RM per day once bought
  upgrades: [
    { id: 'peti',     name: 'Peti Sejuk',     icon: '🧊', price: 300, upkeep: 5,
      desc: 'Boleh jual ais krim. Roti dan telur kurang rosak.', perishMult: 0.5 },
    // An upgrade with levels can be bought once per level (each level's numbers add up).
    { id: 'rak',      name: 'Besarkan Kedai', icon: '🏬', levels: [
      { price: 250, rent: 5, capacity: 150, desc: 'Sewa lot sebelah. +150 ruang stok, lebih ramai boleh masuk, boleh jual payung.' },
      { price: 450, rent: 8, capacity: 150, desc: 'Sewa lot kedua. +150 lagi ruang stok, kedai jadi tiga pintu.' }
    ] },
    { id: 'kipas',    name: 'Kipas Siling',   icon: '🌀', price: 120, upkeep: 1,
      desc: 'Kedai lebih selesa, +8% pelanggan.', traffic: 0.08 },
    { id: 'qr',       name: 'DuitNow QR',     icon: '📱', price: 180, upkeep: 0,
      desc: 'Senang bayar, pelanggan sanggup bayar 6% lebih.', willing: 0.06 },
    { id: 'papan',    name: 'Papan Tanda LED', icon: '💡', price: 450, upkeep: 2,
      desc: 'Lebih ramai nampak kedai korang, +20% pelanggan.', traffic: 0.2 },
    { id: 'pembantu', name: 'Pembantu Kedai', icon: '🧑‍🍳', price: 300, upkeep: 35,
      desc: 'Layan +60 pelanggan sehari.', serve: 60 },
    { id: 'lewat',    name: 'Buka Sampai 12 Malam', icon: '🌙', price: 350, upkeep: 8,
      desc: 'Buka 8 pagi hingga 12 malam. +25% pelanggan, layan +20 lagi.', traffic: 0.25, serve: 20, hours: 4 }
  ],

  events: {
    gaji:       { name: 'Hari Gaji', desc: 'Orang ramai baru dapat gaji, lebih sanggup belanja.', traffic: 1.15, willing: 1.15 },
    pasarmalam: { name: 'Pasar Malam', desc: 'Pasar malam dekat kedai, ramai lalu-lalang.', traffic: 1.4 },
    sukan:      { name: 'Hari Sukan Sekolah', desc: 'Budak sekolah cari air dan roti.', boost: { air: 2, roti: 1.5 } },
    promosi:    { name: 'Promosi Pemborong', desc: 'Harga borong 20% lebih murah hari ini.', costMult: 0.8 }
  },
  randomEvents: ['pasarmalam', 'sukan', 'promosi'],

  // Milestones pay a one-off cash reward. check(s, r) gets the state and today's report.
  milestones: [
    { id: 'untung1',  name: 'Untung Pertama',   desc: 'Untung dalam sehari.', reward: 20,
      check: function (s, r) { return r.profit > 0; } },
    { id: 'rm100',    name: 'Hari RM100',       desc: 'Untung RM100 dalam sehari.', reward: 50,
      check: function (s, r) { return r.profit >= 100; } },
    { id: 'rm200',    name: 'Hari Raya Kedai',  desc: 'Untung RM200 dalam sehari.', reward: 100,
      check: function (s, r) { return r.profit >= 200; } },
    { id: 'streak5',  name: 'Konsisten',        desc: 'Untung 5 hari berturut-turut.', reward: 60,
      check: function (s) { return s.stats.streak >= 5; } },
    { id: 'naiktaraf', name: 'Pelaburan Pertama', desc: 'Beli naik taraf pertama.', reward: 30,
      check: function (s) { return Object.keys(s.upgrades).length >= 1; } },
    { id: 'semua',    name: 'Kedai Lengkap',    desc: 'Beli semua naik taraf.', reward: 150,
      check: function (s) { return Object.keys(s.upgrades).length >= KR.config.upgrades.length; } },
    { id: 'rep80',    name: 'Kedai Kegemaran',  desc: 'Capai reputasi 80.', reward: 50,
      check: function (s) { return s.rep >= 80; } },
    { id: 'pelanggan500', name: 'Kenal Satu Taman', desc: 'Layan 500 pelanggan.', reward: 80,
      check: function (s) { return s.stats.customers >= 500; } },
    { id: 'takhabis', name: 'Stok Cukup',       desc: 'Sehari tanpa barang habis (sekurang-kurangnya 40 pelanggan).', reward: 40,
      check: function (s, r) { return r.served >= 40 && Object.keys(r.perProduct).every(function (k) { return !r.perProduct[k].out; }); } }
  ]
};

// Every upgrade gets a levels list, so the rules only deal with one shape.
KR.config.upgrades.forEach(function (u) {
  if (!u.levels) u.levels = [Object.assign({}, u)];
  u.price = u.levels[0].price; u.upkeep = u.levels[0].upkeep; u.rent = u.levels[0].rent; u.desc = u.levels[0].desc;
});
