/* Collapsible compact audio dock shared by 3 Angels Hymnal and Sions Sånger.
 * Reading stays unobstructed until the listener explicitly opens the dock. */
(function(){
 'use strict';
 function init(){
  var native=window.SabbathAudioNative||window.SionsAndroid;
  if(!native||typeof native.audioStatus!=='function'||typeof native.audioList!=='function'||document.getElementById('sau-mini-player'))return;
  var css=document.createElement('style');
  css.textContent=[
   '.sau-mini-launch,.sau-mini-player,.sau-mini-host{box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}',
   '#sau-mini-launch{position:static!important;flex:0 0 42px!important;width:42px!important;max-width:42px!important;height:42px!important;min-height:42px!important;display:grid!important;place-items:center!important;padding:0!important;margin:0!important;border:1px solid #c9aa77!important;border-radius:12px!important;background:#163850!important;color:#ffe4ab!important;box-shadow:none!important;font-size:22px!important;line-height:1!important;cursor:pointer}',
   '#sau-mini-launch[data-playing="true"]::after{content:"";position:absolute;right:2px;top:3px;background:#67cf8b;width:7px;height:7px;border-radius:50%;border:1px solid #102d46}',
   '#sau-mini-launch{position:relative!important}',
   '#sau-mini-launch[hidden],#sau-mini-player[hidden]{display:none!important}',
   '#sau-mini-player{position:static!important;flex:1 1 auto;transform:none!important;left:auto!important;bottom:auto!important;width:100%!important;max-width:none!important;min-width:0;color:#f8f2e8;background:#102d46;border:1px solid #68839b;border-radius:12px;box-shadow:none;padding:4px 7px 3px;font:13px system-ui}',
   '.sau-mini-row{display:flex;align-items:center;gap:5px;min-height:34px}',
   '.sau-mini-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;border:0;background:transparent;color:#fff1c8;font:600 12px system-ui;min-height:34px;padding:4px 2px}',
   '#sau-mini-player button.sau-mini-control{flex:0 0 36px;min-width:36px;min-height:36px;max-width:36px;padding:2px;border:0;border-radius:7px;background:#eaca8d;color:#16364d;font:bold 17px system-ui;cursor:pointer}',
   '#sau-mini-player button.sau-mini-stop{background:#244f6f;color:white;border:1px solid #b59a68}',
   '#sau-mini-player button.sau-mini-close{background:transparent;color:#f4e6c7;font-size:22px;border:1px solid #65829a}',
   '#sau-mini-player button:disabled{opacity:.5;cursor:default}',
   '.sau-mini-progress{display:flex;align-items:center;gap:6px;min-height:18px}',
   '.sau-mini-progress input[type=range]{flex:1;min-width:0;width:100%;height:14px;margin:0;accent-color:#e2bd7e}',
   '.sau-mini-time{white-space:nowrap;color:#e8dcc5;text-align:right;font:10px system-ui;min-width:73px;font-variant-numeric:tabular-nums}',
   '#sau-mini-launch:focus-visible,#sau-mini-player button:focus-visible,.sau-mini-progress input:focus-visible{outline:3px solid white;outline-offset:2px}',
   /* On 3 Angels the player REPLACES the bottom navigation while open;
      neither control is positioned over the hymn reading area. */
   '.bottom-nav.sau-nav-expanded>button:not(#sau-mini-launch){display:none!important}',
   '.bottom-nav #sau-mini-player{flex:1 1 100%;max-width:none!important}',
   '.bottom-nav.sau-nav-expanded{min-height:73px}',
   /* Sions has no bottom navigation in the hymn reader: create an opaque
      dock shelf at the viewport bottom instead of floating music or TV circles. */
   '.sau-mini-host{position:fixed;z-index:1550;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:flex-end;gap:10px;min-height:calc(56px + env(safe-area-inset-bottom));padding:5px 12px calc(5px + env(safe-area-inset-bottom));background:var(--paper,#faf6ed);border-top:1px solid #cbbd9f;box-shadow:0 -2px 10px #0000000d}',
   '.sau-mini-host.sau-expanded{min-height:calc(85px + env(safe-area-inset-bottom));padding:5px 9px calc(5px + env(safe-area-inset-bottom))}',
   '.sau-mini-host #sau-mini-player{flex:1 1 auto;min-width:0}',
   '#sions-tv-open.sau-tv-docked{display:grid!important;place-items:center!important;position:relative!important;inset:auto!important;bottom:auto!important;right:auto!important;flex:0 0 42px!important;width:42px!important;height:42px!important;min-height:42px!important;margin:0!important;border-radius:12px!important;box-shadow:none!important;font:700 14px system-ui!important}',
   '.sau-mini-host.sau-expanded #sions-tv-open.sau-tv-docked{display:none!important}',
   'body.sau-standalone-dock{padding-bottom:calc(var(--sau-dock-height,56px) + 24px)!important}',
   'body.sau-standalone-dock #songBody{padding-bottom:calc(var(--sau-dock-height,56px) + 18px)!important}',
   /* Playback and seek move to the dock; retain the expandable music choices. */
   'body.sau-audio-docked #sau-controls>#sau-play,body.sau-audio-docked #sau-controls>#sau-seek,body.sau-audio-docked #sau-controls>#sau-info{display:none!important}',
   'body.sau-audio-docked #sau-controls{padding-top:2px;padding-bottom:4px}',
   '@media(max-width:360px){#sau-mini-player{padding:3px 5px}.sau-mini-title{font-size:11px}.sau-mini-row{gap:3px}}'
  ].join('\n');
  document.head.appendChild(css);
  var launch=document.createElement('button');
  launch.id='sau-mini-launch';launch.className='sau-mini-launch';launch.type='button';
  launch.textContent='♫';launch.setAttribute('aria-label','Visa ljudspelare');
  launch.setAttribute('aria-controls','sau-mini-player');launch.setAttribute('aria-expanded','false');
  var bar=document.createElement('section');
  bar.id='sau-mini-player';bar.className='sau-mini-player';bar.hidden=true;bar.setAttribute('aria-label','Ljudspelare');
  var row=document.createElement('div');row.className='sau-mini-row';
  var title=document.createElement('button');title.type='button';title.className='sau-mini-title';title.textContent='Ingen sång spelas';
  title.setAttribute('aria-label','Öppna sången som spelas');
  var play=document.createElement('button');play.type='button';play.className='sau-mini-control';play.textContent='▶';play.setAttribute('aria-label','Spela');
  var stop=document.createElement('button');stop.type='button';stop.className='sau-mini-control sau-mini-stop';stop.textContent='■';stop.setAttribute('aria-label','Stoppa');
  var close=document.createElement('button');close.type='button';close.className='sau-mini-control sau-mini-close';close.textContent='×';close.setAttribute('aria-label','Dölj ljudspelare');
  row.append(title,play,stop,close);
  var progress=document.createElement('div');progress.className='sau-mini-progress';
  var slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1';slider.step='0.1';slider.value='0';slider.setAttribute('aria-label','Spola i inspelningen');
  var time=document.createElement('span');time.className='sau-mini-time';time.textContent='0:00 / 0:00';
  progress.append(slider,time);bar.append(row,progress);
  var nav=window.SabbathAudioNative?document.querySelector('.app-shell > .bottom-nav'):null;
  var host=null,originalBodyPadding=document.body.style.paddingBottom;
  if(nav){nav.append(launch,bar);}
  else{
   host=document.createElement('div');host.className='sau-mini-host';
   host.setAttribute('aria-label','TV och musik');document.body.appendChild(host);
   var tv=document.getElementById('sions-tv-open');
   if(tv){tv.classList.add('sau-tv-docked');host.appendChild(tv);}
   host.append(launch,bar);
   document.body.classList.add('sau-standalone-dock');
  }
  document.body.classList.add('sau-audio-docked');
  var expanded=false,status={},library={},selected=null,lastList='';
  function data(){return window.SionsTvData?window.SionsTvData():{};}
  function safeJSON(raw){try{return JSON.parse(raw||'{}');}catch(e){return {};}}
  function clock(s){s=Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function currentSong(key){
   var songs=data().library||[];
   return songs.find(function(song){return String(song.audio_key||song.song_number)===key;})||null;
  }
  function render(){
   var overlays=['tvMirrorOverlay','sions-tv-mirror','sions-tv-panel','sau-catalog'];
   var blocked=overlays.some(function(id){var el=document.getElementById(id);return !!(el&&!el.hidden&&getComputedStyle(el).display!=='none');});
   var on=expanded&&!blocked;
   launch.hidden=expanded||blocked;
   bar.hidden=!on;
   launch.setAttribute('aria-expanded',String(expanded));
   document.body.classList.toggle('sau-player-expanded',on);
   if(nav)nav.classList.toggle('sau-nav-expanded',on);
   if(host){
    host.classList.toggle('sau-expanded',on);
    document.documentElement.style.setProperty('--sau-dock-height',(on?85:56)+'px');
   }
  }
  launch.onclick=function(){expanded=true;render();close.focus();};
  close.onclick=function(){expanded=false;render();launch.focus();};
  play.onclick=function(){
   if(!status.number)return;
   if(status.playing)native.audioPause();else native.audioPlay(status.number);
   update();
  };
  stop.onclick=function(){
   if(typeof native.audioStop==='function')native.audioStop();else native.audioPause();
   expanded=false;update();launch.focus();
  };
  title.onclick=function(){if(selected&&typeof data().openSong==='function')data().openSong(selected);};
  slider.onchange=function(){if(status.number&&status.ready)native.audioSeek(status.number,Number(slider.value));};
  function update(){
   try{
    var raw=native.audioList(),s=safeJSON(native.audioStatus());status=s;
    if(raw!==lastList){lastList=raw;library=safeJSON(raw);}
    var number=String(s.number||''),track=library[number],hasTrack=!!number&&!!track;
    selected=hasTrack?currentSong(number):null;
    var readable=selected?String(selected.song_number)+' · '+selected.title:track?(track.title||number):'Ingen sång spelas';
    title.textContent=readable;title.title=readable+(s.targetTv?' · TV':'');
    title.disabled=!selected;
    play.disabled=stop.disabled=!hasTrack;
    play.textContent=s.playing?'Ⅱ':'▶';
    play.setAttribute('aria-label',s.playing?'Pausa':'Spela');
    slider.disabled=!hasTrack||!s.ready;
    slider.max=String(Math.max(1,Number(s.duration)||1));
    if(document.activeElement!==slider)slider.value=String(Math.max(0,Math.min(Number(s.duration)||0,Number(s.position)||0)));
    time.textContent=clock(s.position)+' / '+clock(s.duration)+(s.targetTv?' · TV':'');
    launch.dataset.playing=String(!!s.playing);
    launch.setAttribute('aria-label',s.playing?'Visa ljudspelare – spelar':'Visa ljudspelare');
    render();
   }catch(e){expanded=false;render();}
  }
  window.HymnalMiniPlayer={
   refresh:update,
   open:function(){expanded=true;update();},
   close:function(){expanded=false;update();}
  };
  update();
  setInterval(update,750);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();