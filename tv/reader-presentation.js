(function () {
  'use strict';

  // Presentation only. Imported song data, lyric punctuation and repeat
  // markers are never rewritten or copied back to a JSON file.
  const KEY = 'sions-reader-mode-v1';
  let mode = 'book';
  try {
    if (localStorage.getItem(KEY) === 'sing') mode = 'sing';
  } catch (_) {}

  function toolbar() {
    const root = document.querySelector('#songScreen .song-inner');
    const actions = root && root.querySelector('.song-top .song-actions');
    if (!actions) return;

    // Each time openSong() runs, the original reader creates a fresh toolbar
    // in #songBody. Older toolbars moved to the fixed header were not removed.
    const newest = root.querySelector('#songBody .small-toolbar');
    const bars = Array.from(root.querySelectorAll('.small-toolbar'));
    const keep = newest || bars[bars.length - 1];
    if (!keep) return;

    for (const bar of bars) {
      if (bar !== keep) bar.remove();
    }
    if (keep.parentElement !== actions) actions.prepend(keep);
  }

  function showMode() {
    const reader = document.getElementById('songScreen');
    if (reader) reader.setAttribute('data-sions-reader-mode', mode);
    const switcher = document.getElementById('sions-reader-mode');
    if (!switcher) return;
    for (const button of switcher.querySelectorAll('button[data-mode]')) {
      const active = button.dataset.mode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function modeControl() {
    const body = document.getElementById('songBody');
    const head = body && body.querySelector('.song-head');
    if (!head) return;

    // Reuse the reserved, compact row immediately below the song heading.
    let strip = body.querySelector('#song-utility-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'song-utility-strip';
      strip.className = 'song-utility-strip';
      head.insertAdjacentElement('afterend', strip);
    }

    let control = strip.querySelector('#sions-reader-mode');
    if (!control) {
      control = document.createElement('div');
      control.id = 'sions-reader-mode';
      control.setAttribute('role', 'group');
      control.setAttribute('aria-label', 'Visningsläge för sången');

      for (const [value, title, description] of [
        ['book', 'Bok', 'Bokläge: verserna som löpande stycken i originalsångboken'],
        ['sing', 'Sång', 'Sångläge: luftigare verser och tydligare avstånd']
      ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.mode = value;
        button.textContent = title;
        button.title = description;
        button.setAttribute('aria-label', description);
        button.addEventListener('click', function () {
          mode = value;
          try { localStorage.setItem(KEY, mode); } catch (_) {}
          showMode();
        });
        control.appendChild(button);
      }
      strip.appendChild(control);
    }
    showMode();
  }

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      toolbar();
      modeControl();
    });
  }

  const body = document.getElementById('songBody');
  if (body) {
    new MutationObserver(schedule).observe(body, {childList: true, subtree: true});
  }
  schedule();
  window.addEventListener('pageshow', schedule);
  window.addEventListener('sions-font-change', schedule);
})();
