/* Conservative audio-to-hymn pairing for the user's privately imported files.
 * Does not alter lyrics or import audio into the distributed APK.
 * Titles must match uniquely; explicit hymn numbers take precedence.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SionsAudioMatch = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  function clean(s) {
    return String(s || '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/ø/g, 'o')
      .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function basename(value) {
    return String(value || '').split(/[\\/]/).pop().replace(/\.(mp3|m4a|aac|flac|wav|opus|ogg)$/i, '').trim();
  }

  function numberFromFilename(filename) {
    const text = basename(filename);
    // Only song numbers in explicit positions. Never guess from a year,
    // arbitrary track number in the middle, or a three-digit artist name.
    const patterns = [
      /^\s*0*(\d{1,4})([a-z]?)(?=\s|[-_.):\]]|$)/i,
      /^\s*[\[(]\s*0*(\d{1,4})([a-z]?)\s*[\])](?=\s|[-_.:]|$)/i,
      /^\s*(?:(?:sions?\s*[-_. ]*\s*(?:s[aä]nger|sanger|songs)\s*[-_. ]*)|ss\s*[-_. ]*)(?:nr\.?|nummer|no\.?|#)?\s*[-_. ]*0*(\d{1,4})([a-z]?)(?=\s|[-_.):\]]|$)/i,
      /^\s*(?:s[aä]ng|sang|psalm|hymn|nr\.?|nummer|no\.?)\s*[#.: -]*0*(\d{1,4})([a-z]?)(?=\s|[-_.):\]]|$)/i
    ];
    for (const pattern of patterns) {
      const m = pattern.exec(text);
      if (!m) continue;
      const n = Number(m[1]);
      if (n >= 1 && n <= 9999) return String(n) + (m[2] || '').toLowerCase();
    }
    return '';
  }

  function titleFromFilename(name) {
    let stem = basename(name);
    // Drop explicit prefixes, but leave the printed title intact otherwise.
    stem = stem.replace(/^\s*(?:(?:sions?\s*[-_. ]*\s*(?:s[aä]nger|sanger|songs)|ss)\s*[-_. ]*)?(?:nr\.?|nummer|no\.?|s[aä]ng|sang|psalm|hymn)?\s*[#.: -]*0*\d{1,4}[a-z]?(?=\s|[-_.):\]]|$)\s*[-_.): ]*/i, '');
    stem = stem.replace(/^\s*(?:sions?\s*[-_. ]*(?:s[aä]nger|sanger|songs))\s*[-_.:]*/i, '');
    stem = stem.replace(/\s*(?:\((?:instrumental|live|karaoke|remaster(?:ed)?|mp3|suno)\)|\[(?:instrumental|live|karaoke|remaster(?:ed)?|mp3|suno)\])\s*$/ig, '');
    return clean(stem);
  }

  function candidateNames(track) {
    const result = [];
    for (const name of [track.originalName, track.title]) {
      if (typeof name !== 'string' || !name.trim()) continue;
      const cleaned = titleFromFilename(name);
      if (cleaned && !result.includes(cleaned)) result.push(cleaned);
    }
    return result;
  }

  function resolve(track, songs, occupied) {
    if (!track || !Array.isArray(songs) || !songs.length) return {number:'', reason:'no-songs'};
    const keyed = new Map();
    for (const song of songs) {
      if (song && song.song_number != null) {
        const n = String(song.song_number).toLowerCase();
        if (!keyed.has(n)) keyed.set(n, []);
        keyed.get(n).push(song);
      }
    }
    // Numbered filenames are authoritative only when the number exists in
    // the imported hymn texts. An existing link is NEVER overwritten silently.
    const numbers = [track.originalName, track.title].map(numberFromFilename).filter(Boolean);
    for (const n of numbers) {
      if (keyed.get(n)?.length === 1 && !occupied?.[n])
        return {number:n,reason:'number'};
    }
    // For title-only audio, exact matching is safe only when unique.
    const names = candidateNames(track);
    for (const name of names) {
      const hits = songs.filter(s => clean(s && s.title) === name && s.song_number != null);
      if (hits.length === 1) {
        const n = String(hits[0].song_number).toLowerCase();
        if (!occupied?.[n]) return {number:n,reason:'title'};
      }
    }
    // Allow "title - pianist / recording details" only when the complete
    // song title itself has >= 3 words and no other title could match.
    for (const name of names) {
      const hits = songs.filter(s => {
        const title = clean(s && s.title);
        return title.split(' ').length >= 3 && name.startsWith(title + ' ') &&
          // A suffix must be marked as metadata in the original filename.
          [track.originalName, track.title].some(x => {
            const raw = basename(x);
            return /(?:\s[-–—|]\s|\s[\[(])/.test(raw);
          });
      });
      if (hits.length === 1) {
        const n = String(hits[0].song_number).toLowerCase();
        if (!occupied?.[n]) return {number:n,reason:'title-with-details'};
      }
    }
    return {number:'',reason:'no-confident-match'};
  }
  return {clean, basename, numberFromFilename, titleFromFilename, candidateNames, resolve};
});
