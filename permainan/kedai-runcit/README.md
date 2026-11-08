# Kedai Runcit Tycoon (prototype)

Plain HTML/CSS/JS, no build step. Open `index.html` directly or through `permainan-kewangan.html`.

| File | Job |
| --- | --- |
| `js/config.js` | All balance data: products, weather, events, upgrades, rent ramp, customer tiers, the 90-day season. Tune the game here. |
| `js/platform.js` | Storage, leaderboard, donation and portal SDK hooks (stubs for now). |
| `js/state.js` | New game, load, migrate and save (localStorage via `platform.js`). |
| `js/sim.js` | Pure game rules, no DOM. `runDay()` simulates a day and returns a report + timeline. |
| `js/i18n.js` | Bahasa Melayu / English switch. Text is written in Malay and `t()` looks up the English version. |
| `js/art.js` | Inline SVG sprites (products, people, weather, upgrades, stars). |
| `js/audio.js` | Web Audio sound effects (ka-ching, coin, sad) and the mute setting. |
| `js/characters3d.js` | Chibi-style 3D people built from primitives: swappable headwear, tops, bottoms, extras and colours (base for the Reka Tauke creator). |
| `js/models3d.js` | Rigged, animated customers from Quaternius' CC0 character pack (`models/*.glb`), used as provided. Common: casual, worker, suit, plus a tauke (casual male in songkok and apron, built by `tools/build_tauke.py` in Blender). Rare (reputation 80+): doctors. Unique (95+): kimono. Falls back to `characters3d.js` if they fail to load. |
| `models/env/*.glb` | Shop lots, houses, flats, bank, klinik, trees, palms, bushes and flowers from Quaternius' CC0 Buildings and Nature packs, placed by `scene3d.js` (box versions show until they load). |
| `models/env/food.glb`, `arcade.glb`, `cars.glb` | Kenney CC0 props packed by `tools/pack_kenney.mjs`: 3D goods on the shelves (`GOODS` in `scene3d.js`; products without a model keep their sprite), the shopping bag's shape, the claw machine, cash register and prize rack, Kenney cars in the traffic, the kilang's lorry, an ambulance at the klinik, and the delivery lorry and boxes that come after a mid-day restock. |
| `vendor/GLTFLoader.js`, `SkeletonUtils.js`, `BufferGeometryUtils.js` | three.js r158 add-ons (MIT) used to load and clone the models. |
| `js/scene3d.js` | Optional three.js town scene: a row of 3 shop lots (the "Besarkan Kedai" upgrade rents lots 2 and 3), zoom (wheel, pinch, +/-) and drag to pan; zoomed in shows a cutaway of the inside, zoomed out shows the roof. A kilang across the road sends workers over at lunch and after 6 petang, and passers-by walk through without shopping. Falls back to the SVG scene without WebGL, when opened from `file://`, or when the player picks 2D. |
| Shop row and town layout | The three lots are one linked row of shophouses built in `buildRow()` (`scene3d.js`): shared party walls with wide arches once lots are rented, one roof, sign bands per lot and a covered kaki lima. Two back roads run behind the row so every house and the klinik, bank and flats face a road; the kilang sits further left across the road. |
| Queue and room | `shopRoom` in `config.js`: how many customers fit inside (more lots, a helper) and how long a line people join. In `sim.js` a customer only walks off when the shop is full and the line is too long at that moment; the till serves `serveCap` customers spread over the opening hours. |
| `vendor/three.module.min.js` | three.js r158 (MIT, see `vendor/three.LICENSE`), loaded in the background with `import()`. |
| `js/ui.js` | Renders the state into the page: Stok tab grouped by lot, Naik Taraf, Bank, Pelanggan, Rekod. |
| `js/main.js` | Wires buttons, plays the day animation, saves. |

Shop lots: lot 1 sells everyday items; renting lot 2 adds kitchen basics (rice, oil, sugar, umbrellas);
lot 3 is a hobby corner (toys, plus the Mesin Capit and Jual Kad TCG upgrades). A new TCG set comes out
every 14 days and brings card collectors. The Bank tab holds savings that earn a daily return
(`bank` in `config.js`). Cars on the main road are a mix of ones built in code (`makeCar` in `scene3d.js`) and Kenney's, and stop
at the zebra crossing for people coming from across the road. Rare customers have a light blue
outline, unique ones a purple glow (`AURA` in `models3d.js`).

Later plans plug into `platform.js`: Supabase leaderboard (`leaderboard.submit/top`),
a donation button (`donationUrl`), and the CrazyGames SDK (`sdk.*`). Hosting on Vercel needs no changes.
