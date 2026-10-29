#!/usr/bin/env python3
"""Integrera TV-presentationsläge i den befintliga Android-appkoden från ZIP."""
from pathlib import Path
import shutil
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("android-source")
assets = root / "app/src/main/assets"
java_folder = root / "app/src/main/java/se/sionssanger/app"
tv_folder = Path("tv")
index = assets / "index.html"
java = java_folder / "MainActivity.java"
manifest = root / "app/src/main/AndroidManifest.xml"
gradle = root / "app/build.gradle"

for source, destination in [
    (tv_folder / "tv-controls.js", assets / "tv-controls.js"),
    (tv_folder / "reader-presentation.js", assets / "reader-presentation.js"),
    (tv_folder / "tv-display.html", assets / "tv-display.html"),
    (tv_folder / "SionsTvServer.java", java_folder / "SionsTvServer.java"),
]:
    if not source.is_file():
        raise SystemExit(f"Filen saknas: {source}")
    shutil.copy2(source, destination)

def replace_once(contents, original, new, filename):
    if original not in contents:
        raise SystemExit(f"Kunde inte integrera TV-läget i {filename}. Saknar: {original[:80]!r}")
    if contents.count(original) != 1:
        raise SystemExit(f"Flera träffar i {filename}, avbryter för att skydda originalet: {original[:80]!r}")
    return contents.replace(original, new, 1)

html = index.read_text(encoding="utf-8")
html = replace_once(html,
    "function makeSongRow(s,q){const b=el('button','song-row');b.type='button';",
    "function makeSongRow(s,q){const b=el('button','song-row');b.type='button';b.dataset.songNumber=s.song_number==null?'':String(s.song_number);",
    "index.html")
html = replace_once(
    html,
    "refreshLibrary();saveConfig();renderModes();renderCategories();renderList();",
    "window.SionsTvData = function() { return {library: library, activeSong: activeSong, fontSize: config.size}; };\n"
    "refreshLibrary();saveConfig();renderModes();renderCategories();renderList();",
    "index.html",
)
html = replace_once(
    html,
    "</body>",
    '<script src="tv-controls.js"></script>\n<script src="reader-presentation.js"></script>\n</body>',
    "index.html",
)
html = replace_once(html,
    "config.size=Math.max(15,Math.min(35,config.size+n));saveConfig()",
    "config.size=Math.max(15,Math.min(35,config.size+n));saveConfig();window.dispatchEvent(new Event('sions-font-change'))",
    "index.html")
# In catalogue mode only the list of songs scrolls. The existing header,
# search/categories, phone camera/status inset, and bottom navigation stay put.
# The WebView can draw beneath Android's status indicators. Reserve real space
# for the clock, camera cutout, Wi-Fi and battery without touching the reading view.
html = html.replace("</style>", """
#listScreen > header.hero{
  padding-top:max(58px, calc(env(safe-area-inset-top) + 22px))!important;
}
</style>""", 1)

# The reader/TV screens keep their original scrolling and presentation layout.
html = html.replace("</style>", """
@media (orientation:portrait) and (min-height:620px) {
  #listScreen.active{
    display:flex;flex-direction:column;min-height:0;
    height:calc(100dvh - var(--sau-nav-height,82px) - 50px);
    max-height:calc(100dvh - var(--sau-nav-height,82px) - 50px);
    overflow:hidden;
  }
  #listScreen.active>header.hero{flex:0 0 auto}
  #listScreen.active>main{
    display:flex;flex-direction:column;flex:1 1 auto;
    min-height:0;overflow:hidden;
  }
  #listScreen.active>main>:not(#list){
    flex:0 0 auto;min-height:max-content;
    position:relative;z-index:1;
  }
  #listScreen.active #list{
    flex:1 1 auto;min-height:0;overflow-y:auto;
    overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
    padding-bottom:12px;
  }
}
</style>""", 1)


