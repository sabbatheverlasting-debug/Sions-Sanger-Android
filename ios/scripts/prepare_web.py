#!/usr/bin/env python3
"""Prepare the existing reader for iOS without including any song texts."""
from pathlib import Path
import json
import re
import shutil
import zipfile

repo = Path(__file__).resolve().parents[2]
web = repo / 'ios/SionsSanger/Web'
web.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(repo / 'Sions_Sanger_Android_Officiell_Build_1.2.zip') as z:
    html = z.read('app/src/main/assets/index.html').decode('utf-8')
    icon = z.read('app/src/main/assets/assets/icon-512.png')
pattern = r'(<script\b[^>]*\bid="initialSongs"[^>]*>)(.*?)(</script>)'
assert len(list(re.finditer(pattern, html, re.S))) == 1
html = re.sub(pattern, lambda m: m[1] + json.dumps({'name': 'Sions Sånger', 'language': 'sv', 'songs': []}, ensure_ascii=False) + m[3], html, flags=re.S)
def replace(old, new):
    global html
    if old not in html and new in html:
        return
    assert html.count(old) == 1, old[:100]
    html = html.replace(old, new, 1)
replace('<strong>62</strong> sånger', '<strong>0</strong> sånger')
replace('id="allSongsCount">62</strong>', 'id="allSongsCount">0</strong>')
replace('Ursprungsversionen innehåller 62 sånger från ditt Sions Sånger-material.', 'Biblioteket är tomt från början. Importera alla sånger manuellt via JSON-filer.')
replace('Ta bort alla dina importerade JSON-sånger? De 62 ursprungliga sångerna finns kvar.', 'Ta bort alla dina importerade JSON-sånger? Biblioteket blir då tomt.')
replace('Sions Sånger • Version 1.0', 'Sions Sånger TV • iPhone 1.0')
replace('function makeSongRow(s,q){const b=el(\'button\',\'song-row\');b.type=\'button\';', 'function makeSongRow(s,q){const b=el(\'button\',\'song-row\');b.type=\'button\';b.dataset.songNumber=s.song_number==null?\'\':String(s.song_number);')
replace('refreshLibrary();saveConfig();renderModes();renderCategories();renderList();', '''window.SionsImportTexts = function(files){return importFiles(files.map(f=>({name:f.name,text:async()=>f.text})));};
window.SionsTvData = function(){return {library:library,activeSong:activeSong,fontSize:config.size,openSong:openSong};};
refreshLibrary();saveConfig();renderModes();renderCategories();renderList();''')
replace('config.size=Math.max(15,Math.min(35,config.size+n));saveConfig()', "config.size=Math.max(15,Math.min(35,config.size+n));saveConfig();window.dispatchEvent(new Event('sions-font-change'))")
replace('</body>', '<script src="tv-controls.js"></script><script src="audio-controls.js"></script></body>')
replace('</style>', '''.song-head h2{font-size:clamp(36px,calc(var(--lyric-size,21px)*1.7),64px);line-height:1.14;overflow-wrap:anywhere}
.song-title{font-size:19px}.hero{padding-top:20px}
</style>''')
(web / 'index.html').write_text(html, encoding='utf-8')
shutil.copy2(repo / 'ios/ios-bridge.js', web / 'ios-bridge.js')
shutil.copy2(repo / 'tv/tv-display.html', web / 'tv-display.html')
tv = (repo / 'tv/tv-controls.js').read_text()
start = tv.index("      '<div class=\"stv-card\"><div class=\"stv-strong\">1.")
end = tv.index("\n", tv.index("2. Välj sång</div>", start)) + 1
tv = tv[:start] + '''      '<div class="stv-card"><div class="stv-strong">1. TV och AirPlay</div>' +
      '<p class="stv-muted">För ljud: tryck AirPlay. För bild: öppna Kontrollcenter på iPhone och välj Skärmdubblering. Du kan också öppna adressen nedan i TV:ns webbläsare på samma Wi-Fi. Låt iPhone-appen vara öppen.</p>' +
      '<div class="stv-flex"><button class="stv-btn" id="stv-connect">AirPlay-ljud</button><button class="stv-btn secondary" id="stv-stop">Avsluta TV och ljud</button></div><details><summary>Visa adress för TV-webbläsare</summary>' +
      '<div id="stv-url" class="stv-address"></div><div class="stv-flex"><button class="stv-btn" id="stv-copy">Kopiera TV-adress</button><button class="stv-btn secondary" id="stv-refresh">Uppdatera adress</button></div><div id="sions-tv-message" role="status"></div>' +
      '<div class="stv-flex"><button id="stv-mirror" class="stv-btn secondary">Skärmdubblering</button></div></details></div><div class="stv-card"><div class="stv-strong">2. Välj sång</div>' +
''' + tv[end:]
tv = tv.replace('Installera Sabbath TV – mobilbrygga.', 'Öppna Kontrollcenter för skärmdubblering eller välj en AirPlay-ljudenhet.')
(web / 'tv-controls.js').write_text(tv, encoding='utf-8')
audio = (repo / 'tv/audio-controls.js').read_text()
audio = audio.replace('Importera ljud / ZIP', 'Importera ljudfiler')
audio = audio.replace('Importera MP3 eller Opus, även många filer i en ZIP. Sångnummer i filnamnet kopplar ljudet automatiskt. Saknad sångtext kan läggas till senare.', 'Importera MP3, M4A eller WAV från Filer. Sångnummer i filnamnet kopplar ljudet automatiskt. Välj flera filer eller koppla ett ljud manuellt till en sång. Packa upp ZIP-filer i Filer först.')
audio = audio.replace("tvLabel.appendChild(document.createTextNode(' Ljud på TV (mobilen tyst)'));opts.appendChild(tvLabel);", "tvLabel.appendChild(document.createTextNode(' AirPlay'));tvLabel.hidden=true;opts.appendChild(tvLabel);opts.appendChild(button('Välj AirPlay-ljudenhet',function(){native.tvConnect();}));")
audio = audio.replace('Starta mobilbryggan och anslut LG-appen. Om TV:n nekar automatisk uppspelning: tryck Aktivera ljud på TV:n. MP3 rekommenderas för TV.', 'Ljud skickas via iPhones valda ljudutgång. TV-webbläsaren visar sångtext; välj AirPlay om ljudet ska spelas på TV.')
(web / 'audio-controls.js').write_text(audio, encoding='utf-8')
assets = repo / 'ios/SionsSanger/Assets.xcassets'
(assets / 'AppIcon.appiconset').mkdir(parents=True, exist_ok=True)
(assets / 'Contents.json').write_text(json.dumps({'info': {'version': 1, 'author': 'xcode'}}))
(assets / 'AppIcon.appiconset/Contents.json').write_text(json.dumps({'images': [{'filename': 'AppIcon.png', 'idiom': 'universal', 'platform': 'ios', 'size': '1024x1024'}], 'info': {'version': 1, 'author': 'xcode'}}))
(assets / 'AppIcon.appiconset/AppIcon-source.png').write_bytes(icon)
assert json.loads(re.search(pattern, html, re.S)[2])['songs'] == []
print('iOS reader prepared: empty song library, JSON import, native audio bridge, TV controls')
