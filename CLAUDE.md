# Bajet MY — content & social media guidelines

## Publishing a new topic
1. Article on the website (`articles/<category>/<slug>.md` + entry at top of `data/articles.json`, run `node scripts/build-articles.js` (writes the static page `artikel/<slug>.html`), `node scripts/build-sitemap.js`, then `node scripts/validate-site.js`), deploy via `main`. Share article links as `https://bajetmy.my/artikel/<slug>.html` so Facebook/WhatsApp previews show the article's own title and infographic. New root HTML pages also need `python3 scripts/inject-analytics.py` (adds GA4 + policy footer) plus a canonical link and og:/twitter: title/description tags in `<head>`.
2. Facebook Page post: infographic + caption, then first comment with the article link (and relevant calculator link).
3. Instagram: **always carousel format** (multiple 1080×1080 slides), link-in-bio in caption.
4. Threads: **multi-post thread (main post + chained replies)**, text-first — no infographic, no single long infodump.

## Tone
- Casual Bahasa Malaysia ("korang", "senang je"), plain and practical.
- Minimal emoji — avoid emoji-bullet lists; use numbers/dashes instead.
- Cite official sources (DOSM, BNM, SC, KWSP, LHDN) where figures are used.

## Threads writing style (the "phone price" thread is the reference)
- Open with a curious, relatable question, not a headline ("Harga phone makin mahal, tapi kenapa queue tetap panjang? Ini adalah bebenang.").
- One idea per post, short and conversational, like talking to a friend. No lists of facts, no infodump.
- Use real, sourced numbers (prices, dates, percentages) but keep them light, and say who they come from when it matters.
- Be honest and balanced: if the popular take is only half true, say so instead of just agreeing with it.
- Include one small calculation or concrete example the reader can picture (e.g. RM5,499 over 24 months is about RM229 a month).
- Finish with a reflective question or a genuine engagement prompt ("Korang upgrade phone setiap berapa tahun?"), not a sales line.
- Casual one-off threads: no links unless asked. Keep each post under 500 characters. No emoji. Do not use the thread emoji; end the opener with the words "Ini adalah bebenang." instead, so it sounds natural.