# Compact the library header and navigation without touching the reader,
# music-bar controls, TV panel or the protected status/camera strip.
html = html.replace("</style>", """
/* Compact library chrome; Android status bar/camera clearance is unchanged. */
@media (max-width:810px) {
  #listScreen > header.hero{
    padding-bottom:12px!important;
    margin-bottom:5px!important;
    min-height:0!important;
  }
  #listScreen > header.hero .hero-content{
    padding-bottom:8px!important;
  }
  #listScreen > header.hero .hero-top{
    gap:9px!important;
    align-items:center!important;
    margin-bottom:4px!important;
  }
  #listScreen > header.hero .app-logo{
    width:88px!important;
    height:88px!important;
    max-width:88px!important;
    max-height:88px!important;
    object-fit:contain!important;
  }
  #listScreen > header.hero h1{
    font-size:clamp(25px,5.6vw,31px)!important;
    line-height:1.1!important;
    margin-bottom:2px!important;
  }
  #listScreen > header.hero input[type=search]{
    min-height:46px!important;
    height:46px!important;
  }
  #listScreen > header.hero .search-box,
  #listScreen > header.hero .search-wrap,
  #listScreen > header.hero .search-control{
    min-height:48px!important;
  }
  .bottom-nav{
    height:calc(66px + env(safe-area-inset-bottom))!important;
    min-height:0!important;
    padding:4px 7px calc(4px + env(safe-area-inset-bottom))!important;
    align-items:center!important;
  }
  .bottom-nav .nav-btn{
    min-height:49px!important;
    padding:3px 5px!important;
    gap:2px!important;
    font-size:12px!important;
  }
  .bottom-nav .nav-btn svg{
    max-width:23px!important;
    max-height:23px!important;
  }
}
</style>""", 1)


# Approved 24 Oct 2026 mockup: remove unused vertical spaces, never change the
# original light/gold palette, logo, TV/gear icons or the working audio controls.
# The actual catalogue header contains .hero-top / .hero-note / .search-wrap,
# and the list controls live in .section-heading / .category-strip / .search-mode.
html = html.replace("</style>", """
@media (max-width:810px) {
  #listScreen>header.hero{
    padding-top:max(39px,calc(env(safe-area-inset-top) + 9px))!important;
    padding-bottom:8px!important;
    margin-bottom:2px!important;
  }
  #listScreen>header.hero .hero-content{padding:0 12px 0!important}
  #listScreen>header.hero .hero-top{margin-bottom:7px!important;gap:8px!important}
  #listScreen>header.hero .app-logo{
    width:70px!important;height:70px!important;
    min-width:70px!important;max-width:70px!important;
    min-height:70px!important;max-height:70px!important;
    object-fit:contain!important;
  }
  #listScreen>header.hero .app-name{font-size:clamp(22px,5.5vw,29px)!important;line-height:1.06!important}
  #listScreen>header.hero .tagline{margin:2px 0 0!important;font-size:10px!important}
  /* The results counter is already next to "Alla sånger". */
  #listScreen>header.hero .hero-note{display:none!important}
  #listScreen>header.hero .search-wrap{
    height:45px!important;min-height:45px!important;margin:0!important;
    padding-top:0!important;padding-bottom:0!important;
  }
  #listScreen>header.hero #search{min-height:43px!important;height:43px!important}
  #listScreen.active{
    height:calc(100dvh - 66px - env(safe-area-inset-bottom) - 4px)!important;
    max-height:calc(100dvh - 66px - env(safe-area-inset-bottom) - 4px)!important;
  }
  #listScreen.active>main{padding-top:2px!important}
  #listScreen.active .section-heading{
    min-height:0!important;margin:0 0 3px!important;
    padding:0!important;
  }
  #listScreen.active .section-heading h2{
    font-size:25px!important;line-height:1.15!important;margin:0!important;
  }
  #listScreen.active .category-strip{
    min-height:0!important;padding:1px 0 3px!important;margin:0!important;
    gap:6px!important;
  }
  #listScreen.active .category-strip .chip{
    min-height:35px!important;padding:5px 10px!important;
    margin:0!important;font-size:12px!important;
  }
  #listScreen.active .search-mode{
    min-height:0!important;padding:1px 0 3px!important;margin:0!important;
    gap:5px!important;
  }
  #listScreen.active .search-mode .mode{
    min-height:34px!important;padding:4px 9px!important;
    margin:0!important;font-size:12px!important;
  }
  #listScreen.active #list{padding-top:2px!important;padding-bottom:7px!important;margin-top:0!important}
  /* Existing symbols and background are untouched. */
}
</style>""", 1)


