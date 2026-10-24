/* Persistent audio mini-player shared by the 3 Angels and Sions reader interfaces. */
(function(){
 'use strict';
 function init(){
  var native=window.SabbathAudioNative||window.SionsAndroid;
  if(!native||!native.audioStatus||!native.audioList||document.getElementById('sau-mini-player'))return;
  var css=document.createElement('style');
  css.textContent=[
   '.sau-mini-player{box-sizing:border-box;position:fixed;z-index:1500;left:50%;transform:translateX(-50%);bottom:calc(var(--nav-height,82px) + env(safe-area-inset-bottom));width:min(calc(100% - 16px),795px);color:#f8f2e8;background:#102d46;border:1px solid #b59a68;border-radius:15px 15px 12px 12px;box-shadow:0 -5px 25px #0007;padding:9px 12px 7px;font:14px system-ui,sans-serif}',
   '.sau-mini-player[hidden]{display:none!important}',
   '.sau-mini-row{display:flex;align-items:center;gap:8px;min-height:46px}',
   '.sau-mini-title{flex:1;min-width:0;text-align:left;color:#fff1c8;background:transparent;border:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 14px system-ui;padding:7px 4px;min-height:40px}',
   '.sau-mini-player button.sau-mini-control{background:#f1d89e;border:0;color:#16364d;border-radius:10px;min-width:44px;min-height:44px;font:bold 18px system-ui}',
   '.sau-mini-player button.sau-mini-stop{background:#244f6f;color:white;border:1px solid #b59a68}',
   '.sau-mini-player input[type=range]{width:100%;height:16px;accent-color:#e2bd7e;display:block;margin:4px 0}',
   '.sau-mini-time{display:flex;justify-content:space-between;gap:8px;font:11px system-ui;color:#e8dcc5}',
   '.sau-mini-player button:focus-visible,.sau-mini-player input:focus-visible{outline:3px solid #fff;outline-offset:2px}',
   'body.sau-mini-open .app-shell{padding-bottom:calc(var(--nav-height,82px) + env(safe-area-inset-bottom) + 145px)!important}',
   '@media(max-width:400px){.sau-mini-player{padding:6px 8px}.sau-mini-title{font-size:12px}.sau-mini-player button.sau-mini-control{min-width:42px;min-height:42px}}'
  ].join('\n');
  document.head.appendChild(css);
  var bar=document.createElement('section');bar.id='sau-mini-player';bar.className='sau-mini-player';bar.hidden=true;bar.setAttribute('aria-label','Now playing');
  var r=document.createElement('div');r.className='sau-mini-row';
  var title=document.createElement('button');title.type='button';title.className='sau-mini-title';title.textContent='No audio';
  title.setAttribute('aria-label','Open currently playing hymn');
  var toggle=document.createElement('button');toggle.type='button';toggle.className='sau-mini-control';toggle.setAttribute('aria-label','Play');toggle.textContent='▶';
  var stop=document.createElement('button');stop.type='button';stop.className='sau-mini-control sau-mini-stop';stop.setAttribute('aria-label','Stop');stop.textContent='■';
  var slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1';slider.step='0.1';slider.value='0';slider.setAttribute('aria-label','Seek currently playing hymn');
  var t=document.createElement('div');t.className='sau-mini-time';
  var left=document.createElement('span');left.textContent='0:00';var right=document.createElement('span');right.textContent='0:00';t.append(left,right);
  r.append(title,toggle,stop);bar.append(r,slider,t);document.body.appendChild(bar);
  if(!document.querySelector('.bottom-nav')){bar.style.bottom='max(10px, env(safe-area-inset-bottom))';}
  var status={},library={},selected=null,lastList='';
  function data(){return window.SionsTvData?window.SionsTvData():{};}
  function safeJSON(raw){try{return JSON.parse(raw||'{}');}catch(e){return {};}}
  function clock(s){s=Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function currentSong(key){
   var all=data().library||[];
   return all.find(function(s){return String(s.audio_key||s.song_number)===key;})||null;
  }
  toggle.onclick=function(){if(!status.number)return;if(status.playing)native.audioPause();else native.audioPlay(status.number);update();};
  stop.onclick=function(){if(native.audioStop)native.audioStop();else native.audioPause();update();};
  title.onclick=function(){if(selected&&data().openSong)data().openSong(selected);};
  slider.onchange=function(){if(status.number&&status.ready)native.audioSeek(status.number,Number(slider.value));};
  function update(){
   var raw=native.audioList(),s=safeJSON(native.audioStatus());status=s;
   if(raw!==lastList){lastList=raw;library=safeJSON(raw);}
   var name=String(s.number||''),track=library[name];
   var overlay=document.getElementById('tvMirrorOverlay');
   var modal=document.getElementById('sau-catalog');
   var visible=!!name&&!!track&&!(overlay&&!overlay.hidden)&&!(modal&&!modal.hidden);
   bar.hidden=!visible;document.body.classList.toggle('sau-mini-open',visible);
   if(!document.querySelector('.app-shell'))document.body.style.paddingBottom=visible?'145px':'';
   if(!visible)return;
   selected=currentSong(name);
   var readable=selected?(String(selected.song_number)+' · '+selected.title):track.title||name;
   title.textContent=readable;title.title=readable+(s.targetTv?' · TV audio':'');
   toggle.textContent=s.playing?'Ⅱ':'▶';
   toggle.setAttribute('aria-label',s.playing?'Pause':'Play');
   slider.disabled=!s.ready;
   slider.max=String(Math.max(1,s.duration||1));
   if(document.activeElement!==slider)slider.value=String(Math.max(0,Math.min(s.duration||0,s.position||0)));
   left.textContent=clock(s.position);
   right.textContent=clock(s.duration)+(s.targetTv?' · TV':'');
   title.disabled=!selected;
  }
  window.HymnalMiniPlayer={refresh:update};
  update();
  setInterval(function(){try{update();}catch(e){}},500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
