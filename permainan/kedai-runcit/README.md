# Kedai Runcit Tycoon (prototype)

Plain HTML/CSS/JS, no build step. Open `index.html` directly or through `permainan-kewangan.html`.

| File | Job |
| --- | --- |
| `js/config.js` | All balance data: products, weather, events, upgrades. Tune the game here. |
| `js/platform.js` | Storage, leaderboard, donation and portal SDK hooks (stubs for now). |
| `js/state.js` | New game, load, migrate and save (localStorage via `platform.js`). |
| `js/sim.js` | Pure game rules, no DOM. `runDay()` simulates a day and returns a report + timeline. |
| `js/ui.js` | Renders the state into the page. |
| `js/main.js` | Wires buttons, plays the day animation, saves. |

Later plans plug into `platform.js`: Supabase leaderboard (`leaderboard.submit/top`),
a donation button (`donationUrl`), and the CrazyGames SDK (`sdk.*`). Hosting on Vercel needs no changes.
