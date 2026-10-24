/* Collapsible compact audio dock shared by 3 Angels Hymnal and Sions Sånger.
 * Reading stays unobstructed until the listener explicitly opens the dock. */
(function(){
 'use strict';
 function init(){
  var native=window.SabbathAudioNative||window.SionsAndroid;
  if(!native||typeof native.audioStatus!=='function'||typeof native.audioList!=='function'||document.getElementById('sau-mini-player'))return;
  var css=document.createElement('style');
  css.textContent=[
   '.sau-mini-launch,.sau-mini-player{box-sizing:border-box;position:fixed;z-index:1550;font-family:system-ui,-apple-system,sans-serif;color:#f8f2e8}',
   '.sau-mini-launch{right:12px;bottom:var(--sau-bottom-offset,86px);width:44px;height:44px;display:grid;place-items:center;border:1px solid #cfb27d;border-radius:50%;background:#102d46;color:#fff1c8;box-shadow:0 3px 15px #0006;font-size:22px;cursor:pointer}',
   '.sau-mini-launch[data-playing="true"]::after{content:"";position:absolute;top:5px;right:5px;width:8px;height:8px;border-radius:50%;background:#7cdd9d;border:1px solid #102d46}',
   '.sau-mini-launch[hidden],.sau-mini-player[hidden]{display:none!important}',
   '.sau-mini-player{left:50%;transform:translateX(-50%);bottom:var(--sau-bottom-offset,86px);width:min(calc(100% - 18px),520px);padding:6px 9px 5px;background:#102d46;border:1px solid #cfb27d;border-radius:13px;box-shadow:0 -4px 18px #0007}',
   '.sau-mini-row{display:flex;align-items:center;gap:6px;min-height:38px}',
   '.sau-mini-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;border:0;background:transparent;color:#fff1c8;font:600 13px system-ui;min-height:36px;padding:5px 3px}',
   '.sau-mini-player button.sau-mini-control{flex:none;min-width:38px;min-height:38px;padding:4px;border:0;border-radius:8px;background:#f1d89e;color:#16364d;font:bold 18px system-ui;cursor:pointer}',
   '.sau-mini-player button.sau-mini-stop{background:#244f6f;color:white;border:1px solid #b59a68}',
   '.sau-mini-player button.sau-mini-close{background:transparent;color:#f4e6c7;font-size:23px;border:1px solid #65829a}',
   '.sau-mini-player button:disabled{opacity:.45;cursor:default}',
   '.sau-mini-progress{display:flex;align-items:center;gap:7px;min-height:22px}',
   '.sau-mini-progress input[type=range]{flex:1;min-width:0;width:auto;height:16px;margin:0;accent-color:#e2bd7e}',
   '.sau-mini-time{white-space:nowrap;color:#e8dcc5;text-align:right;font:10px system-ui;min-width:76px;font-variant-numeric:tabular-nums}',
   '.sau-mini-launch:focus-visible,.sau-mini-player button:focus-visible,.sau-mini-progress input:focus-visible{outline:3px solid white;outline-offset:2px}',
   'body.sau-player-expanded .app-shell{padding-bottom:calc(var(--sau-bottom-offset,86px) + var(--sau-panel-height,75px) + 18px)!important}',
   '@media(max-width:360px){.sau-mini-player{padding:5px 7px}.sau-mini-title{font-size:12px}.sau-mini-row{gap:4px}}'
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
  progress.append(slider,time);bar.append(row,progress);document.body.append(launch,bar);

  var expanded=false,status={},library={},selected=null,lastList='',originalBodyPadding=document.body.style.paddingBottom;
  function data(){return window.SionsTvData?window.SionsTvData():{};}
  function safeJSON(raw){try{return JSON.parse(raw||'{}');}catch(e){return {};}}
  function clock(s){s=Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function currentSong(key){
   var songs=data().library||[];
   return songs.find(function(song){return String(song.audio_key||song.song_number)===key;})||null;
  }
  function reposition(){
   var nav=document.querySelector('.bottom-nav');
   var rect=nav&&nav.getBoundingClientRect();
   var clearance=rect&&rect.height>0&&rect.top<window.innerHeight?Math.ceil(window.innerHeight-rect.top)+6:10;
   clearance=Math.max(10,clearance);
   document.documentElement.style.setProperty('--sau-bottom-offset',clearance+'px');
   if(!bar.hidden){
    var height=Math.max(65,Math.ceil(bar.getBoundingClientRect().height));
    document.documentElement.style.setProperty('--sau-panel-height',height+'px');
    if(!document.querySelector('.app-shell'))document.body.style.paddingBottom=Math.max(0,clearance+height+18)+'px';
   }else if(!document.querySelector('.app-shell'))document.body.style.paddingBottom=originalBodyPadding;
  }
  function render(){
   var tv=document.getElementById('tvMirrorOverlay'),modal=document.getElementById('sau-catalog');
   var blocked=!!((tv&&!tv.hidden)||(modal&&!modal.hidden));
   launch.hidden=blocked||expanded;
   bar.hidden=blocked||!expanded;
   launch.setAttribute('aria-expanded',String(expanded));
   document.body.classList.toggle('sau-player-expanded',!bar.hidden);
   reposition();
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
  window.addEventListener('resize',reposition);
  update();
  setInterval(update,750);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();