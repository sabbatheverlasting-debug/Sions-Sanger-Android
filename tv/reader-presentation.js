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

  // A JSON section with several distinct lines is the only reliable signal
  // that a real lyrical line division was supplied. One OCR paragraph is not
  // silently split into guessed lines, and imported data is never rewritten.
  function markStructuredLines() {
    const body = document.getElementById('songBody');
    const view = window.SionsTvData && window.SionsTvData();
    const sections = view && view.activeSong && view.activeSong.sections;
    if (!body || !Array.isArray(sections)) return;
    const stanzas = body.querySelectorAll('.stanza');
    stanzas.forEach(function (stanza, index) {
      const section = sections[index];
      const lines = section && section.lines;
      const spans = stanza.querySelectorAll('.verse-line');
      const reliable = Array.isArray(lines) && lines.length > 1 &&
        lines.length === spans.length &&
        lines.every(line => typeof line === 'string' && line.trim().length > 0);
      if (reliable) stanza.dataset.sionsExplicitLines = 'true';
      else stanza.removeAttribute('data-sions-explicit-lines');
    });
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
    const root=document.querySelector('#songScreen .song-inner');
    const body=document.getElementById('songBody');
    if(!root||!body)return;
    // Keep all view choices in one fixed row below the reader header;
    // never hide Bok/Sång inside scrollable lyrics.
    const tabs=document.getElementById('sions-score-tabs');
    let control=document.getElementById('sions-reader-mode');
    if(!control){
      control=document.createElement('div');
      control.id='sions-reader-mode';
      control.setAttribute('role','group');
      control.setAttribute('aria-label','Textlayout');
      for(const [value,title,description] of [
        ['book','Bok','Bokläge: löpande versstycken'],
        ['sing','Sång','Sångläge: radindelning från importerad sång']
      ]){
        const button=document.createElement('button');
        button.type='button';button.dataset.mode=value;button.textContent=title;
        button.title=description;button.setAttribute('aria-label',description);
        button.addEventListener('click',function(){
          mode=value;
          try{localStorage.setItem(KEY,mode);}catch(_){}
          showMode();
        });
        control.appendChild(button);
      }
    }
    if(tabs){
      if(control.parentElement!==tabs)tabs.appendChild(control);
    }else if(control.parentElement!==root){
      root.insertBefore(control,body);
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
      markStructuredLines();
    });
  }

  const body = document.getElementById('songBody');
  if (body) {
    new MutationObserver(schedule).observe(body, {childList: true, subtree: true});
  }
  schedule();
  window.addEventListener('pageshow', schedule);
  window.addEventListener('sions-view-menu-ready', schedule);
  window.addEventListener('sions-font-change', schedule);
})();