# In the actual Sions reader .song-screen.active is fixed, but it used to be
# the scroll container. Keep .song-top in place and make only #songBody scroll.
# Do not modify the app's text, theme palette, or back/copy/favorite/TV icons.
html = html.replace("</style>", """
@media (max-width:810px) and (orientation:portrait) {
  #songScreen.song-screen.active{
    overflow:hidden!important;
    overscroll-behavior:contain;
  }
  #songScreen .song-inner{
    display:flex!important;flex-direction:column!important;
    height:100dvh!important;min-height:0!important;
    overflow:hidden!important;box-sizing:border-box;
  }
  #songScreen .song-top{
    position:relative!important;top:auto!important;
    flex:0 0 auto!important;z-index:3;
  }
  #songScreen #songBody{
    flex:1 1 auto!important;min-height:0!important;
    overflow-y:auto!important;overflow-x:hidden!important;
    overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;
  }
}
</style>""", 1)


# The original A− and A+ controls were rendered at the END of .lyric-area,
# which caused them to scroll out of sight. tv-controls.js moves the same
# functional buttons directly below .song-top. Keep their row stationary;
# no changes to the original text-size handlers, colour or symbol artwork.
html = html.replace("</style>", """
@media (max-width:810px) {
  #songScreen.song-screen.active{overflow:hidden!important}
  #songScreen .song-inner{
    height:100dvh!important;max-height:100dvh!important;
    display:flex!important;flex-direction:column!important;
    overflow:hidden!important;
  }
  #songScreen .song-top{
    flex:0 0 auto!important;position:relative!important;top:auto!important;
  }
  #songScreen .song-inner>.small-toolbar{
    flex:0 0 auto!important;
    display:flex!important;align-items:center!important;justify-content:center!important;
    gap:12px!important;padding:3px 8px!important;
    min-height:43px!important;
    margin:0!important;
    border-bottom:1px solid var(--border,#ded2bc);
    background:var(--paper,#faf6ec);
    z-index:5!important;
  }
  #songScreen .song-inner>.small-toolbar button{
    min-width:48px!important;min-height:37px!important;
    padding:4px 10px!important;
  }
  #songScreen #songBody{
    flex:1 1 0!important;min-height:0!important;
    overflow-y:auto!important;overflow-x:hidden!important;
    overscroll-behavior-y:contain!important;
    -webkit-overflow-scrolling:touch;
    touch-action:pan-y;
  }
  #songScreen .song-head{padding-top:8px!important}
  #songScreen .song-number-large{margin:3px 0!important;font-size:12px!important}
  #songScreen .song-head h2{
    font-size:clamp(23px,calc(var(--lyric-size,21px)*1.25),34px)!important;
    margin:4px 0 6px!important;line-height:1.12!important;
  }
  #songScreen .ornament{margin:5px 0!important}
  #songScreen .lyric-area{padding-top:3px!important}
  #songScreen .stanza{margin-bottom:10px!important}
}
</style>""", 1)


