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

# The shared build already removed bundled lyrics; keep this step idempotent.
from empty_library import empty_library
index=root / "app/src/main/assets/index.html"
index.write_text(empty_library(index.read_text(encoding="utf-8")),encoding="utf-8")

print("Separat testapp skapad: se.sionssanger.tv, Sions Sånger TV")

import subprocess
subprocess.run([sys.executable, str(Path(__file__).with_name("icons.py")), str(root), "tv"], check=True)
