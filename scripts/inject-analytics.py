from pathlib import Path

MEASUREMENT_ID = "G-SKRD4Q889Y"
SNIPPET = f'''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{MEASUREMENT_ID}');
</script>'''

POLICY_FOOTER = '''<p class="footer-policies"><a href="disclaimer.html">Penafian</a><a href="privacy.html">Privasi</a><a href="affiliate-disclosure.html">Pendedahan Affiliate</a></p>'''

html_files = sorted(Path('.').glob('*.html'))
if not html_files:
    raise SystemExit("No root HTML files found; refusing to publish an untagged site.")

for path in html_files:
    text = path.read_text(encoding='utf-8')

    if MEASUREMENT_ID not in text:
        marker = '</head>'
        lower = text.lower()
        if marker not in lower:
            raise SystemExit(f"Missing </head> in {path}; cannot inject GA4 safely.")
        idx = lower.index(marker)
        text = text[:idx] + SNIPPET + '\n' + text[idx:]

    if 'footer-policies' not in text and '</footer>' in text.lower():
        marker = '</footer>'
        idx = text.lower().index(marker)
        text = text[:idx] + POLICY_FOOTER + '\n' + text[idx:]

    path.write_text(text, encoding='utf-8')
    print(f'Prepared {path}')

untagged = [str(path) for path in html_files if MEASUREMENT_ID not in path.read_text(encoding='utf-8')]
if untagged:
    raise SystemExit("GA4 injection validation failed for: " + ", ".join(untagged))

print(f"GA4 tagging validated for {len(html_files)} HTML pages using {MEASUREMENT_ID}.")