# Compact Sions song READER (not the catalogue). Existing TV and music
# features are now collapsible within a single narrow utility strip.
# Reading font size and colors are never overridden, only whitespace/leading.
html = html.replace("</style>", """
@media(max-width:810px) {
  #songScreen.song-screen.active{
    overflow:hidden!important;
    overscroll-behavior:none!important;
  }
  #songScreen .song-inner{
    display:flex!important;flex-direction:column!important;
    min-height:0!important;height:100dvh!important;
    max-height:100dvh!important;overflow:hidden!important;
  }
  #songScreen .song-top{
    flex:0 0 auto!important;
    margin:0!important;
    padding:calc(5px + env(safe-area-inset-top)) 8px 5px!important;
    min-height:45px!important;gap:3px!important;
    position:relative!important;top:auto!important;
  }
  #songScreen .song-top .song-top-label{
    min-width:0!important;font-size:13px!important;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  #songScreen .song-top .song-actions{gap:3px!important;flex-wrap:nowrap!important}
  #songScreen .song-top .small-toolbar{
    padding:0!important;margin:0!important;
    background:transparent!important;border:0!important;
    box-shadow:none!important;min-height:0!important;
  }
  #songScreen .song-top .small-toolbar button{
    width:32px!important;min-width:32px!important;
    height:35px!important;min-height:35px!important;
    margin:0!important;padding:2px!important;font-size:14px!important;
  }
  #songScreen .song-top .song-action{
    min-width:35px!important;width:35px!important;
    height:35px!important;min-height:35px!important;
    padding:2px!important;
  }
  #songScreen #songBody{
    flex:1 1 0!important;min-height:0!important;
    overflow-y:auto!important;overscroll-behavior-y:contain!important;
    -webkit-overflow-scrolling:touch;
  }
  #songScreen .song-head{
    padding:4px 10px 0!important;margin:0!important;
  }
  #songScreen .song-number-large{
    margin:2px 0!important;font-size:12px!important;
  }
  #songScreen .song-head h2{
    margin:3px auto 5px!important;
    font-size:clamp(24px,calc(var(--lyric-size,21px)*1.25),34px)!important;
    line-height:1.13!important;
  }
  #songScreen .ornament{
    margin:3px 0!important;line-height:1.1!important;
  }
  #songScreen .song-utility-strip{
    display:flex!important;align-items:flex-start!important;justify-content:center!important;
    gap:5px!important;margin:2px 0 5px!important;padding:0 5px!important;
  }
  #songScreen .lyric-area{
    margin-top:0!important;padding:3px 12px 12px!important;
  }
  #songScreen .stanza{
    margin:0 0 10px!important;
    padding-top:0!important;padding-bottom:0!important;
  }
  #songScreen .stanza-text,#songScreen .verse-line{
    line-height:1.43!important;
  }
  #songScreen .song-category,
  #songScreen .song-meta,
  #songScreen .song-head .subtitle,
  #songScreen .song-head p{
    margin:2px auto 5px!important;
    line-height:1.2!important;
    font-size:12px!important;
  }
}
</style>""", 1)


# On mobile, the line-and-star ornament belonged under the centre-aligned
# title, not flush-left in the reader. Recover a little more space for 4 verses.
# Do not alter users' stored font size or remove the original star symbol.
html = html.replace("</style>", """
@media(max-width:810px){
 #songScreen .song-head .ornament{
   display:flex!important;align-items:center!important;justify-content:center!important;
   width:150px!important;max-width:55%!important;
   margin:2px auto 4px!important;padding:0!important;
   min-height:12px!important;height:12px!important;
   line-height:1!important;text-align:center!important;
   gap:9px!important;
 }
 #songScreen .song-head .ornament:before,
 #songScreen .song-head .ornament:after{
   content:'';display:block!important;
   width:44px!important;max-width:44px!important;flex:0 1 44px!important;
   height:1px!important;margin:0!important;
 }
 #songScreen .song-utility-strip{
   margin:1px auto 3px!important;min-height:0!important;
 }
 #songScreen .song-head h2{
   margin:2px auto 3px!important;line-height:1.09!important;
 }
 #songScreen .song-category,
 #songScreen .song-meta,
 #songScreen .song-head .subtitle,
 #songScreen .song-head p{
   margin:1px auto 3px!important;line-height:1.15!important;
 }
 #songScreen .lyric-area{padding-top:2px!important;padding-bottom:7px!important}
 #songScreen .stanza{margin-bottom:5px!important}
 #songScreen .stanza-text,#songScreen .verse-line{line-height:1.32!important}
}
</style>""", 1)

