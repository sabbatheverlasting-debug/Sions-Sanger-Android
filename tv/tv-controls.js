/* Sions Sånger TV – styrning och skärmspegling, v1.3 */
(function () {
  'use strict';
  function init() {
    if (typeof window.SionsTvData !== 'function' || !window.SionsAndroid) return;
    var bridge = window.SionsAndroid;
    var selected = null, at = 0, blank = false, theme = 'navy', mirrored = false;
    var entry = null;
    function data() { return window.SionsTvData(); }
    function songs() { return data().library || []; }
    function part() { return selected && selected.sections ? selected.sections[at] : null; }
    function label(p) {
      if (!p) return '';
      if (p.type === 'chorus') return 'Kör / Refräng';
      return p.number == null ? 'Vers' : 'Vers ' + p.number;
    }
    function number(song) { return song.song_number == null ? '—' : song.song_number; }
    function key(song) { return song.song_number == null ? 't:' + song.title : 'n:' + song.song_number; }
    function url() { try { return String(bridge.tvAddress() || ''); } catch (e) { return ''; } }
    function sync() {
      if (!selected) return;
      var p = part();
      if (!p) return;
      var state = {
        number: selected.song_number,
        title: selected.title,
        lines: p.lines,
        section: label(p),
        index: at,
        total: selected.sections.length,
        theme: theme,
        blank: blank
      };
      try { bridge.tvUpdate(JSON.stringify(state)); }
      catch (e) { setMessage('TV-anslutningen svarar inte.'); }
      updateDisplay();
    }
    function setMessage(t) { document.getElementById('sions-tv-message').textContent = t; }
    function setSong(song) {
      if (!song || !Array.isArray(song.sections) || !song.sections.length) return;
      selected = song; at = 0; blank = false; sync(); renderResults();
    }
    function next(delta) {
      if (!selected) return;
      at = Math.max(0, Math.min(selected.sections.length - 1, at + delta));
      blank = false;
      sync();
    }
    var css = document.createElement('style');
    css.textContent = [
      '#sions-tv-open{position:fixed;right:14px;bottom:95px;z-index:1000;border:0;border-radius:50%;width:53px;height:53px;background:#c99846;color:#102d49;font-weight:800;box-shadow:0 6px 17px #091a2e55;font-size:25px}',
      '#sions-tv-shortcut{margin-left:8px;border:1px solid #dcb96a;border-radius:10px;padding:6px 10px;color:#17354d;background:#fae9bd;font-size:15px;font-weight:bold}',
      '#sions-tv-panel{position:fixed;inset:0;z-index:2147483000;overflow-y:auto;overscroll-behavior:contain;background:#0c1c2c;color:#f7f0e2;font:16px system-ui,-apple-system,sans-serif;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}',
      '#sions-tv-panel[hidden],#sions-tv-mirror[hidden]{display:none!important}',
      '.stv-inner{max-width:680px;margin:auto;padding:20px 18px 70px}',
      '.stv-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.stv-heading h1{font:normal 27px Georgia,serif;color:#f2ce83;margin:0}',
      '.stv-card{background:#172f45;border:1px solid #355069;border-radius:18px;padding:18px;margin:17px 0;box-shadow:0 3px 8px #0002}',
      '.stv-muted{color:#b8c9d5;font-size:14px;line-height:1.55}.stv-strong{font-weight:750;color:#f1cd84}',
      '.stv-btn{background:#e3bc70;color:#10263a;border:0;border-radius:11px;padding:12px 15px;font-weight:750;min-height:45px;cursor:pointer}',
      '.stv-btn.secondary{color:#f4e5c6;background:#304c66}.stv-btn.outline{background:transparent;color:#f7f0e2;border:1px solid #7690a5}.stv-btn:disabled{opacity:.4}',
      '.stv-flex{display:flex;flex-wrap:wrap;gap:10px}.stv-flex>*{flex:1}',
      '.stv-remote{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.stv-remote button{min-height:74px;font-size:18px}',
      '.stv-value{font:24px Georgia,serif;color:white;line-height:1.35;margin:10px 0}.stv-verselabel{color:#f2ce83;font-weight:700}',
      '.stv-address{font-size:14px;word-break:break-all;background:#081724;padding:12px;border-radius:9px;user-select:text}',
      '#sions-tv-search{width:100%;background:white;color:#162f42;border:2px solid #c7aa77;border-radius:10px;padding:12px 14px;font-size:16px}',
      '#sions-tv-results{max-height:220px;overflow:auto;margin-top:10px;border-radius:12px}',
      '.stv-result{display:block;width:100%;padding:11px;text-align:left;border:0;border-bottom:1px solid #50657a;background:#223a51;color:white}.stv-result.active{background:#4a5f6c;color:#ffe8af}',
      '.stv-select{width:100%;padding:12px;border-radius:10px;color:#19364c;background:#fff}',
      '#sions-tv-message{color:#f6d9aa;min-height:22px;font-size:14px}',
      '#sions-tv-mirror{position:fixed;inset:0;z-index:2147483600;color:white;background:radial-gradient(ellipse at 60% 10%,#244667,#081626 76%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4vh 7vw;font-family:Georgia,serif}',
      '#sions-tv-mirror.forest{background:radial-gradient(ellipse,#29584a,#071c22)}',
      '#sions-tv-mirror.dark{background:#050608}',
      '#sions-tv-mirror.cream{background:#f7f1e5;color:#1e2e3b}',
      '#stv-mtitle{font-size:clamp(17px,2.6vw,48px);opacity:.85;margin:0 0 3vh}',
      '#stv-mwords{font-size:clamp(23px,4.2vw,70px);line-height:1.3;white-space:pre-line;overflow-wrap:break-word;max-width:100%;max-height:70vh;overflow:hidden}',
      '#stv-mwords.compact{font-size:clamp(19px,3vw,50px)}',
      '#stv-mlabel{font:clamp(12px,1.5vw,22px) system-ui;margin-top:3vh;opacity:.7}',
      '.stv-tap{position:absolute;top:11vh;bottom:0;width:20%;border:0;background:transparent;z-index:3}.stv-tap.left{left:0}.stv-tap.right{right:0}',
      '#stv-close-mirror{position:absolute;top:1vh;right:2vw;z-index:4;border:0;background:#0008;color:#fff;padding:7px 12px;border-radius:8px;font:13px system-ui}',
      '@media(max-width:450px){.stv-remote button{font-size:16px}}'
    ].join('\n');
    document.head.appendChild(css);

    var open = document.createElement('button');
    open.id = 'sions-tv-open'; open.type = 'button'; open.textContent = 'TV';
    open.title = 'Presentera sång på TV'; open.setAttribute('aria-label', 'Visa Sions Sånger på TV');
    document.body.appendChild(open);

    var shortcut = document.createElement('button');
    shortcut.id = 'sions-tv-shortcut'; shortcut.textContent = '▣ TV'; shortcut.type = 'button';
    var heading = document.querySelector('.song-top .song-actions');
    if (heading) heading.prepend(shortcut);

    var panel = document.createElement('section');
    panel.id = 'sions-tv-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Presentera Sions Sånger på TV');
    panel.innerHTML = '<div class="stv-inner">' +
      '<div class="stv-heading"><h1>Sions Sånger · TV</h1><button id="stv-close" class="stv-btn secondary">Stäng ✕</button></div>' +
      '<p class="stv-muted">Styr sångerna här. På TV:n syns endast vald vers i liggande format.</p>' +
      '<div class="stv-card"><div class="stv-strong">1. Anslut din TV</div>' +
      '<p class="stv-muted">Anslut TV och mobil till samma Wi-Fi. Öppna adressen nedan i TV:ns webbläsare (till exempel LG eller webbläsare på Google TV). Låt appen vara öppen och mobilen vara vaken.</p>' +
      '<div id="stv-url" class="stv-address"></div><div class="stv-flex" style="margin-top:10px">' +
      '<button class="stv-btn" id="stv-copy">Kopiera TV-adress</button>' +
      '<button class="stv-btn secondary" id="stv-refresh">Uppdatera adress</button></div>' +
      '<div id="sions-tv-message" role="status"></div>' +
      '<p class="stv-muted">Chromecast utan webbläsare: använd knappen Skärmspegling nedan och Androids skärmcasting. Apple TV: visa TV-adressen via AirPlay från en Mac/iPhone, eller använd en kompatibel webbläsarapp på Apple TV.</p></div>' +
      '<div class="stv-card"><div class="stv-strong">2. Välj sång</div>' +
      '<p class="stv-muted">Sök på sångnummer, titel eller ord i sången. Även importerade JSON-sånger ingår.</p>' +
      '<input id="sions-tv-search" type="search" placeholder="Sök nummer eller text..." autocomplete="off" aria-label="Sök sång">' +
      '<div id="sions-tv-results"></div></div>' +
      '<div class="stv-card"><div class="stv-strong">3. Styr verserna</div>' +
      '<div id="stv-song" class="stv-value">Välj en sång</div>' +
      '<div id="stv-verse" class="stv-verselabel"></div>' +
      '<div class="stv-remote" style="margin-top:14px">' +
      '<button id="stv-prev" class="stv-btn secondary">‹ Föregående vers</button>' +
      '<button id="stv-next" class="stv-btn">Nästa vers ›</button></div>' +
      '<div class="stv-flex" style="margin-top:12px">' +
      '<button id="stv-blank" class="stv-btn outline">Svart TV-bild</button>' +
      '<button id="stv-mirror" class="stv-btn secondary">Skärmspegling 16:9</button></div>' +
      '<p class="stv-muted">Bakgrund</p><select id="stv-theme" class="stv-select" aria-label="Bakgrund">' +
      '<option value="navy">Mörkblå och guld</option><option value="dark">Svart</option>' +
      '<option value="forest">Skogsgrön</option><option value="cream">Ljus</option></select></div>' +
      '</div>';
    document.body.appendChild(panel);
    var mirror = document.createElement('div');
    mirror.id = 'sions-tv-mirror'; mirror.hidden = true;
    mirror.innerHTML = '<button id="stv-close-mirror">✕ Tillbaka</button>' +
      '<h2 id="stv-mtitle"></h2><div id="stv-mwords"></div><div id="stv-mlabel"></div>' +
      '<button class="stv-tap left" id="stv-tap-left" aria-label="Föregående vers"></button>' +
      '<button class="stv-tap right" id="stv-tap-right" aria-label="Nästa vers"></button>';
    document.body.appendChild(mirror);
    var $ = function (id) { return document.getElementById(id); };

    function updateAddress() {
      var current = url();
      $('stv-url').textContent = current || 'Ingen lokal Wi-Fi-adress hittades.';
      if (!current) setMessage('Aktivera Wi-Fi på mobilen och se till att du använder ett lokalt nätverk.');
      else setMessage('Anslutningskoden ingår redan i TV-adressen.');
    }
    function updateDisplay() {
      var p = part();
      $('stv-song').textContent = selected ? String(number(selected)) + '. ' + selected.title : 'Välj en sång';
      $('stv-verse').textContent = p ? label(p) + '  ·  ' + (at + 1) + ' av ' + selected.sections.length : '';
      $('stv-prev').disabled = !selected || at === 0;
      $('stv-next').disabled = !selected || at === selected.sections.length - 1;
      $('stv-blank').textContent = blank ? 'Visa text igen' : 'Svart TV-bild';
      $('stv-mtitle').textContent = selected ? selected.title : 'Sions Sånger';
      $('stv-mwords').textContent = p ? p.lines.join('\n') : 'Välj en sång på mobilen';
      $('stv-mwords').className = p && p.lines.join(' ').length > 125 ? 'compact' : '';
      $('stv-mlabel').textContent = p ? label(p) + ' · ' + (at + 1) + '/' + selected.sections.length : '';
      mirror.className = theme;
      mirror.style.background = blank ? '#000' : '';
      $('stv-mtitle').style.visibility = blank ? 'hidden' : '';
      $('stv-mwords').style.visibility = blank ? 'hidden' : '';
      $('stv-mlabel').style.visibility = blank ? 'hidden' : '';
    }
    function renderResults() {
      var q = ($('sions-tv-search').value || '').toLocaleLowerCase('sv').trim();
      var matches = songs().filter(function (song) {
        if (!q) return selected && key(song) === key(selected);
        return String(song.song_number == null ? '' : song.song_number).indexOf(q) !== -1 ||
          song.title.toLocaleLowerCase('sv').indexOf(q) !== -1 ||
          song.sections.some(function (section) { return section.lines.some(function (line) { return line.toLocaleLowerCase('sv').indexOf(q) !== -1; }); });
      }).slice(0, 24);
      var root = $('sions-tv-results'); root.replaceChildren();
      matches.forEach(function (song) {
        var button = document.createElement('button');
        button.type = 'button'; button.className = 'stv-result';
        if (selected && key(song) === key(selected)) button.classList.add('active');
        button.textContent = String(number(song)) + ' · ' + song.title;
        button.onclick = function () { setSong(song); $('sions-tv-search').value = ''; renderResults(); };
        root.appendChild(button);
      });
      if (q && !matches.length) {
        var empty = document.createElement('p'); empty.className = 'stv-muted'; empty.textContent = 'Ingen sång hittades.';
        root.appendChild(empty);
      }
    }
    function showPanel() {
      panel.hidden = false;
      var active = data().activeSong;
      if (active && (!selected || key(active) !== key(selected))) selected = active, at = 0;
      if (!selected && songs().length) selected = songs()[0];
      updateAddress(); sync(); renderResults();
      try { bridge.tvKeepAwake(true); } catch(e) {}
    }
    function hidePanel() {
      panel.hidden = true;
      if (!mirrored) try { bridge.tvKeepAwake(false); } catch(e) {}
    }
    function startMirror() {
      if (!selected) return;
      mirrored = true; mirror.hidden = false; panel.hidden = true; blank = false;
      sync();
      try { bridge.tvFullscreen(true); bridge.tvKeepAwake(true); } catch(e) {}
    }
    function stopMirror() {
      mirrored = false; mirror.hidden = true; panel.hidden = false;
      try { bridge.tvFullscreen(false); bridge.tvKeepAwake(true); } catch(e) {}
    }
    open.onclick = showPanel; shortcut.onclick = showPanel;
    $('stv-close').onclick = hidePanel;
    $('stv-prev').onclick = function () { next(-1); };
    $('stv-next').onclick = function () { next(1); };
    $('stv-tap-left').onclick = function () { next(-1); };
    $('stv-tap-right').onclick = function () { next(1); };
    $('stv-close-mirror').onclick = stopMirror;
    $('stv-mirror').onclick = startMirror;
    $('stv-blank').onclick = function () { blank = !blank; sync(); };
    $('stv-theme').onchange = function (e) { theme = e.target.value; sync(); };
    $('sions-tv-search').oninput = renderResults;
    $('stv-refresh').onclick = updateAddress;
    $('stv-copy').onclick = function () {
      var address = url();
      if (!address) { setMessage('Ingen adress att kopiera.'); return; }
      try {
        if (typeof bridge.tvCopy === 'function') {
          bridge.tvCopy(address); setMessage('TV-adressen kopierad.'); return;
        }
        navigator.clipboard.writeText(address).then(function () { setMessage('TV-adressen kopierad.'); },
          function () { setMessage('Kunde inte kopiera. Skriv in adressen som visas.'); });
      } catch(e) { setMessage('Kunde inte kopiera. Skriv in adressen som visas.'); }
    };
    window.addEventListener('keydown', function (e) {
      if (panel.hidden && mirror.hidden) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { next(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { next(-1); e.preventDefault(); }
      if (e.key === 'Escape' && mirrored) { stopMirror(); e.preventDefault(); }
      else if (e.key === 'Escape' && !panel.hidden) { hidePanel(); e.preventDefault(); }
    });
    window.sionsTvBack = function () {
      if (mirrored) { stopMirror(); return true; }
      if (!panel.hidden) { hidePanel(); return true; }
      return false;
    };
    updateDisplay();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
