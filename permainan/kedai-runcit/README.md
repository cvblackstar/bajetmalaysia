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
| `js/scene3d.js` | Optional three.js street scene with low-poly customers. Falls back to the SVG scene without WebGL, when opened from `file://`, or when the player picks 2D. |
| `vendor/three.module.min.js` | three.js r158 (MIT, see `vendor/three.LICENSE`), loaded in the background with `import()`. |
| `js/ui.js` | Renders the state into the page. |
| `js/main.js` | Wires buttons, plays the day animation, saves. |

Later plans plug into `platform.js`: Supabase leaderboard (`leaderboard.submit/top`),
a donation button (`donationUrl`), and the CrazyGames SDK (`sdk.*`). Hosting on Vercel needs no changes.