# Keep titles larger than the verse text, without changing the imported song.
html = html.replace("</style>", """
/* Song heading hierarchy */
.song-head h2{font-size:clamp(38px,calc(var(--lyric-size,21px)*1.7),64px);font-weight:650;line-height:1.16;margin:12px auto;max-width:100%;white-space:normal;overflow-wrap:anywhere}
.song-title{font-size:19px;line-height:1.3}
</style>""", 1)

# Appearance modes preserve every imported word, including original repetition
# signs such as :-:. Book mode follows the printed book's flowing paragraphs,
# whereas song mode adds clear spacing without guessing at poetic line breaks.
html = html.replace("</style>", """
#sions-reader-mode{
  display:inline-flex;align-items:center;gap:2px;padding:2px;
  border:1px solid #d4bd92;border-radius:9px;
  background:rgba(248,235,207,.65);font-family:system-ui,sans-serif;
}
#sions-reader-mode button{
  border:0;border-radius:7px;background:transparent;color:#23435d;
  padding:5px 9px;min-height:27px;min-width:43px;cursor:pointer;
  font:600 12px system-ui,sans-serif;
}
#sions-reader-mode button.active{
  background:#17334d;color:#fff;box-shadow:0 1px 3px #142d4440;
}
#songScreen .song-utility-strip{
  display:flex;justify-content:flex-end!important;align-items:center!important;
  margin:0 12px 4px!important;padding:0!important;min-height:29px!important;
}
#songScreen .stanza-text,#songScreen .verse-line{
  white-space:normal;word-break:normal;overflow-wrap:break-word;
  text-align:left;
}
#songScreen[data-sions-reader-mode="book"] .stanza-text,
#songScreen[data-sions-reader-mode="book"] .verse-line{line-height:1.35!important}
#songScreen[data-sions-reader-mode="book"] .stanza{margin-bottom:8px!important}
#songScreen[data-sions-reader-mode="sing"] .stanza-text,
#songScreen[data-sions-reader-mode="sing"] .verse-line{line-height:1.58!important}
#songScreen[data-sions-reader-mode="sing"] .stanza{margin-bottom:18px!important}
@media(max-width:810px){
  #songScreen .song-inner>.small-toolbar{display:none!important}
  #songScreen .song-top .song-actions>.small-toolbar{
    display:flex!important;align-items:center!important;gap:2px!important;
    flex:0 0 auto!important;white-space:nowrap;
  }
}
</style>""", 1)

