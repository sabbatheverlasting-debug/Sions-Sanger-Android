#!/usr/bin/env python3
"""Android icon resources: full-bleed adaptive artwork and a distinct TV badge."""
from pathlib import Path
import sys

root = Path(sys.argv[1])
tv = len(sys.argv) > 2 and sys.argv[2] == "tv"
res = root / "app/src/main/res"
drawable = res / "drawable"
adaptive = res / "mipmap-anydpi-v26"
drawable.mkdir(parents=True, exist_ok=True)
adaptive.mkdir(parents=True, exist_ok=True)
(drawable / "sions_icon_fullbleed.xml").write_text('''<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@drawable/sions_icon" android:gravity="fill" android:antialias="true" />''', encoding="utf-8")
(drawable / "sions_icon_clear.xml").write_text('''<vector xmlns:android="http://schemas.android.com/apk/res/android"
 android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
 <path android:fillColor="#00000000" android:pathData="M0,0H108V108H0Z"/>
</vector>''', encoding="utf-8")
(drawable / "sions_tv_badge.xml").write_text('''<vector xmlns:android="http://schemas.android.com/apk/res/android"
 android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
 <path android:fillColor="#F0C66F" android:strokeColor="#0B2740" android:strokeWidth="1.5"
 android:pathData="M54,60H84Q88,60 88,64V78Q88,82 84,82H54Q50,82 50,78V64Q50,60 54,60Z"/>
 <path android:fillColor="#0B2740" android:pathData="M55,65H69V68H63.5V77H60.5V68H55Z M70,65H73.5L77,73.5L80.5,65H84L78.8,77H75.2Z"/>
</vector>''', encoding="utf-8")
foreground = "@drawable/sions_tv_badge" if tv else "@drawable/sions_icon_clear"
(adaptive / "sions_launcher.xml").write_text(f'''<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
 <background android:drawable="@drawable/sions_icon_fullbleed"/>
 <foreground android:drawable="{foreground}"/>
</adaptive-icon>''', encoding="utf-8")
legacy = res / "mipmap-anydpi"
legacy.mkdir(parents=True, exist_ok=True)
(legacy / "sions_launcher.xml").write_text(
    '<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@drawable/sions_icon_fullbleed"/>'
    + ('<item android:drawable="@drawable/sions_tv_badge"/>' if tv else '')
    + '</layer-list>', encoding="utf-8")
manifest = root / "app/src/main/AndroidManifest.xml"
text = manifest.read_text(encoding="utf-8")
text = text.replace('android:icon="@drawable/sions_icon"', 'android:icon="@mipmap/sions_launcher" android:roundIcon="@mipmap/sions_launcher"')
manifest.write_text(text, encoding="utf-8")
print("Full-bleed adaptive icon: " + ("TV badge" if tv else "original artwork"))
