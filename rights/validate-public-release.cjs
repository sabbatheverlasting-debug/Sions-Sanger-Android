#!/usr/bin/env node
'use strict';
// Safety check before including hymn data in an app distribution.
// Fail closed: incomplete/missing rights evidence prevents packaging.
const fs = require('node:fs');
const path = require('node:path');
const manifestFile = process.argv[2] || path.join(__dirname, 'public-release-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
function fail(message) { console.error('BLOCKERAD: ' + message); process.exit(1); }
if (manifest.releaseAllowed !== true || manifest.rightsCleared !== true) fail('övergripande publiceringstillstånd saknas');
if (!Array.isArray(manifest.songs) || manifest.songs.length === 0) fail('inga rättighetsklarerade sånger i paketet');
const seen = new Set();
for (const song of manifest.songs) {
  if (!song.id || seen.has(String(song.id))) fail('saknat/dubblerat sångnummer');
  seen.add(String(song.id));
  const rights = song.rights || {};
  if (song.releaseAllowed !== true) fail(song.id + ' saknar individuellt klartecken');
  for (const name of ['originalText','swedishEdition','melody','arrangement']) {
    if (rights[name] !== 'cleared') fail(song.id + ' saknar godkända rättigheter för ' + name);
  }
  if (!Array.isArray(song.rightsEvidence) || song.rightsEvidence.length === 0)
    fail(song.id + ' saknar dokumenterat rättighetsunderlag');
  if (song.audioFile && rights.recording !== 'cleared') fail(song.id + ' har ej granskad ljudinspelning');
  if (song.musicXmlFile && song.scoreVerified !== true) fail(song.id + ' har ej korrekturläst MusicXML');
}
console.log('TEKNISK KONTROLL GODKÄND: gör även en manuell juridisk slutkontroll före publicering');