# Reader refinement (mobile only): maximize lyric space, avoid invented
# line breaks, and let imported, genuinely distinct lyric lines stand alone
# in song mode. Never change section.lines, title, authors, repeat signs or audio.
html = html.replace("</style>", """
@media(max-width:810px){
  #songScreen .song-head{
    padding:3px 9px 0!important;
  }
  #songScreen .song-authors{
    margin:1px auto 2px!important;
    line-height:1.15!important;
  }
  #songScreen .song-utility-strip{
    justify-content:flex-end!important;
    align-items:center!important;
    flex-wrap:wrap!important;
    gap:4px!important;
    margin:0 10px 3px!important;
    padding:0!important;
    min-height:28px!important;
  }
  #songScreen .song-utility-strip>.sau-song-options{
    flex:0 0 auto!important;
    margin:0!important;
  }
  #songScreen .song-utility-strip>.sau-song-options[open]{
    flex:1 1 100%!important;
  }
  #songScreen .song-utility-strip>.sau-song-options>summary{
    min-height:27px!important;
    padding:4px 8px!important;
    font-size:11px!important;
    line-height:1.2!important;
  }
  #songScreen #sions-reader-mode{
    flex:0 0 auto!important;
    padding:1px!important;
    gap:1px!important;
  }
  #songScreen #sions-reader-mode button{
    min-height:25px!important;
    min-width:38px!important;
    padding:3px 7px!important;
    font-size:11px!important;
  }
  #songScreen .lyric-area{
    width:100%!important;
    max-width:690px!important;
    padding:3px 10px 9px!important;
  }
  #songScreen .stanza{
    gap:8px!important;
    padding-top:0!important;
    padding-bottom:0!important;
  }
  #songScreen .stanza-index{
    flex:0 0 20px!important;
    width:20px!important;
    padding-top:2px!important;
    text-align:right!important;
  }
  #songScreen .stanza-text{
    min-width:0!important;
    overflow-wrap:break-word!important;
    word-break:normal!important;
  }
  #songScreen[data-sions-reader-mode="book"] .stanza{
    margin-bottom:7px!important;
  }
  #songScreen[data-sions-reader-mode="book"] .stanza-text,
  #songScreen[data-sions-reader-mode="book"] .verse-line{
    line-height:1.30!important;
  }
  #songScreen[data-sions-reader-mode="sing"] .stanza{
    margin-bottom:11px!important;
  }
  #songScreen[data-sions-reader-mode="sing"] .stanza-text,
  #songScreen[data-sions-reader-mode="sing"] .verse-line{
    line-height:1.38!important;
  }
  /* A printed paragraph stays a printed paragraph. A structured imported
     stanza becomes line-by-line only when its JSON contains distinct lines. */
  #songScreen[data-sions-reader-mode="book"] .stanza .verse-line,
  #songScreen[data-sions-reader-mode="sing"] .stanza:not([data-sions-explicit-lines="true"]) .verse-line{
    display:inline!important;
    white-space:normal!important;
  }
  #songScreen[data-sions-reader-mode="book"] .stanza .verse-line:not(:last-child)::after,
  #songScreen[data-sions-reader-mode="sing"] .stanza:not([data-sions-explicit-lines="true"]) .verse-line:not(:last-child)::after{
    content:" ";white-space:pre;
  }
  #songScreen[data-sions-reader-mode="sing"] .stanza[data-sions-explicit-lines="true"] .verse-line{
    display:block!important;
    white-space:pre-wrap!important;
    margin:0 0 2px!important;
  }
}
</style>""", 1)

index.write_text(html, encoding="utf-8")

text = java.read_text(encoding="utf-8")
text = replace_once(text, "    private WebView webView;",
    "    private WebView webView;\n    private SionsTvServer tvServer;", "MainActivity.java")
text = replace_once(text, "        setContentView(webView);",
    "        setContentView(webView);\n"
    "        tvServer = new SionsTvServer(this);\n"
    "        tvServer.start();", "MainActivity.java")
bridge = """\
        @JavascriptInterface public String tvAddress() {
            return tvServer == null ? "" : tvServer.getUrl();
        }
        @JavascriptInterface public String tvCode() {
            return tvServer == null ? "" : tvServer.getCode();
        }
        @JavascriptInterface public void tvUpdate(String value) {
            if (tvServer != null) tvServer.update(value);
        }
        @JavascriptInterface public void tvCopy(String value) {
            runOnUiThread(() -> {
                android.content.ClipboardManager clipboard =
                    (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(android.content.ClipData.newPlainText("Sions Sånger TV", value));
                Toast.makeText(MainActivity.this, "TV-adress kopierad", Toast.LENGTH_SHORT).show();
            });
        }
        @JavascriptInterface public void tvKeepAwake(boolean enabled) {
            runOnUiThread(() -> {
                if (enabled) getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }
        @JavascriptInterface public void tvFullscreen(boolean enabled) {
            runOnUiThread(() -> {
                if (enabled) {
                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                    getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
                } else {
                    getWindow().getDecorView().setSystemUiVisibility(0);
                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                }
            });
        }
"""
text = replace_once(text, "    private class AppBridge {\n",
    "    private class AppBridge {\n" + bridge, "MainActivity.java")
