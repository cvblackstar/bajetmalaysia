# Kedai Runcit Tycoon (prototype)

Plain HTML/CSS/JS, no build step. Open `index.html` directly or through `permainan-kewangan.html`.

| File | Job |
| --- | --- |
| `js/config.js` | All balance data: products, weather, events, upgrades. Tune the game here. |
| `js/platform.js` | Storage, leaderboard, donation and portal SDK hooks (stubs for now). |
| `js/state.js` | New game, load, migrate and save (localStorage via `platform.js`). |
| `js/sim.js` | Pure game rules, no DOM. `runDay()` simulates a day and returns a report + timeline. |
| `js/art.js` | Inline SVG sprites (products, people, weather, upgrades, stars). |
| `js/audio.js` | Web Audio sound effects (ka-ching, coin, sad) and the mute setting. |
| `js/characters3d.js` | Chibi-style 3D people built from primitives: swappable headwear, tops, bottoms, extras and colours (base for the Reka Tauke creator). |
| `js/models3d.js` | Rigged, animated customers from Quaternius' CC0 character pack (`models/*.glb`), used as provided. Common: casual, worker, suit. Rare (reputation 80+): doctors. Unique (95+): kimono. Falls back to `characters3d.js` if they fail to load. |
| `vendor/GLTFLoader.js`, `SkeletonUtils.js`, `BufferGeometryUtils.js` | three.js r158 add-ons (MIT) used to load and clone the models. |
| `js/scene3d.js` | Optional three.js street scene with low-poly customers. Falls back to the SVG scene without WebGL, when opened from `file://`, or when the player picks 2D. |
| `vendor/three.module.min.js` | three.js r158 (MIT, see `vendor/three.LICENSE`), loaded in the background with `import()`. |
| `js/ui.js` | Renders the state into the page. |
| `js/main.js` | Wires buttons, plays the day animation, saves. |

Later plans plug into `platform.js`: Supabase leaderboard (`leaderboard.submit/top`),
a donation button (`donationUrl`), and the CrazyGames SDK (`sdk.*`). Hosting on Vercel needs no changes.
