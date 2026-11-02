import json
import pathlib
import shutil
import tempfile
import unittest
from prepare_play_build import prepare


class PlayBuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        (self.root / 'app/src/main/assets').mkdir(parents=True)
        (self.root / 'gradle/wrapper').mkdir(parents=True)
        (self.root / 'app/src/main/assets/index.html').write_text('<title>Sions Sånger</title><h1 class="app-name">Sions Sånger</h1><script id="initialSongs" type="application/json">{"songs":[]}</script>')
        (self.root / 'app/src/main/AndroidManifest.xml').write_text('<manifest><application/></manifest>')
        (self.root / 'app/build.gradle').write_text("android { compileSdk 35; defaultConfig { applicationId 'se.sionssanger.app'; targetSdk 35; versionCode 3; versionName '1.2' } }")
        (self.root / 'build.gradle').write_text("id 'com.android.application' version '8.9.2'")

    def tearDown(self):
        self.tmp.cleanup()

    def test_review_embeds_eight_and_configures_signed_release(self):
        prepare(self.root, 'rights/eight-song-text-drafts.json', True, 200001)
        html = (self.root / 'app/src/main/assets/index.html').read_text()
        self.assertIn('Granskning', html)
        self.assertIn('Lova den Herre', html)
        self.assertIn('song_number":415', html)
        gradle = (self.root / 'app/build.gradle').read_text()
        self.assertIn('targetSdk 36', gradle)
        self.assertIn('debuggable false', gradle)
        self.assertIn('signingConfig signingConfigs.playRelease', gradle)
        self.assertNotIn('applicationIdSuffix', gradle)

    def test_unapproved_drafts_cannot_become_public_build(self):
        with self.assertRaisesRegex(ValueError, 'BLOCKERAD'):
            prepare(self.root, 'rights/eight-song-text-drafts.json', False, 200001)

    def test_missing_verse_blocks_review_build(self):
        data = json.loads(pathlib.Path('rights/eight-song-text-drafts.json').read_text())
        data['songs'][0]['verses'] = []
        p = self.root / 'bad.json'
        p.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'Missing verses'):
            prepare(self.root, p, True, 200001)

    def test_media_reference_blocks_draft_build(self):
        data = json.loads(pathlib.Path('rights/eight-song-text-drafts.json').read_text())
        data['songs'][0]['audioFile'] = 'unchecked.mp3'
        p = self.root / 'bad.json'
        p.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'lyrics only'):
            prepare(self.root, p, True, 200001)


if __name__ == '__main__':
    unittest.main()
