#!/usr/bin/env python3
"""Build a public Sions Sånger APK source tree without bundling uncleared hymns."""
import argparse
import json
import pathlib
import re
import sys
import zipfile

REQUIRED_RIGHTS = ("originalText", "swedishEdition", "melody", "arrangement")
SONG_TAG = re.compile(r'(<script\\b(?=[^>]*\\bid=["\\\']initialSongs["\\\'])[^>]*>)(.*?)(</script\\s*>)', re.S | re.I)

def verified_songs(manifest, count=20):
    if not isinstance(manifest, dict) or manifest.get("releaseAllowed") is not True or manifest.get("rightsCleared") is not True:
        raise ValueError("PUBLICERING BLOCKERAD: Samlat rättighetsgodkännande saknas.")
    songs = manifest.get("songs", [])
    if len(songs) != count:
        raise ValueError(f"PUBLICERING BLOCKERAD: Exakt {count} godkända sånger krävs (hittade {len(songs)}).")
    seen = set()
    for song in songs:
        sid = str(song.get("id", ""))
        if not sid or sid in seen or not song.get("title"):
            raise ValueError("Saknade/dubblerade sångnummer eller titlar.")
        seen.add(sid)
        if song.get("releaseAllowed") is not True: raise ValueError(f"Sång {sid}: individuellt klartecken saknas.")
        rights = song.get("rights") or {}
        for field in REQUIRED_RIGHTS:
            if rights.get(field) != "cleared": raise ValueError(f"Sång {sid}: {field} ej klarerat.")
        if song.get("audioFile") and rights.get("recording") != "cleared":
            raise ValueError(f"Sång {sid}: inspelningen är inte klarerad.")
        if song.get("musicXmlFile") and song.get("scoreVerified") is not True:
            raise ValueError(f"Sång {sid}: notsatsen är inte kontrollerad.")
        evidence = song.get("rightsEvidence")
        if not isinstance(evidence, list) or not evidence:
            raise ValueError(f"Sång {sid}: dokumenterat källunderlag saknas.")
        for entry in evidence:
            if not isinstance(entry, dict) or not entry.get("sourceUrl") or not entry.get("checkedBy") or not entry.get("checkedOn") or not entry.get("specificEdition"):
                raise ValueError(f"Sång {sid}: ofullständigt rättighetsunderlag.")
        verses = song.get("verses")
        if not isinstance(verses, list) or not verses or not all(isinstance(x,str) and len(x.strip())>2 for x in verses):
            raise ValueError(f"Sång {sid}: fullständiga verser saknas.")
    return songs

def replace_embedded_songs(html, songs):
    matches = list(SONG_TAG.finditer(html))
    if len(matches) != 1:
        raise ValueError(f"Väntade ett initialSongs-element, fann {len(matches)}.")
    match = matches[0]
    old = json.loads(match.group(2))
    if not isinstance(old, dict) or not isinstance(old.get("songs"), list):
        raise ValueError("Appens befintliga sånglista har oväntat format.")
    # Use validated manifest content ONLY, never copy song texts from old private app.
    clean = []
    for song in songs:
        clean.append({"id": str(song["id"]), "title": song["title"], "verses": song["verses"],
                      "category": song.get("category", "Lovsånger"), "author": song.get("author", ""),
                      "composer": song.get("composer", "")})
    payload = json.dumps({"songs": clean}, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    result = html[:match.start(2)] + payload + html[match.end(2):]
    if result.count('id="initialSongs"') + result.count("id='initialSongs'") != 1:
        raise ValueError("Unexpectedly duplicated song-data element.")
    return result, len(old["songs"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="rights/public-release-manifest.json")
    ap.add_argument("--source-zip", default="Sions_Sanger_Android_Officiell_Build_1.2.zip")
    ap.add_argument("--output-dir", required=True)
    ap.add_argument("--count", type=int, default=20)
    args = ap.parse_args()
    songs = verified_songs(json.loads(pathlib.Path(args.manifest).read_text(encoding="utf-8")), args.count)
    out = pathlib.Path(args.output_dir)
    if out.exists() and any(out.iterdir()): raise ValueError("Målkatalogen måste vara tom.")
    with zipfile.ZipFile(args.source_zip) as archive:
        paths = [pathlib.PurePosixPath(x.filename) for x in archive.infolist()]
        if any(p.is_absolute() or ".." in p.parts for p in paths): raise ValueError("Farligt ZIP-innehåll.")
        if "app/src/main/assets/index.html" not in [str(x) for x in paths]:
            raise ValueError("Appens index.html saknas.")
        out.mkdir(parents=True, exist_ok=True)
        archive.extractall(out)
    index = out / "app/src/main/assets/index.html"
    text = index.read_text(encoding="utf-8")
    new, old_count = replace_embedded_songs(text, songs)
    index.write_text(new, encoding="utf-8")
    # Validate actual packaged HTML, rather than trusting configuration alone.
    m = SONG_TAG.search(index.read_text(encoding="utf-8"))
    found = json.loads(m.group(2))["songs"] if m else []
    if len(found) != args.count or {str(s["id"]) for s in found} != {str(s["id"]) for s in songs}:
        raise ValueError("Publiceringskontrollen misslyckades efter paketering.")
    print(f"KLAR FÖR TEKNISK APK-BYGGNAD: {old_count} inbyggda poster ersattes med {len(found)} kontrollerade. Juridisk slutkontroll kvarstår.")

if __name__ == "__main__":
    try: main()
    except (OSError, ValueError, zipfile.BadZipFile, json.JSONDecodeError) as e:
        sys.exit(str(e))