text = replace_once(
    text,
    'webView.evaluateJavascript("window.sionsGoBack && window.sionsGoBack()",null);',
    'webView.evaluateJavascript("if (!(window.sionsTvBack && window.sionsTvBack())) { window.sionsGoBack && window.sionsGoBack(); }",null);',
    "MainActivity.java",
)
text = replace_once(text, "    @Override protected void onDestroy() {\n",
    "    @Override protected void onDestroy() {\n"
    "        if (tvServer != null) { tvServer.stop(); tvServer = null; }\n",
    "MainActivity.java",
)
java.write_text(text, encoding="utf-8")

xml = manifest.read_text(encoding="utf-8")
xml = replace_once(xml, "    <application",
    '    <uses-permission android:name="android.permission.INTERNET" />\n'
    '    <application', "AndroidManifest.xml")
xml = replace_once(xml, 'android:name=".MainActivity" android:exported="true"',
    'android:name=".MainActivity" android:exported="true" '
    'android:configChanges="orientation|screenSize|keyboardHidden"', "AndroidManifest.xml")
manifest.write_text(xml, encoding="utf-8")

build = gradle.read_text(encoding="utf-8")
build = replace_once(build, "versionCode 3", "versionCode 17", "app/build.gradle")
build = replace_once(build, "versionName '1.2'", "versionName '1.16'", "app/build.gradle")
gradle.write_text(build, encoding="utf-8")

print("TV-läge integrerat, APK version 1.16. Befintligt sångbibliotek oförändrat.")


common_target = root / "app/src/main/java/se/sabbath/tv/TvLink.java"
common_target.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(tv_folder / "TvLink.java", common_target)
text = java.read_text(encoding="utf-8")
text = text.replace("setContentView(webView);", "setContentView(webView);\n        se.sabbath.tv.TvLink.attach(this,webView);", 1)
text = text.replace('if (tvServer != null) tvServer.update(value);', 'if (tvServer != null) tvServer.update(value);\n            try { org.json.JSONObject v=new org.json.JSONObject(value); org.json.JSONArray lines=v.optJSONArray("lines"); StringBuilder words=new StringBuilder(); if(lines!=null)for(int i=0;i<lines.length();i++){if(i>0)words.append("\\n");words.append(lines.optString(i));} org.json.JSONObject slide=new org.json.JSONObject().put("title",v.optString("title")).put("text",words.toString()).put("label",v.optString("section")).put("wholeVerse",true).put("font",v.optDouble("font",100)).put("blank",v.optBoolean("blank")); se.sabbath.tv.TvLink.slide(MainActivity.this,slide.toString()); } catch(Exception ignored){}')
java.write_text(text, encoding="utf-8")

# Sions uses its own verse controls instead of the generic text-page menu.
common = common_target.read_text(encoding="utf-8")
common = common.replace('button.setText("TV");button.setContentDescription', 'button.setVisibility(View.GONE);button.setText("TV");button.setContentDescription', 1)
common = common.replace('link.update(new JSONObject(json));link.jpeg=null;', 'link.enabled=true;link.update(new JSONObject(json));link.jpeg=null;', 1)
common_target.write_text(common, encoding="utf-8")
text = java.read_text(encoding="utf-8")
text = text.replace('    private class AppBridge {', '''    private class AppBridge {
        @JavascriptInterface public void tvStop() { if(audio!=null)audio.pause();se.sabbath.tv.TvLink.stop(MainActivity.this); }
        @JavascriptInterface public void tvConnect() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent().setComponent(new android.content.ComponentName(
                        "se.churchshow.tvbridge", "se.churchshow.tvbridge.MainActivity")).putExtra("start", true));
                } catch (android.content.ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "Installera Sabbath TV – mobilbrygga först", Toast.LENGTH_LONG).show();
                }
            });
        }
''', 1)
java.write_text(text, encoding="utf-8")

import subprocess
subprocess.run([sys.executable, str(tv_folder / "icons.py"), str(root)], check=True)

