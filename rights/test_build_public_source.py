import json
import pathlib
import tempfile
import unittest

from build_public_source import SONG_TAG, replace_embedded_songs, verified_songs


class TestPublicRelease(unittest.TestCase):
    def test_missing_clearance_fails_closed(self):
        m = json.loads(pathlib.Path("rights/public-release-manifest.json").read_text(encoding="utf-8"))
        with self.assertRaisesRegex(ValueError, "BLOCKERAD"):
            verified_songs(m)

    def test_replaces_all_existing_bundled_songs(self):
        html = '<script id="initialSongs" type="application/json">{"songs":[{"title":"protected"}]}</script>'
        songs = [{"id":"7", "title":"Nu tacken Gud, allt folk", "verses":["Här är en hel vers\\nPå en ny rad"], "authors":["M. Rinckart"]}]
        result, n = replace_embedded_songs(html, songs)
        self.assertEqual(n, 1)
        entry = json.loads(SONG_TAG.search(result).group(2))["songs"][0]
        self.assertEqual(entry["song_number"],7)
        self.assertEqual(entry["sections"][0]["lines"], ["Här är en hel vers", "På en ny rad"])
        self.assertNotIn("protected",result)

    def test_nonempty_unexpected_markup_fails(self):
        with self.assertRaises(ValueError):
            replace_embedded_songs("<html>no song data</html>", [])

    def test_cannot_clear_without_evidence(self):
        m = {"releaseAllowed": True, "rightsCleared": True, "songs": [{
            "id": "7", "title": "Nu tacken Gud", "verses": ["Rad 1\\nRad 2"],
            "releaseAllowed": True, "rights": {k: "cleared" for k in ("originalText","swedishEdition","melody","arrangement")}
        }]}
        with self.assertRaisesRegex(ValueError, "underlag"):
            verified_songs(m, 1)


if __name__ == "__main__":
    unittest.main()
