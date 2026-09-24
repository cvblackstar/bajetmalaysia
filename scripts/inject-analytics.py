from pathlib import Path

MEASUREMENT_ID = "G-SKRD4Q889Y"
SNIPPET = f'''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{MEASUREMENT_ID}', {{
    anonymize_ip: true
  }});
</script>'''

for path in Path('.').glob('*.html'):
    text = path.read_text(encoding='utf-8')
    if MEASUREMENT_ID in text:
        continue
    marker = '</head>'
    if marker not in text.lower():
        continue
    idx = text.lower().index(marker)
    text = text[:idx] + SNIPPET + '\n' + text[idx:]
    path.write_text(text, encoding='utf-8')
    print(f'Injected GA4 into {path}')
