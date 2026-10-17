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
html = replace_once(
    html,
    "refreshLibrary();saveConfig();renderModes();renderCategories();renderList();",
    "window.SionsTvData = function() { return {library: library, activeSong: activeSong}; };\n"
    "refreshLibrary();saveConfig();renderModes();renderCategories();renderList();",
    "index.html",
)
html = replace_once(
    html,
    "</body>",
    '<script src="tv-controls.js"></script>\n</body>',
    "index.html",
)
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
build = replace_once(build, "versionCode 3", "versionCode 5", "app/build.gradle")
build = replace_once(build, "versionName '1.2'", "versionName '1.4'", "app/build.gradle")
gradle.write_text(build, encoding="utf-8")

print("TV-läge integrerat, APK version 1.4. Befintligt sångbibliotek oförändrat.")


common_target = root / "app/src/main/java/se/sabbath/tv/TvLink.java"
common_target.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(tv_folder / "TvLink.java", common_target)
text = java.read_text(encoding="utf-8")
text = text.replace("setContentView(webView);", "setContentView(webView);\n        se.sabbath.tv.TvLink.attach(this,webView);", 1)
text = text.replace('if (tvServer != null) tvServer.update(value);', 'if (tvServer != null) tvServer.update(value);\n            try { org.json.JSONObject v=new org.json.JSONObject(value); org.json.JSONArray lines=v.optJSONArray("lines"); StringBuilder words=new StringBuilder(); if(lines!=null)for(int i=0;i<lines.length();i++){if(i>0)words.append("\\n");words.append(lines.optString(i));} org.json.JSONObject slide=new org.json.JSONObject().put("title",v.optString("title")).put("text",words.toString()).put("label",v.optString("section")).put("blank",v.optBoolean("blank")); se.sabbath.tv.TvLink.slide(MainActivity.this,slide.toString()); } catch(Exception ignored){}')
java.write_text(text, encoding="utf-8")

# Sions uses its own verse controls instead of the generic text-page menu.
common = common_target.read_text(encoding="utf-8")
common = common.replace('button.setText("TV");button.setContentDescription', 'button.setVisibility(View.GONE);button.setText("TV");button.setContentDescription', 1)
common = common.replace('link.update(new JSONObject(json));link.jpeg=null;', 'link.enabled=true;link.update(new JSONObject(json));link.jpeg=null;', 1)
common_target.write_text(common, encoding="utf-8")
text = java.read_text(encoding="utf-8")
text = text.replace('    private class AppBridge {', '''    private class AppBridge {
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
