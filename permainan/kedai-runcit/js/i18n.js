// Language switch: Bahasa Melayu (default) or English.
// Text is written in Malay in the code; t('Malay text {n}', { n: 3 }) returns the English
// version from EN when English is picked. Missing entries fall back to the Malay text.
// Static text in index.html is marked with data-i18n (textContent) or data-i18n-html.
window.KR = window.KR || {};

KR.i18n = (function () {
  var KEY = 'kedaiRuncit.lang';
  var lang = KR.platform.storage.load(KEY) === 'en' ? 'en' : 'ms';

  var EN = {
    // Header and tabs
    'Hari {d} · {name}': 'Day {d} · {name}',
    'Duit': 'Cash', 'Reputasi': 'Reputation', 'Stok': 'Stock',
    'Bunyi: buka': 'Sound: on', 'Bunyi: tutup': 'Sound: off', 'Grafik: 3D': 'Graphics: 3D', 'Grafik: 2D': 'Graphics: 2D',
    'Bahasa: BM': 'Language: EN',
    'Stok & Harga': 'Stock & Prices', 'Naik Taraf': 'Upgrades', 'Pelanggan': 'Customers', 'Rekod': 'Records',
    'Tambah stok untuk hari ini dan tetapkan harga jual. Bayaran borong dibuat bila kedai dibuka.':
      'Add stock for today and set your selling prices. You pay the wholesaler when the shop opens.',
    'Pencapaian': 'Achievements', 'Nama kedai': 'Shop name', 'Mula semula': 'Start over',
    'Kos borong': 'Wholesale cost', 'Buka Kedai': 'Open Shop',
    'Jualan': 'Sales', 'Langkau': 'Skip', 'Tambah Stok': 'Restock',
    'Tambah stok sekarang': 'Restock now',
    'Kedai berhenti sekejap. Stok siang 10% lebih mahal dari order pagi, tapi terus masuk rak. Duit:':
      'The shop pauses for a moment. Daytime stock costs 10% more than the morning order, but goes straight on the shelf. Cash:',
    'Sambung berniaga': 'Back to business',
    'Selamat datang, tauke!': 'Welcome, boss!',
    'Korang baru ambil alih kedai runcit kecil dengan modal RM200. Sasaran: besarkan nilai kedai dalam 90 hari untuk dapat sampai 3 bintang. Sewa murah untuk bulan pertama. Setiap pagi:':
      'You just took over a small corner shop with RM200. Goal: grow the shop\'s value over 90 days to earn up to 3 stars. Rent is cheap in the first month. Every morning:',
    'Tengok ramalan cuaca dan acara hari ini.': 'Check the weather forecast and today\'s event.',
    'Beli stok dari pemborong. Ruang kedai terhad.': 'Buy stock from the wholesaler. Shelf space is limited.',
    'Tetapkan harga. Terlalu mahal, pelanggan lari. Terlalu murah, untung nipis.': 'Set prices. Too high and customers walk away. Too low and the margin is thin.',
    'Buka kedai, kemudian semak laporan dan naik taraf kedai.': 'Open the shop, then check the report and upgrade.',
    'Roti cepat basi, jadi jangan beli berlebihan. Kemajuan disimpan dalam pelayar ini.': 'Bread goes stale fast, so don\'t overbuy. Progress is saved in this browser.',
    'Jom mula': 'Let\'s go',

    // Goal bar and forecast
    'Musim: Hari {d}/{n}': 'Season: Day {d}/{n}', 'Mod bebas': 'Free play',
    'Nilai kedai {v}': 'Shop value {v}', ' · bintang seterusnya {v}': ' · next star {v}', ' · semua bintang!': ' · all stars!',
    'Ramalan: {w}': 'Forecast: {w}',
    'Kos harian {c}: sewa {r}, bil {b}. Ramalan cuaca tak selalu tepat.': 'Daily costs {c}: rent {r}, bills {b}. The forecast isn\'t always right.',
    'Sewa diskaun: bayar {p}% sampai hari {d}.': 'Rent discount: you pay {p}% until day {d}.',

    // Products
    'Perlu {u}': 'Needs {u}', 'Borong {c} · Harga biasa {r}': 'Wholesale {c} · Usual price {r}', ' · cepat rosak': ' · spoils fast',
    ' · tahan {n} hari': ' · keeps {n} days', ' (stok lama luput dalam {n} hari)': ' (old stock expires in {n} days)',
    'Harga': 'Price', '/unit': '/unit',

    // Upgrades
    ' (Tahap {l}/{n})': ' (Level {l}/{n})', ' Kos {c}/hari.': ' Costs {c}/day.', ' Sewa {c}/hari.': ' Rent {c}/day.',
    'Sudah ada': 'Owned', 'Naik tahap {p}': 'Level up {p}', 'Beli {p}': 'Buy {p}',

    // Records
    'Hari dibuka': 'Days open', 'Untung keseluruhan': 'Total profit', 'Hari paling untung': 'Best day', 'Pelanggan dilayan': 'Customers served',
    'Untung 14 hari terakhir': 'Profit, last 14 days', 'Rekod musim terbaik: {v}': 'Best season: {v}', ' Ganjaran {v}.': ' Reward {v}.',

    // Customer stats
    'Biasa': 'Common', 'Jarang': 'Rare', 'Unik': 'Unique',
    'Semua pelanggan': 'All customers', 'Semalam': 'Yesterday',
    'Beli berganda': 'Bought extra', 'Balik sebab beratur lama': 'Left because of the queue',
    'Belum ada pelanggan lagi. Buka kedai dulu!': 'No customers yet. Open the shop first!',
    'Pelanggan jarang (doktor) datang bila reputasi {r}+ dan selalunya beli 2 kali ganda. Pelanggan unik (kimono) datang bila reputasi {u}+ dan selalunya beli 3 kali ganda.':
      'Rare customers (doctors) come when reputation is {r}+ and often buy double. Unique customers (kimono) come at {u}+ and often buy triple.',

    // Report
    'Laporan Hari {d} ({name})': 'Day {d} Report ({name})',
    '{s} pelanggan dilayan daripada {v} yang datang': '{s} customers served out of {v} who came',
    'Hasil jualan': 'Sales', 'Beli stok': 'Stock bought', 'Tambah stok (siang)': 'Restock (daytime)', 'Sewa dan bil': 'Rent and bills',
    'Untung hari ini': 'Today\'s profit', 'Pencapaian baru: {m} (+{v})': 'New achievement: {m} (+{v})',
    'Pelanggan istimewa: {r} jarang, {u} unik': 'Special customers: {r} rare, {u} unique',
    '{n} orang beli berganda hari ini.': '{n} customers bought extra today.',
    'Untung hari ini termasuk stok yang korang beli. Stok yang belum terjual masih ada untuk esok.': 'Today\'s profit counts the stock you bought. Unsold stock is still there tomorrow.',
    'Hari seterusnya': 'Next day',
    'Cuaca sebenar {w}, bukan seperti ramalan.': 'The weather turned out {w}, not as forecast.',
    '{n} orang kata {p} mahal. Cuba turunkan sikit harga.': '{n} people said {p} was too pricey. Try lowering it a little.',
    '{n} orang cari {p} tapi dah habis. Tambah stok esok.': '{n} people wanted {p} but it ran out. Stock more tomorrow.',
    '{n} orang balik sebab lama beratur. Pembantu kedai boleh tolong.': '{n} people left because the queue was too long. A shop helper would help.',
    'Rosak semalaman: {list} ({v}).': 'Spoiled overnight: {list} ({v}).',
    'Hari yang lancar. Pelanggan puas hati.': 'A smooth day. Customers are happy.',
    'Kedai terpaksa tutup': 'The shop had to close',
    'Duit dan stok dah habis selepas {d} hari. Untung keseluruhan {v}.': 'Cash and stock ran out after {d} days. Total profit {v}.',
    'Tip: mulakan dengan stok yang laku dan harga dekat harga biasa, kemudian naikkan sikit-sikit.': 'Tip: start with stock that sells and prices near the usual price, then raise them bit by bit.',
    'Buka kedai baru': 'Open a new shop',

    // Season end
    'Rekod {n} Hari': '{n}-Day Record',
    'Kedai masih kecil, tapi korang dah belajar selok-belok berniaga.': 'The shop is still small, but you\'ve learned the ropes.',
    'Bagus! Kedai korang dah mula dikenali.': 'Nice! People are starting to know your shop.',
    'Hebat! Kedai korang jadi pilihan orang taman.': 'Great! Your shop is the neighbourhood favourite.',
    'Tauke sebenar! Kedai korang paling laku.': 'A real tauke! Your shop is the busiest around.',
    'Nilai kedai': 'Shop value', 'Jumlah jualan': 'Total sales', 'Naik taraf dimiliki': 'Upgrades owned', 'Rekod terbaik': 'Best record', ' (baru!)': ' (new!)',
    'Sasaran bintang: {list}. Nilai kedai = duit + bank + stok + naik taraf.': 'Star targets: {list}. Shop value = cash + bank + stock + upgrades.',
    'Teruskan main (mod bebas)': 'Continue (free play)', 'Mula musim baru': 'Start a new season',

    // Day view and dialogs
    'Mahalnya': 'Too pricey', '{p} habis?': '{p} sold out?', 'Lama sangat!': 'Too slow!',
    'pagi': 'am', 'petang': 'pm', 'malam': 'pm',
    'Stok: {n} | {c} seunit': 'Stock: {n} | {c} each',
    'Padam semua kemajuan dan mula semula?': 'Delete all progress and start over?',
    'Tiada stok langsung. Buka kedai juga?': 'No stock at all. Open the shop anyway?',
    'UNTUK DISEWA': 'FOR RENT', 'Zum masuk': 'Zoom in', 'Zum keluar': 'Zoom out',

    // Demand, repeat order, regulars, factory
    'laku {n}': 'sold {n}', 'habis {n}': 'ran out {n}', 'kata mahal {n}': 'too pricey {n}',
    'Ulang order semalam ({n} unit)': 'Repeat yesterday\'s order ({n} units)',
    'Pelanggan tetap': 'Regulars', 'Muncul bila reputasi {r}+': 'Shows up at reputation {r}+',
    'Merajuk, datang balik dalam {n} hari': 'Sulking, back in {n} days',
    'Suka {p}, datang hampir setiap hari': 'Loves {p}, comes almost every day',
    'Kalau barang kegemaran mereka habis atau terlalu mahal, mereka kecewa. Hati habis, mereka merajuk seminggu.':
      'If their favourite item is sold out or too pricey, they get upset. When their hearts run out, they sulk for a week.',
    '{n} merajuk sebab tak dapat {p}. Dia takkan datang seminggu.': '{n} is sulking after missing out on {p} and won\'t come for a week.',
    '{n} kecewa, {p} habis.': '{n} was upset: {p} was sold out.', '{n} kecewa, {p} mahal sangat.': '{n} was upset: {p} was too pricey.',
    'Pelanggan tetap yang gembira: {list}': 'Happy regulars: {list}',
    'Pekerja kilang singgah waktu rehat tengah hari dan lepas habis syif.': 'Factory workers dropped by at lunch and after their shift.',
    'KILANG': 'FACTORY',

    // Config data
    'Isnin': 'Monday', 'Selasa': 'Tuesday', 'Rabu': 'Wednesday', 'Khamis': 'Thursday', 'Jumaat': 'Friday', 'Sabtu': 'Saturday', 'Ahad': 'Sunday',
    'Panas terik': 'Scorching hot', 'Cerah': 'Sunny', 'Mendung': 'Cloudy', 'Hujan': 'Rain', 'Ribut petir': 'Thunderstorm',
    'Air Mineral': 'Mineral Water', 'Roti': 'Bread', 'Mi Segera': 'Instant Noodles', 'Telur (10)': 'Eggs (10)', 'Ais Krim': 'Ice Cream',
    'Payung': 'Umbrella', 'Cokelat': 'Chocolate', 'Air Tin': 'Canned Drink',
    'Beras 5kg': 'Rice 5kg', 'Minyak Masak': 'Cooking Oil', 'Gula 1kg': 'Sugar 1kg', 'Mainan Kecil': 'Small Toy', 'Pek Booster TCG': 'TCG Booster Pack',
    'Pengurus Kedai': 'Store Manager',
    'Pengurus pesan stok ikut jualan semalam dan buka kedai setiap hari untuk korang. Boleh tutup bila-bila masa.': 'The manager orders stock from yesterday\'s sales and opens the shop for you every day. Switch it off any time.',
    'Pengurus: buka (tekan untuk henti)': 'Manager: on (tap to stop)', 'Pengurus: tutup': 'Manager: off',
    'Tahniah, tauke!': 'Congratulations, boss!',
    'Duit dan simpanan korang dah capai {v} pada hari {d}. Kedai runcit kecil ni dah jadi perniagaan sebenar!': 'Your cash and savings reached {v} on day {d}. This little corner shop is a real business now!',
    'Langkah seterusnya: buka cawangan baru di jalan yang lebih sibuk, dengan barang jualan baru. Pengurus Kedai boleh jaga kedai ini untuk korang.': 'Next step: open a new branch on a busier road with a new lineup of items. A Store Manager can look after this shop for you.',
    'Buka cawangan baru (akan datang)': 'Open a new branch (coming soon)', 'Teruskan berniaga': 'Keep trading',
    'Mesin Capit': 'Claw Machine', 'Jual Kad TCG': 'Sell TCG Cards',
    'Mesin capit di sudut hobi. Pengunjung main RM1 sekali, duit masuk tiap hari tanpa perlu stok.': 'A claw machine in the hobby corner. Visitors play for RM1 a go: daily income with no stock needed.',
    'Jual pek booster TCG. Set baru keluar setiap 14 hari dan peminat kad datang beratur.': 'Sell TCG booster packs. A new set comes out every 14 days and card fans line up for it.',
    'Sewa lot 2. +150 ruang stok, lebih ramai boleh masuk, jual barang dapur (beras, minyak, gula) dan payung.': 'Rent lot 2. +150 stock space, more people inside at once, and sell kitchen basics (rice, oil, sugar) and umbrellas.',
    'Sewa lot 3: sudut hobi. +150 lagi ruang stok, jual mainan, dan boleh pasang mesin capit dan jual kad TCG.': 'Rent lot 3: a hobby corner. +150 more stock space, sell toys, and add a claw machine and TCG cards.',
    'Lot 1 · Barang harian': 'Lot 1 · Everyday items', 'Lot 2 · Barang dapur': 'Lot 2 · Kitchen basics', 'Lot 3 · Sudut hobi': 'Lot 3 · Hobby corner',
    'Sewa lot 2 (Besarkan Kedai) untuk jual barang ini.': 'Rent lot 2 (Expand the Shop) to sell these.',
    'Sewa lot 3 (Besarkan Kedai tahap 2) untuk jual barang ini.': 'Rent lot 3 (Expand the Shop level 2) to sell these.',
    'Perlu lot {n}': 'Needs lot {n}',
    'Set TCG baru keluar hari ini!': 'New TCG set out today!',
    'Peminat kad akan datang beratur. Pastikan stok pek booster cukup.': 'Card fans will line up. Make sure you have enough booster packs.',
    'Set TCG baru seterusnya dalam {n} hari.': 'Next TCG set in {n} days.',
    'Set TCG baru! {n} peminat kad datang cari pek booster.': 'New TCG set! {n} card fans came for booster packs.',
    '{n} peminat kad singgah cari pek booster.': '{n} card fans dropped by for booster packs.',
    'Mesin capit ({n} kali main)': 'Claw machine ({n} plays)',
    'Bank': 'Bank', 'Simpanan bank': 'Bank savings', 'Simpan': 'Deposit', 'Keluarkan': 'Withdraw', 'Semua': 'All',
    '(duit boleh simpan: {v})': '(cash you can deposit: {v})',
    'Pulangan {p}% sehari atas baki dalam bank, dibayar setiap malam. Jumlah dapat setakat ini: {e}.': '{p}% a day on your bank balance, paid every night. Earned so far: {e}.',
    'Malam ini dijangka dapat {v}.': 'Expected tonight: {v}.',
    'Duit untuk stok yang dah dipesan hari ini tak boleh disimpan. Duit dalam bank dikira dalam nilai kedai.': 'Cash needed for today\'s stock order can\'t be deposited. Money in the bank counts towards shop value.',
    'Hubungan dengan bank': 'Relationship with the bank', 'Pelanggan biasa': 'Regular customer', 'Pelanggan setia': 'Loyal customer', 'Pelanggan premium': 'Premium customer',
    '{p}% sehari': '{p}% a day', 'Naik taraf hubungan {p}': 'Upgrade relationship {p}', 'Hubungan tertinggi': 'Top relationship',
    'Pulangan bank malam ini': 'Bank return tonight', 'baki {v}': 'balance {v}',
    'Peti Sejuk': 'Fridge', 'Besarkan Kedai': 'Expand the Shop', 'Kipas Siling': 'Ceiling Fan', 'DuitNow QR': 'DuitNow QR',
    'Papan Tanda LED': 'LED Signboard', 'Pembantu Kedai': 'Shop Helper', 'Buka Sampai 12 Malam': 'Open Until Midnight',
    'Boleh jual ais krim. Roti dan telur kurang rosak.': 'Sell ice cream. Bread and eggs spoil less.',
    'Sewa lot sebelah. +150 ruang stok, lebih ramai boleh masuk, boleh jual payung.': 'Rent the lot next door. +150 stock space, more people inside at once, and you can sell umbrellas.',
    'Sewa lot kedua. +150 lagi ruang stok, kedai jadi tiga pintu.': 'Rent a second lot. +150 more stock space, a three-lot shop.',
    'Kedai lebih selesa, +8% pelanggan.': 'A cooler shop, +8% customers.',
    'Senang bayar, pelanggan sanggup bayar 6% lebih.': 'Easy payment, customers will pay 6% more.',
    'Lebih ramai nampak kedai korang, +20% pelanggan.': 'More people notice your shop, +20% customers.',
    'Layan +30 pelanggan sehari.': 'Serve +30 customers a day.',
    'Buka 8 pagi hingga 12 malam. +25% pelanggan, layan +10 lagi.': 'Open 8am to midnight. +25% customers, serve 10 more.',
    'Hari Gaji': 'Payday', 'Orang ramai baru dapat gaji, lebih sanggup belanja.': 'People just got paid and are happy to spend.',
    'Pasar Malam': 'Night Market', 'Pasar malam dekat kedai, ramai lalu-lalang.': 'A night market nearby brings lots of passers-by.',
    'Hari Sukan Sekolah': 'School Sports Day', 'Budak sekolah cari air dan roti.': 'Schoolkids are after water and bread.',
    'Promosi Pemborong': 'Wholesaler Promo', 'Harga borong 20% lebih murah hari ini.': 'Wholesale prices are 20% cheaper today.',
    'Untung Pertama': 'First Profit', 'Untung dalam sehari.': 'Make a profit in a day.',
    'Hari RM100': 'RM100 Day', 'Untung RM100 dalam sehari.': 'Make RM100 profit in a day.',
    'Hari Raya Kedai': 'Big Day', 'Untung RM200 dalam sehari.': 'Make RM200 profit in a day.',
    'Konsisten': 'Consistent', 'Untung 5 hari berturut-turut.': 'Profit 5 days in a row.',
    'Pelaburan Pertama': 'First Investment', 'Beli naik taraf pertama.': 'Buy your first upgrade.',
    'Kedai Lengkap': 'Fully Kitted', 'Beli semua naik taraf.': 'Buy every upgrade.',
    'Kedai Kegemaran': 'Local Favourite', 'Capai reputasi 80.': 'Reach reputation 80.',
    'Kenal Satu Taman': 'Everyone Knows You', 'Layan 250 pelanggan.': 'Serve 250 customers.',
    'Stok Cukup': 'Well Stocked', 'Sehari tanpa barang habis (sekurang-kurangnya 20 pelanggan).': 'A day with nothing sold out (at least 20 customers).'
  };

  function t(text, vars) {
    var out = lang === 'en' && EN[text] != null ? EN[text] : text;
    if (vars) out = out.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return out;
  }

  // Translate the static page text (keeps the Malay original in data-ms).
  function apply(root) {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ms';
    (root || document).querySelectorAll('[data-i18n], [data-i18n-html]').forEach(function (el) {
      var html = el.hasAttribute('data-i18n-html');
      if (el.dataset.ms == null) el.dataset.ms = (html ? el.innerHTML : el.textContent).trim();
      var ms = el.dataset.ms;
      if (!html) { el.textContent = t(ms); return; }
      // HTML blocks: translate each text piece between tags
      el.innerHTML = ms.replace(/>([^<]+)</g, function (m, txt) {
        var s = txt.trim(); return s ? '>' + txt.replace(s, t(s)) + '<' : m;
      }).replace(/^([^<]+)/, function (m) { return t(m.trim()); });
    });
  }

  function set(l) { lang = l === 'en' ? 'en' : 'ms'; KR.platform.storage.save(KEY, lang); apply(); }

  return { t: t, apply: apply, set: set, lang: function () { return lang; } };
})();