# Native private audio storage and player; HTML carries only controls and metadata.
shutil.copy2(tv_folder / "SionsAudio.java", java_folder / "SionsAudio.java")
shutil.copy2(tv_folder / "SionsMidi.java", java_folder / "SionsMidi.java")
for item in ["audio-match.js", "audio-follow.js", "audio-controls.js",
             "audio-mini-player.js", "note-photo-guide.js"]:
    shutil.copy2(tv_folder / item, assets / item)
html = index.read_text(encoding="utf-8")
html = html.replace("fontSize: config.size};", "fontSize: config.size, openSong: openSong};", 1)
audio_scripts = "\\n".join('<script src="' + item + '"></script>' for item in [
    "audio-match.js", "audio-follow.js", "audio-controls.js",
    "audio-mini-player.js", "note-photo-guide.js"
])
html = html.replace("</body>", audio_scripts + "\\n</body>", 1)
index.write_text(html, encoding="utf-8")
text = java.read_text(encoding="utf-8")
text = text.replace("    private SionsTvServer tvServer;", "    private SionsTvServer tvServer;\n    private SionsAudio audio;", 1)
text = text.replace("        setContentView(webView);", "        setContentView(webView);\n        audio = new SionsAudio(this);", 1)
text = text.replace("        super.onActivityResult(requestCode, resultCode, data);", "        super.onActivityResult(requestCode, resultCode, data);\n        if(requestCode == SionsAudio.PICK) { audio.result(resultCode, data); return; }", 1)
text = text.replace("    @Override protected void onDestroy() {", "    @Override protected void onDestroy() {\n        if(audio != null) audio.destroy();", 1)
audio_methods = """
        @JavascriptInterface public void audioImport() { audio.pick(""); }
        @JavascriptInterface public void audioImportFor(String n) { audio.pick(n); }
        @JavascriptInterface public String audioList() { return audio.list(); }
        @JavascriptInterface public String audioStatus() { return audio.status(); }
        @JavascriptInterface public void audioPlay(String n) { audio.play(n); }
        @JavascriptInterface public void audioPause() { audio.pause(); }
        @JavascriptInterface public void audioStop() { audio.stop(); }
        @JavascriptInterface public void audioSeek(String n, double seconds) { audio.seek(n,seconds); }
        @JavascriptInterface public void audioAssign(String n, String source) { audio.assign(n,source); }
        @JavascriptInterface public String audioCues(String n) { return audio.cues(n); }
        @JavascriptInterface public void audioCue(String n, int verse, double seconds) { audio.cue(n,verse,seconds); }
        @JavascriptInterface public void audioClearCues(String n) { audio.clearCues(n); }
"""
text = text.replace("    private class AppBridge {", "    private class AppBridge {" + audio_methods, 1)
java.write_text(text, encoding="utf-8")

shutil.copy2(tv_folder / "AudioProvider.java", java_folder / "AudioProvider.java")
xml=manifest.read_text(encoding="utf-8")
xml=xml.replace("    <application", '<queries><package android:name="se.churchshow.tvbridge" /></queries>\n    <application', 1)
xml=xml.replace("</application>", '<provider android:name="se.sionssanger.app.AudioProvider" android:authorities="${applicationId}.audio" android:exported="false" android:grantUriPermissions="true" />\n    </application>', 1)
manifest.write_text(xml, encoding="utf-8")
text=java.read_text(encoding="utf-8")
text=text.replace("    private class AppBridge {", "    private class AppBridge {\n        @JavascriptInterface public void audioTargetTv(boolean enabled) { audio.target(enabled); }", 1)
java.write_text(text, encoding="utf-8")

# Same personal colour controls in the regular and separate TV apps.
shutil.copy2(tv_folder / "appearance.js", assets / "appearance.js")
html=index.read_text(encoding="utf-8")
html=replace_once(html,"</body>",'<script src="appearance.js"></script>\n</body>',"index.html")
index.write_text(html,encoding="utf-8")

# Both apps start without any bundled lyrics. Existing imports use the same key.
from empty_library import empty_library
index.write_text(empty_library(index.read_text(encoding="utf-8")),encoding="utf-8")
