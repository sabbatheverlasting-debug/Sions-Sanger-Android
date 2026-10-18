#!/usr/bin/env python3
"""Gör en separat TV-testapp som inte ersätter tidigare installation av Sions Sånger."""
from pathlib import Path
import sys
import json
import re

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("android-source")
gradle = root / "app/build.gradle"
manifest = root / "app/src/main/AndroidManifest.xml"

source = gradle.read_text(encoding="utf-8")
old = "applicationId 'se.sionssanger.app'"
new = "applicationId 'se.sionssanger.tv'"
if source.count(old) != 1:
    raise SystemExit("Avbröt: kunde inte identifiera originalappens paket-id entydigt.")
gradle.write_text(source.replace(old, new, 1), encoding="utf-8")

source = manifest.read_text(encoding="utf-8")
old = 'android:label="Sions Sånger"'
new = 'android:label="Sions Sånger TV"'
if source.count(old) != 1:
    raise SystemExit("Avbröt: kunde inte identifiera appens namn entydigt.")
manifest.write_text(source.replace(old, new, 1), encoding="utf-8")

# Only the TV variant starts empty. Saved manual imports keep their existing key.
index = root / "app/src/main/assets/index.html"
html = index.read_text(encoding="utf-8")
pattern = r'(<script\b[^>]*\bid="initialSongs"[^>]*>)(.*?)(</script>)'
matches = list(re.finditer(pattern, html, re.S))
if len(matches) != 1:
    raise SystemExit("Avbröt: kunde inte identifiera det inbyggda sångbiblioteket.")
match = matches[0]
initial = json.loads(match.group(2))
if len(initial["songs"]) != 62:
    raise SystemExit("Avbröt: det förväntade biblioteket med 62 sånger saknas.")
initial["songs"] = []
html = html[:match.start(2)] + json.dumps(initial, ensure_ascii=False) + html[match.end(2):]
for old, new in [
    ('<strong>62</strong> sånger', '<strong>0</strong> sånger'),
    ('id="allSongsCount">62</strong>', 'id="allSongsCount">0</strong>'),
    ('Ursprungsversionen innehåller 62 sånger från ditt Sions Sånger-material.',
     'Biblioteket är tomt från början. Importera alla sånger manuellt via JSON-filer.'),
    ('Ta bort alla dina importerade JSON-sånger? De 62 ursprungliga sångerna finns kvar.',
     'Ta bort alla dina importerade JSON-sånger? Biblioteket blir då tomt.'),
    ('<strong>Inga sånger hittades</strong><span>Prova ett annat sångnummer, ord eller en annan mening.</span>',
     '<strong>Inga sånger hittades</strong><span>' + "'+(library.length?'Prova ett annat sångnummer, ord eller en annan mening.':'Biblioteket är tomt. Välj Mer och sedan Importera JSON-filer för att lägga till sånger.')+'" + '</span>'),
]:
    if html.count(old) != 1:
        raise SystemExit("Avbröt: oväntad apptext: " + old)
    html = html.replace(old, new, 1)
index.write_text(html, encoding="utf-8")

print("Separat testapp skapad: se.sionssanger.tv, Sions Sånger TV")

import subprocess
subprocess.run([sys.executable, str(Path(__file__).with_name("icons.py")), str(root), "tv"], check=True)
