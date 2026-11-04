"""Prepare a signed release build; draft lyrics remain explicitly review-only."""
import argparse
import json
import pathlib
import re
import xml.etree.ElementTree as ET
from build_public_source import replace_embedded_songs, verified_songs

EXPECTED_IDS = {'7', '9', '20', '22', '31a', '31b', '46', '50'}


def prepare(root, manifest_path, review, version_code):
    root = pathlib.Path(root)
    data = json.loads(pathlib.Path(manifest_path).read_text(encoding='utf-8'))
    songs = data.get('songs', [])
    if review:
        if data.get('mode') != 'draft-only' or data.get('releaseAllowed') is not False:
            raise ValueError('Review build requires an explicitly non-public draft manifest')
        if {str(s.get('id')) for s in songs} != EXPECTED_IDS or len(songs) != 8:
            raise ValueError('Expected exactly the eight selected hymns')
        for song in songs:
            if not song.get('verses') or not all(isinstance(v, str) and v.strip() for v in song['verses']):
                raise ValueError('Missing verses: ' + song['id'])
            if song.get('audioFile') or song.get('musicXmlFile'):
                raise ValueError('Draft build includes lyrics only')
    else:
        if data.get('mode') != 'text-only-release' or data.get('expectedSongCount') != 2 or data.get('expectedSongIds') != ['9', '50']:
            raise ValueError('PUBLICERING BLOCKERAD: Expected the two selected text-only hymns')
        songs = verified_songs(data, count=2)
        if {str(s.get('id')) for s in songs} != {'9', '50'} or any(s.get('contentScope') != 'text-only' for s in songs):
            raise ValueError('Unexpected public song selection')
    index = root / 'app/src/main/assets/index.html'
    html, _ = replace_embedded_songs(index.read_text(encoding='utf-8'), songs)
    html = html.replace('Biblioteket är tomt från början. Importera alla sånger manuellt via JSON-filer.',
                        f'{len(songs)} sångtexter ingår. Egna sånger, noter och ljud kan importeras.')
    html = html.replace('Ta bort alla dina importerade JSON-sånger? Biblioteket blir då tomt.',
                        f'Ta bort alla dina importerade JSON-sånger? De {len(songs)} inbyggda sångtexterna finns kvar.')
    # Expose edition information per hymn; these are not promised as exact 1948 texts.
    credits = [{'id': s['id'], 'title': s['title'], 'edition': s.get('specificEdition'),
                'source': s.get('sourceUrl'), 'notes': s.get('notes')} for s in songs]
    if review:
        html = html.replace('<title>Sions Sånger</title>', '<title>Sions Sånger – granskning</title>', 1)
        html = html.replace('class="app-name">Sions Sånger', 'class="app-name">Sions Sånger · Granskning', 1)
    index.write_text(html, encoding='utf-8')
    (index.parent / 'song-sources.json').write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding='utf-8')
    (index.parent / 'BUILD-STATUS.txt').write_text(
        'GRANSKNINGSVERSION. Sångtexterna är inte godkända för offentlig publicering.\n' if review else
        'Två äldre sångtexter, källgranskade för Sverige. Inga noter eller ljud ingår. Inte Google Play-godkännande.\n', encoding='utf-8')
    gradle = root / 'app/build.gradle'
    text = gradle.read_text(encoding='utf-8')
    for pattern, replacement in [(r'compileSdk\s+\d+', 'compileSdk 36'),
                                 (r'targetSdk\s+\d+', 'targetSdk 36'),
                                 (r'versionCode\s+\d+', f'versionCode {version_code}'),
                                 (r"versionName\s+'[^']+'", "versionName '1.22" + ('-review' if review else '') + "'")]:
        text, n = re.subn(pattern, replacement, text)
        if n != 1:
            raise ValueError('Ambiguous Gradle setting: ' + pattern)
    if "applicationId 'se.sionssanger.app'" not in text or 'applicationIdSuffix' in text:
        raise ValueError('Unexpected application ID configuration')
    text += '''
android {
    signingConfigs {
        playRelease {
            storeFile rootProject.file('sions-signing.p12')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
            storeType 'PKCS12'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.playRelease
            debuggable false
            minifyEnabled false
        }
    }
}
'''
    gradle.write_text(text, encoding='utf-8')
    project_gradle = root / 'build.gradle'
    project_gradle.write_text(project_gradle.read_text().replace("version '8.9.2'", "version '8.10.1'"), encoding='utf-8')
    (root / 'gradle/wrapper/gradle-wrapper.properties').write_text(
        'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-bin.zip\n', encoding='utf-8')
    # Refuse a debug-enabled manifest even if Gradle is configured correctly.
    manifest = ET.parse(root / 'app/src/main/AndroidManifest.xml')
    if manifest.getroot().find('application').get('{http://schemas.android.com/apk/res/android}debuggable') == 'true':
        raise ValueError('Manifest enables debugging')
    return len(songs)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True)
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--review', action='store_true')
    ap.add_argument('--version-code', type=int, required=True)
    args = ap.parse_args()
    print('Prepared', prepare(args.root, args.manifest, args.review, args.version_code), 'hymns')
