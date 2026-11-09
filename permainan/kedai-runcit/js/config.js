// Kedai Runcit Tycoon: all tunable game data lives here.
// Balance changes should only need edits in this file.
window.KR = window.KR || {};

KR.config = {
  version: 1,
  saveKey: 'kedaiRuncit.save.v1',
  startCash: 200,
  // Start-up loan: the bank starts at -RM2,000 and that money is in the till on day 1.
  // Deposits pay it off; savings only earn once the balance is above zero. No interest on the loan.
  startLoan: 2000,
  startRep: 50,
  baseCapacity: 150,     // max units of stock in the shop
  baseTraffic: 30,       // customers on a normal weekday, scaled by reputation (see trafficRep)
  // Each customer buys this many of every item they want (fewer people, bigger baskets).
  buyQty: 2,
  // Reputation -> share of baseTraffic: a new shop (rep 50) gets about 60%, a famous one (rep 100)
  // gets 1.5x, which is more than one person can serve, so long queues pull reputation back down.
  trafficRep: { min: 0.3, scale: 1.2, power: 2 },
  baseServe: 35,         // customers the owner alone can serve per day (spread over opening hours)
  // How many customers fit inside at once (base + per extra lot + with a helper), and how long a
  // line people will join outside. Someone only walks off when the shop is full and the line too.
  shopRoom: { base: 5, perLot: 4, helper: 2, line: 5 },
  rent: 15,              // RM per day at full price
  // New shops get cheap rent: 60% for the first 30 days, then +20% every 30 days, up to 100%.
  // Applies to the shop's rent and the rent of any extra lots (levels with a 'rent' field).
  rentRamp: { start: 0.6, step: 0.2, every: 28 },   // every month
  // Customer tiers. Rare ones (doctors) only come at reputation 80+, unique ones (kimono) at 95+.
  // multiChance = chance they buy multi times what they planned (common 2x, rare 2x, unique 3x).
  tiers: {
    common: { multi: 2, multiChance: 0.08 },
    rare:   { rep: 80, chance: 0.08, multi: 2, multiChance: 0.6 },
    unique: { rep: 95, chance: 0.03, multi: 3, multiChance: 0.6 }
  },
  // Events (see `events` below): each morning from day 3 there's a chance of a one-day event,
  // and from day 5 a chance a week-long one starts (only one week-long event runs at a time).
  // Players only see which events are on once they have the Peti Surat Syarikat upgrade.
  eventChance: 0.25,
  weekEventChance: 0.08,
  // Calendar: 7 days a week, 4 weeks a month (28 days). The season ends after month 3.
  weekDays: 7,
  monthWeeks: 4,
  paydayEvery: 28,       // payday is day 25 of every month
  paydayOn: 25,
  // Wholesale prices: every week each item's cost moves by a random % (market), and everything
  // gets `inflation` dearer each week (customers' fair price rises with it).
  // Most weeks the move is small (-small..+small); with chance `bigChance` it's a big one
  // (between big[0] and big[1], up or down), up to -50% or +50%.
  market: { small: 0.2, bigChance: 0.15, big: [0.3, 0.5] },
  inflation: 0.02,
  // Rating: normally 0-100. Advertisement adds a bonus for one week, up to `max` (120).
  repMax: 120,
  ads: [
    { name: 'Iklan Risalah',       price: 100, bonus: 10, days: 7 },
    { name: 'Iklan Radio',         price: 150, bonus: 15, days: 7 },
    { name: 'Iklan Media Sosial',  price: 200, bonus: 20, days: 7 }
  ],
  // Above 100 rating, rare and unique customers sometimes leave a tip: chance (rating - 100)%,
  // tip = share of what they bought. Not explained in the game on purpose.
  tips: { share: 0.5 },
  midRestockMarkup: 0.1, // restocking while the shop is open costs 10% more than the morning order
  hourMs: 4000,          // playback length of one opening hour at x1 speed
  openHour: 8,           // 8 pagi
  closeHour: 20,         // 8 malam (the 'lewat' upgrade adds hours)
  bestKey: 'kedaiRuncit.best.v1',

  // Regulars: named customers who come most days for one item (see sim.js regulars()).
  // rep = reputation needed before they start coming; hour = when they usually turn up; seed = their look.
  regulars: [
    { id: 'ali',  name: 'Pak Ali',  item: 'roti',    rep: 0,  hour: 8.5, seed: 12 },
    { id: 'ros',  name: 'Kak Ros',  item: 'telur',   rep: 0,  hour: 11, seed: 7 },
    { id: 'amin', name: 'Amin',     item: 'maggi',   rep: 60, hour: 17, seed: 21 },
    { id: 'mei',  name: 'Mei Ling', item: 'airtin',  rep: 75, hour: 14, seed: 33 },
    { id: 'raju', name: 'Raju',     item: 'cokelat', rep: 90, hour: 16, seed: 45 }
  ],
  regularRules: { visitChance: 0.85, startHearts: 3, maxHearts: 5, awayDays: 7, repBonus: 0.3 },
  // The kilang across the road: on weekdays (Isnin-Jumaat) a few workers pop over at lunch and
  // go back, and more come by when the shift ends from 6 petang. Hours are clock hours.
  factory: {
    days: [0, 1, 2, 3, 4],
    lunch: { from: 12, to: 14, min: 1, max: 2, back: true },
    shift: { from: 18, to: 19.5, min: 2, max: 4 }
  },

  // Bank: money saved here earns a return every night on the balance in the bank.
  // rates[i] is the daily return at relationship level i; upgrades[i] is the price to reach level i+1.
  bank: { rates: [0.025, 0.05, 0.10], upgrades: [500, 1200] },

  // Kad TCG (needs the 'tcg' upgrade in lot 3): a new set comes out every `every` days. On release
  // day collectors queue up for packs; the hype fades by `fade` a day. Weekends are card days too.
  tcg: { every: 14, collectors: 6, fade: 0.65, weekend: 1.5, willing: 0.3 },
  // Mesin capit (claw machine, lot 3): some of the people who visit play it for RM1 a go.
  claw: { playRate: 0.4, price: 1, prizeCost: 0.35 },
  // Lots: products and some upgrades belong to a lot. Lot 1 is the first shop, lot 2 and 3 are
  // rented with "Besarkan Kedai".
  lots: [
    { name: 'Lot 1 · Barang harian' },
    { name: 'Lot 2 · Barang dapur' },
    { name: 'Lot 3 · Sudut hobi' }
  ],

  // Season goal: shop value (cash + stock at cost + upgrades at price) after seasonDays.
  seasonDays: 84,        // 3 months of 4 weeks
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
  // lot = which shop lot sells it (2 and 3 need the lot rented first)
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
    { id: 'cokelat', name: 'Cokelat',     icon: '🍫', cost: 1.5, ref: 3.0,  demand: 0.5,  perish: 0.02,
      weather: { panas: 0.6, cerah: 1.0, mendung: 1.1, hujan: 1.2, ribut: 1.2 } },
    // expiry = days a batch lasts on the shelf before it has to be thrown away
    { id: 'airtin',  name: 'Air Tin',     icon: '🥤', cost: 1.2, ref: 2.2,  demand: 0.7,  perish: 0, expiry: 15,
      weather: { panas: 2.0, cerah: 1.4, mendung: 0.9, hujan: 0.6, ribut: 0.5 } },
    // Lot 2: kitchen basics
    { id: 'beras',   name: 'Beras 5kg',   icon: '🍚', cost: 13.0, ref: 19.0, demand: 0.3, perish: 0, lot: 2,
      weather: { panas: 1, cerah: 1, mendung: 1, hujan: 1.1, ribut: 1.2 } },
    { id: 'minyak',  name: 'Minyak Masak', icon: '🫗', cost: 5.2, ref: 7.5,  demand: 0.35, perish: 0, lot: 2,
      weather: { panas: 1, cerah: 1, mendung: 1, hujan: 1, ribut: 1.1 } },
    { id: 'gula',    name: 'Gula 1kg',    icon: '🧂', cost: 2.6, ref: 3.8,  demand: 0.45, perish: 0, lot: 2,
      weather: { panas: 1, cerah: 1, mendung: 1.05, hujan: 1.1, ribut: 1.1 } },
    { id: 'payung',  name: 'Payung',      icon: '☂️', cost: 6.0, ref: 12.0, demand: 0.12, perish: 0, lot: 2,
      weather: { panas: 0.2, cerah: 0.3, mendung: 0.8, hujan: 6, ribut: 8 } },
    // Lot 3: hobby corner
    { id: 'mainan',  name: 'Mainan Kecil', icon: '🧸', cost: 3.0, ref: 6.5, demand: 0.3, perish: 0, lot: 3,
      weather: { panas: 0.9, cerah: 1, mendung: 1.1, hujan: 1.3, ribut: 1.3 } },
    { id: 'tcg',     name: 'Pek Booster TCG', icon: '🃏', cost: 9.0, ref: 15.0, demand: 0.3, perish: 0, lot: 3, requires: 'tcg',
      weather: { panas: 1, cerah: 1, mendung: 1, hujan: 1.1, ribut: 1.1 } }
  ],

  // upkeep = RM per day once bought
  upgrades: [
    // Company: SSM registration lets the player rename the company and join the leaderboard;
    // the mailbox (needs SSM) shows which events are on now and which have ended.
    { id: 'ssm',      name: 'Daftar SSM',     icon: '📜', price: 60, upkeep: 0,
      desc: 'Daftar perniagaan dengan SSM. Boleh tukar nama syarikat dan masuk Papan Prestasi Syarikat.' },
    { id: 'petisurat', name: 'Peti Surat Syarikat', icon: '📬', price: 30, upkeep: 0, needs: 'ssm',
      desc: 'Surat dari kerajaan, pemborong dan jiran sampai ke sini. Tahu acara apa sedang berlaku dan yang dah tamat.' },
    { id: 'peti',     name: 'Peti Sejuk',     icon: '🧊', price: 300, upkeep: 5,
      desc: 'Boleh jual ais krim. Roti dan telur kurang rosak.', perishMult: 0.5 },
    // An upgrade with levels can be bought once per level (each level's numbers add up).
    { id: 'rak',      name: 'Besarkan Kedai', icon: '🏬', levels: [
      { price: 250, rent: 5, capacity: 150, desc: 'Sewa lot 2. +150 ruang stok, lebih ramai boleh masuk, jual barang dapur (beras, minyak, gula) dan payung.' },
      { price: 450, rent: 8, capacity: 150, desc: 'Sewa lot 3: sudut hobi. +150 lagi ruang stok, jual mainan, dan boleh pasang mesin capit dan jual kad TCG.' }
    ] },
    { id: 'kipas',    name: 'Kipas Siling',   icon: '🌀', price: 120, upkeep: 1,
      desc: 'Kedai lebih selesa, +8% pelanggan.', traffic: 0.08 },
    { id: 'qr',       name: 'DuitNow QR',     icon: '📱', price: 180, upkeep: 0,
      desc: 'Senang bayar, pelanggan sanggup bayar 6% lebih.', willing: 0.06 },
    { id: 'papan',    name: 'Papan Tanda LED', icon: '💡', price: 450, upkeep: 2,
      desc: 'Lebih ramai nampak kedai korang, +20% pelanggan.', traffic: 0.2 },
    // Small warehouse next to the shop (+100 stock space), then a part-timer who works from it:
    // from 6 petang he tops each item up to the auto-restock level the player set, at the normal wholesale price.
    { id: 'stor',     name: 'Stor Kecil',     icon: '📦', price: 50, upkeep: 10, capacity: 100,
      desc: 'Stor kecil sebelah kedai. +100 ruang stok.' },
    { id: 'pekerja',  name: 'Pekerja Stor (Separuh Masa)', icon: '🛒', price: 150, upkeep: 17.5, needs: 'stor', autoRestock: true,
      desc: 'Masuk kerja pukul 6 petang. Isi semula rak dari stor ikut tahap Auto yang korang tetapkan, pada harga borong biasa.' },
    { id: 'pembantu', name: 'Pembantu Kedai', icon: '🧑‍🍳', price: 300, upkeep: 35,
      desc: 'Layan +30 pelanggan sehari.', serve: 30 },
    { id: 'lewat',    name: 'Buka Sampai 12 Malam', icon: '🌙', price: 350, upkeep: 8,
      desc: 'Buka 8 pagi hingga 12 malam. +25% pelanggan, layan +10 lagi.', traffic: 0.25, serve: 10, hours: 4 },
    // Lot 3 only
    { id: 'capit',    name: 'Mesin Capit',    icon: '🕹️', price: 400, upkeep: 2, lot: 3,
      desc: 'Mesin capit di sudut hobi. Pengunjung main RM1 sekali, duit masuk tiap hari tanpa perlu stok.', claw: true },
    { id: 'tcg',      name: 'Jual Kad TCG',   icon: '🃏', price: 300, upkeep: 0, lot: 3,
      desc: 'Jual pek booster TCG. Set baru keluar setiap 14 hari dan peminat kad datang beratur.' },
    // Hidden: only shows once every other upgrade is bought. Runs the shop for you (see main.js manager).
    { id: 'pengurus', name: 'Pengurus Kedai', icon: '🧑‍💼', price: 2500, upkeep: 20, hidden: true,
      desc: 'Pengurus pesan stok ikut jualan semalam dan buka kedai setiap hari untuk korang. Boleh tutup bila-bila masa.' }
  ],
  // Cash + bank needed to celebrate and offer a second branch (RM5,000 + RM2,500 for the manager).
  expandAt: 7500,

  // Events. days = how long it lasts (1 = today only, 7 = a week). Effects, all optional:
  //   traffic / willing  multiply visitors / what people will pay
  //   costMult           multiplies every wholesale price; cost: { id: mult } for one product
  //   boost: { id: mult } demand for a product; bills multiplies the upgrades' daily upkeep
  //   rep                reputation added at the end of each day it runs
  // from = who the letter is from (Peti Surat); lot = only happens once that lot is rented;
  // weight = how often it's picked compared with the others (default 1).
  events: {
    gaji:       { name: 'Hari Gaji', from: 'Kalendar', days: 1, desc: 'Orang ramai baru dapat gaji, lebih sanggup belanja.', traffic: 1.15, willing: 1.15 },
    // One day only
    pasarmalam: { name: 'Pasar Malam', from: 'Majlis Perbandaran', days: 1, desc: 'Pasar malam dekat kedai, ramai lalu-lalang.', traffic: 1.4 },
    sukan:      { name: 'Hari Sukan Sekolah', from: 'Sekolah Kebangsaan Taman', days: 1, desc: 'Budak sekolah cari air dan roti.', boost: { air: 2, roti: 1.5 } },
    promosi:    { name: 'Promosi Pemborong', from: 'Pemborong', days: 1, desc: 'Harga borong 20% lebih murah hari ini.', costMult: 0.8 },
    kenduri:    { name: 'Kenduri Kahwin', from: 'Jiran taman', days: 1, lot: 2, desc: 'Ada kenduri kahwin di taman. Tuan rumah cari beras, minyak, gula dan air.',
                  boost: { beras: 3, minyak: 2.5, gula: 2.5, air: 1.5 } },
    influencer: { name: 'Influencer Singgah', from: 'Media sosial', days: 1, weight: 0.6, desc: 'Seorang influencer makanan buat video di kedai korang. Ramai datang nak tengok, dan reputasi naik.',
                  traffic: 1.3, rep: 3 },
    bola:       { name: 'Malam Final Bola', from: 'Persatuan Penduduk', days: 1, desc: 'Pasukan negeri main final malam ni. Orang beli mi segera, air tin dan cokelat untuk tengok bola.',
                  boost: { maggi: 1.7, airtin: 2, cokelat: 1.6 } },
    gotong:     { name: 'Gotong-royong Taman', from: 'Persatuan Penduduk', days: 1, desc: 'Penduduk bergotong-royong bersihkan taman. Ramai cari air dan roti.',
                  boost: { air: 2.2, roti: 1.6, airtin: 1.5 } },
    jalan:      { name: 'Kerja Baiki Jalan', from: 'Majlis Perbandaran', days: 1, weight: 0.5, desc: 'Majlis baiki jalan depan taman. Kurang sikit orang lalu hari ini.', traffic: 0.8 },
    // A whole week (temporary policies and seasons)
    subsidi:    { name: 'Subsidi Minyak Masak', from: 'Kerajaan', days: 7, lot: 2, desc: 'Kerajaan beri subsidi minyak masak selama seminggu. Harga borong minyak 30% lebih murah.',
                  cost: { minyak: 0.7 }, boost: { minyak: 1.3 } },
    bantuan:    { name: 'Bantuan Tunai Kerajaan', from: 'Kerajaan', days: 7, desc: 'Bantuan tunai masuk akaun rakyat minggu ini. Lebih ramai keluar belanja dan sanggup bayar lebih sikit.',
                  traffic: 1.1, willing: 1.08 },
    rebat:      { name: 'Rebat Bil Elektrik', from: 'Kerajaan', days: 7, desc: 'Rebat bil elektrik untuk peniaga kecil selama seminggu. Kos harian naik taraf separuh harga.', bills: 0.5 },
    cuti:       { name: 'Cuti Sekolah', from: 'Kalendar sekolah', days: 7, desc: 'Seminggu cuti sekolah. Budak-budak cari ais krim, cokelat dan mainan.',
                  traffic: 1.05, boost: { aiskrim: 1.8, cokelat: 1.6, mainan: 2, tcg: 1.3 } },
    kempen:     { name: 'Kempen Sokong Kedai Kejiranan', from: 'Kerajaan', days: 7, desc: 'Kempen seminggu galakkan orang beli di kedai dekat rumah. Lebih ramai singgah.', traffic: 1.12 },
    diesel:     { name: 'Kos Penghantaran Naik', from: 'Pemborong', days: 7, weight: 0.6, desc: 'Harga diesel naik sementara. Pemborong caj 8% lebih untuk semua barang selama seminggu.', costMult: 1.08 }
  },
  randomEvents: ['pasarmalam', 'sukan', 'promosi', 'kenduri', 'influencer', 'bola', 'gotong', 'jalan'],
  weekEvents: ['subsidi', 'bantuan', 'rebat', 'cuti', 'kempen', 'diesel'],
  // Company Performance Leaderboard: the shop value at the end of each season (needs SSM).
  boardKey: 'kedaiRuncit.board.v1',

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
      check: function (s) { return KR.sim.allUpgradesOwned(s); } },
    { id: 'rep80',    name: 'Kedai Kegemaran',  desc: 'Capai reputasi 80.', reward: 50,
      check: function (s) { return s.rep >= 80; } },
    { id: 'pelanggan500', name: 'Kenal Satu Taman', desc: 'Layan 250 pelanggan.', reward: 80,
      check: function (s) { return s.stats.customers >= 250; } },
    { id: 'takhabis', name: 'Stok Cukup',       desc: 'Sehari tanpa barang habis (sekurang-kurangnya 20 pelanggan).', reward: 40,
      check: function (s, r) { return r.served >= 20 && Object.keys(r.perProduct).every(function (k) { return !r.perProduct[k].out; }); } }
  ]
};

// Every upgrade gets a levels list, so the rules only deal with one shape.
KR.config.upgrades.forEach(function (u) {
  if (!u.levels) u.levels = [Object.assign({}, u)];
  u.levels.forEach(function (l) { l.id = u.id; });
  u.price = u.levels[0].price; u.upkeep = u.levels[0].upkeep; u.rent = u.levels[0].rent; u.desc = u.levels[0].desc;
});
