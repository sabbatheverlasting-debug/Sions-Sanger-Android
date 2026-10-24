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
    '<script src="tv-controls.js"></script>\n</body>',
    "index.html",
)
html = replace_once(html,
    "config.size=Math.max(15,Math.min(35,config.size+n));saveConfig()",
    "config.size=Math.max(15,Math.min(35,config.size+n));saveConfig();window.dispatchEvent(new Event('sions-font-change'))",
    "index.html")
# In catalogue mode only the list of songs scrolls. The existing header,
# search/categories, phone camera/status inset, and bottom navigation stay put.
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

# Keep titles larger than the verse text, without changing the imported song.
html = html.replace("</style>", """
/* Song heading hierarchy */
.song-head h2{font-size:clamp(38px,calc(var(--lyric-size,21px)*1.7),64px);font-weight:650;line-height:1.16;margin:12px auto;max-width:100%;white-space:normal;overflow-wrap:anywhere}
.song-title{font-size:19px;line-height:1.3}
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
shutil.copy2(tv_folder / "audio-controls.js", assets / "audio-controls.js")
shutil.copy2(tv_folder / "audio-mini-player.js", assets / "audio-mini-player.js")
html = index.read_text(encoding="utf-8")
html = html.replace("fontSize: config.size};", "fontSize: config.size, openSong: openSong};", 1)
html = html.replace('</body>', '<script src="audio-controls.js"></script>\n<script src="audio-mini-player.js"></script>\n</body>', 1)
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
