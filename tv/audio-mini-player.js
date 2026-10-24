/* Compact audio row: preserve original hymn navigation, TV controls, headers, and scrolling. */
(function () {
 'use strict';
 function init() {
  var api=window.SabbathAudioNative||window.SionsAndroid;
  if(!api||typeof api.audioStatus!=='function'||typeof api.audioList!=='function'||document.getElementById('sau-mini-player'))return;
  var style=document.createElement('style');
  style.textContent=[
   '#sau-mini-launch,#sau-mini-player{position:fixed!important;z-index:1550;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}',
   '#sau-mini-launch{right:9px!important;bottom:calc(var(--sau-nav-height,82px) + 5px)!important;top:auto!important;left:auto!important;width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;margin:0!important;padding:0!important;display:grid;place-items:center;border:1px solid #bc9963;border-radius:10px;background:#173c57;color:#f4d89b;font-size:20px;box-shadow:0 2px 6px #0003;cursor:pointer}',
   '#sau-mini-launch[data-playing="true"]::after{content:"";position:absolute;top:3px;right:3px;width:6px;height:6px;background:#85dfa1;border-radius:50%}',
   '#sau-mini-launch[hidden],#sau-mini-player[hidden]{display:none!important}',
   '#sau-mini-player{left:8px!important;right:8px!important;bottom:calc(var(--sau-nav-height,82px) + 4px)!important;top:auto!important;transform:none!important;width:auto!important;max-width:660px!important;margin-inline:auto!important;padding:4px 7px 3px!important;min-height:0!important;max-height:65px;background:#14334c;color:#fff4dc;border:1px solid #c0a475;border-radius:11px;box-shadow:0 2px 8px #0004}',
   '#sau-mini-player .sau-mini-row{display:flex;align-items:center;gap:5px;min-height:34px}',
   '#sau-mini-player .sau-mini-title{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;background:transparent;color:#fff1ce;border:0;font:600 12px system-ui;padding:3px 4px;min-height:32px}',
   '#sau-mini-player button.sau-mini-control{flex:none;width:33px!important;height:33px!important;min-width:33px!important;min-height:33px!important;padding:0!important;border-radius:7px;background:#e4c58b;color:#213b53;border:0;font:bold 17px system-ui}',
   '#sau-mini-player button.sau-mini-stop{background:#33556c;color:#fdf5e5;border:1px solid #7190a3}',
   '#sau-mini-player button.sau-mini-close{background:#233c53;color:#fdf5e5;border:1px solid #7190a3;font-size:20px}',
   '#sau-mini-player .sau-mini-progress{display:flex;align-items:center;gap:5px;min-height:16px}',
   '#sau-mini-player .sau-mini-progress input{flex:1;min-width:0;width:auto;height:12px;margin:0;accent-color:#e6c27f}',
   '#sau-mini-player .sau-mini-time{min-width:78px;font:10px system-ui;color:#f8e7c5;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
   '#sau-mini-player button:disabled{opacity:.45}',
   '#sau-mini-launch:focus-visible,#sau-mini-player button:focus-visible,#sau-mini-player input:focus-visible{outline:2px solid #b88638;outline-offset:2px}',
   /* Keep all original layout, only reserve scroll room at the very bottom. */
   '.app-shell{padding-bottom:calc(var(--nav-height,82px) + env(safe-area-inset-bottom) + 78px)!important}',
   'body:not(:has(.app-shell)) #songBody{padding-bottom:100px!important}',
   /* In the music library dialog only the tracks scroll, not the actions/title. */
   '#sau-catalog:not([hidden]){display:flex!important;flex-direction:column!important;overflow:hidden!important;height:100dvh!important;max-height:100dvh!important}',
   '#sau-catalog #sau-tracks{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
   '@media(max-width:360px){#sau-mini-player{padding:3px 4px!important}.sau-mini-row{gap:3px!important}}'
  ].join('\n');
  document.head.appendChild(style);
  var trigger=document.createElement('button');trigger.type='button';trigger.id='sau-mini-launch';
  trigger.textContent='♫';trigger.setAttribute('aria-label','Visa liten musikspelare');trigger.setAttribute('aria-controls','sau-mini-player');trigger.setAttribute('aria-expanded','false');
  var bar=document.createElement('section');bar.id='sau-mini-player';bar.hidden=true;bar.setAttribute('aria-label','Musikspelare');
  var row=document.createElement('div');row.className='sau-mini-row';
  var title=document.createElement('button');title.type='button';title.className='sau-mini-title';title.textContent='Ingen sång spelas';title.setAttribute('aria-label','Visa spelad sång');
  var play=document.createElement('button');play.type='button';play.className='sau-mini-control';play.textContent='▶';play.setAttribute('aria-label','Spela');
  var stop=document.createElement('button');stop.type='button';stop.className='sau-mini-control sau-mini-stop';stop.textContent='■';stop.setAttribute('aria-label','Stoppa');
  var close=document.createElement('button');close.type='button';close.className='sau-mini-control sau-mini-close';close.textContent='×';close.setAttribute('aria-label','Dölj musikspelare');
  row.append(title,play,stop,close);
  var progress=document.createElement('div');progress.className='sau-mini-progress';
  var slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1';slider.step='0.1';slider.value='0';slider.setAttribute('aria-label','Spola musik');
  var duration=document.createElement('span');duration.className='sau-mini-time';duration.textContent='0:00 / 0:00';
  progress.append(slider,duration);bar.append(row,progress);
  document.body.append(trigger,bar); // Never move an existing menu, TV button, or header.
  var expanded=false,status={},tracks={},selected=null,lastList='';
  function safeJSON(raw){try{return JSON.parse(raw||'{}');}catch(e){return {};}}
  function seconds(s){s=Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function data(){return window.SionsTvData?window.SionsTvData():{};}
  function activeSong(key){return (data().library||[]).find(function(s){return String(s.audio_key||s.song_number)===key;})||null;}
  function position(){
   var nav=document.querySelector('.bottom-nav');
   var h=nav&&nav.getBoundingClientRect?nav.getBoundingClientRect().height:0;
   document.documentElement.style.setProperty('--sau-nav-height',Math.max(56,Math.ceil(h||82))+'px');
  }
  function render(){
   var overlay=document.getElementById('tvMirrorOverlay')||document.getElementById('sions-tv-mirror');
   var modal=document.getElementById('sau-catalog');
   var hiddenByOther=!!((modal&&!modal.hidden)||(overlay&&!overlay.hidden&&getComputedStyle(overlay).display!=='none'));
   trigger.hidden=expanded||hiddenByOther;
   bar.hidden=!expanded||hiddenByOther;
   trigger.setAttribute('aria-expanded',String(expanded));
  }
  trigger.onclick=function(){expanded=true;render();close.focus();};
  close.onclick=function(){expanded=false;render();trigger.focus();};
  play.onclick=function(){if(!status.number)return;if(status.playing)api.audioPause();else api.audioPlay(status.number);update();};
  stop.onclick=function(){if(api.audioStop)api.audioStop();else api.audioPause();expanded=false;update();trigger.focus();};
  title.onclick=function(){if(selected&&typeof data().openSong==='function')data().openSong(selected);};
  slider.onchange=function(){if(status.number&&status.ready)api.audioSeek(status.number,Number(slider.value));};
  function update(){
   try{
    var list=api.audioList();status=safeJSON(api.audioStatus());
    if(list!==lastList){lastList=list;tracks=safeJSON(list);}
    var key=String(status.number||'');var track=tracks[key];selected=activeSong(key);
    title.textContent=selected?String(selected.song_number)+' · '+selected.title:track?(track.title||key):'Ingen sång spelas';
    title.disabled=!selected;
    play.disabled=stop.disabled=!track;
    play.textContent=status.playing?'Ⅱ':'▶';
    play.setAttribute('aria-label',status.playing?'Pausa':'Spela');
    slider.disabled=!track||!status.ready;
    slider.max=String(Math.max(1,status.duration||1));
    if(document.activeElement!==slider)slider.value=String(Math.max(0,Math.min(status.duration||0,status.position||0)));
    duration.textContent=seconds(status.position)+' / '+seconds(status.duration)+(status.targetTv?' · TV':'');
    trigger.dataset.playing=String(!!status.playing);
    position();render();
   }catch(_error){expanded=false;render();}
  }
  window.HymnalMiniPlayer={refresh:update,open:function(){expanded=true;update();},close:function(){expanded=false;render();}};
  window.addEventListener('resize',position);
  update();
  setInterval(update,750);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();