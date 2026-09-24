from pathlib import Path

MEASUREMENT_ID = "G-SKRD4Q889Y"
SNIPPET = f'''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{MEASUREMENT_ID}', {{
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: window.location.origin + window.location.pathname + window.location.search
  }});
</script>'''

POLICY_FOOTER = '''<p class="footer-policies"><a href="disclaimer.html">Penafian</a><a href="privacy.html">Privasi</a><a href="affiliate-disclosure.html">Pendedahan Affiliate</a></p>'''

for path in Path('.').glob('*.html'):
    text = path.read_text(encoding='utf-8')

    if MEASUREMENT_ID not in text:
        marker = '</head>'
        if marker in text.lower():
            idx = text.lower().index(marker)
            text = text[:idx] + SNIPPET + '\n' + text[idx:]

    if 'footer-policies' not in text and '</footer>' in text.lower():
        marker = '</footer>'
        idx = text.lower().index(marker)
        text = text[:idx] + POLICY_FOOTER + '\n' + text[idx:]

    path.write_text(text, encoding='utf-8')
    print(f'Prepared {path}')
