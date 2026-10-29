/* Photographing sheet music: a reading guide, NOT a camera/OCR feature. */
(function(){
 'use strict';
 function init(){
  if(document.getElementById('sions-note-photo-guide'))return;
  var more=document.getElementById('moreScreen');
  if(!more)return;

  var style=document.createElement('style');
  style.textContent=[
   '#sions-note-photo-guide[hidden]{display:none!important}',
   '#sions-note-photo-guide{position:fixed;inset:0;z-index:2147483650;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:rgba(7,22,37,.85);padding:calc(12px + env(safe-area-inset-top)) 10px calc(20px + env(safe-area-inset-bottom));color:#19283a;font-family:system-ui,-apple-system,sans-serif}',
   '#sions-note-photo-guide .sng-card{background:var(--paper,#fbf8f0);width:100%;max-width:560px;margin:0 auto;border-radius:16px;padding:15px 15px 26px;box-shadow:0 15px 60px #0006}',
   '#sions-note-photo-guide .sng-head{display:flex;gap:9px;align-items:flex-start;justify-content:space-between;position:sticky;top:-12px;background:var(--paper,#fbf8f0);padding:8px 0 11px;border-bottom:1px solid #d9c9aa;z-index:2}',
   '#sions-note-photo-guide h2{font:600 25px/1.2 Georgia,serif;margin:0;color:#123351}',
   '#sions-note-photo-guide h3{font:700 16px/1.3 system-ui;margin:18px 0 5px;color:#123351}',
   '#sions-note-photo-guide p,#sions-note-photo-guide li{font-size:15px;line-height:1.55}',
   '#sions-note-photo-guide ol{padding-left:22px;margin:9px 0}',
   '#sions-note-photo-guide li{margin:0 0 10px}',
   '#sions-note-photo-guide .sng-alert{background:#fff4da;border-left:4px solid #b78332;border-radius:5px;padding:12px;margin:15px 0}',
   '#sions-note-photo-guide .sng-close{border:1px solid #d1b984;background:#f5e7c7;color:#17354d;border-radius:9px;min-width:73px;min-height:39px;padding:7px 10px;font-weight:700}',
   '.sng-open-guide{display:inline-flex!important;justify-content:center;align-items:center;min-height:42px;padding:9px 12px;border:1px solid #ba9a67;border-radius:10px;background:#fff0cc;color:#17354d;font:700 14px system-ui;cursor:pointer}',
   '#moreScreen>.sng-open-guide{display:block!important;margin:12px 0 16px;width:100%;max-width:480px;text-align:center}',
   '#sau-catalog>.sng-open-guide{display:block!important;margin:8px 0 14px}',
   '#songScreen .sng-open-guide{margin:6px auto;min-height:35px!important;font-size:12px!important}'
  ].join('\n');
  document.head.appendChild(style);

  var overlay=document.createElement('section');
  overlay.id='sions-note-photo-guide';overlay.hidden=true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','sng-title');
  overlay.innerHTML=
   '<div class="sng-card"><div class="sng-head"><h2 id="sng-title">📸 Så fotograferar du noter</h2><button type="button" class="sng-close">Stäng ✕</button></div>'+
   '<p>Förbered tydliga notbilder som senare kan omvandlas till en spelbar melodi för <strong>Sions Sånger</strong>.</p>'+
   '<ol>'+
   '<li><strong>Lägg boken plant.</strong> Håll sidan så rak som möjligt. Använd jämnt dagsljus eller två lampor utan skuggor, reflexer och blänk.</li>'+
   '<li><strong>Fotografera rakt uppifrån.</strong> Håll telefonen parallellt med sidan. Använd gärna kamerans <strong>1×</strong>-läge, hög upplösning och skarp fokus. Undvik digital zoom och vidvinkelförvrängning.</li>'+
   '<li><strong>Ta först en helbild.</strong> Få med <strong>sångnummer, titel, all text, kompositör och alla notsystem</strong>. Lämna en liten marginal runt sidan.</li>'+
   '<li><strong>Ta sedan närbilder på noterna.</strong> Varje nothuvud, notlinje, notskaft, paus, punkt, båge och taktstreck ska synas tydligt. Klipp inte bort <strong>klav, förtecken, taktart, upptakt, repristecken eller slutrepriser</strong>.</li>'+
   '<li><strong>Om sången fortsätter på en annan sida:</strong> fotografera den också och låt en del av notsystemet överlappa mellan bilderna, så att ordningen blir tydlig.</li>'+
   '<li><strong>Kontrollera bilderna innan du sparar.</strong> Förstora på telefonen: kan du själv läsa varje not och förtecken? Ta om bilden om den är suddig eller sned.</li>'+
   '</ol>'+
   '<h3>🎹 Från foto till spelbar musik</h3>'+
   '<p>Fotot eller en skannad PDF innehåller en <strong>bild av noter</strong>, inte färdig speldata. Noterna måste först tydas med notigenkänning eller matas in manuellt, rättas och sparas som <strong>MusicXML</strong> och därefter som <strong>MIDI (.mid)</strong>.</p>'+
   '<p>MIDI är det format som instrumentalspelaren är avsedd att använda. Om noter finns för flera stämmor kan du välja att omvandla enbart melodin eller fler stämmor. Resultatet behöver alltid kontrolleras genom provlyssning.</p>'+
   '<div class="sng-alert"><strong>Viktigt:</strong> Appen kan ännu <strong>inte</strong> läsa ett notfoto och spela det direkt. Detta är en fotograferingsguide inför senare notigenkänning. Kontrollera rättigheter till text, melodi och arrangemang innan du delar material med andra.</div>'+
   '<h3>📁 Ordna filerna</h3>'+
   '<p>Spara gärna som <strong>103_hel_sida.jpg</strong>, <strong>103_noter_1.jpg</strong> och <strong>103_melodi.mid</strong>. Samma sångnummer gör det lättare att hitta rätt material.</p>'+
   '</div>';
  document.body.appendChild(overlay);
  var lastFocus=null;
  function open(){
   lastFocus=document.activeElement;
   overlay.hidden=false;
   overlay.scrollTop=0;
   overlay.querySelector('.sng-close').focus();
  }
  function close(){
   overlay.hidden=true;
   if(lastFocus&&lastFocus.isConnected&&typeof lastFocus.focus==='function')lastFocus.focus();
  }
  overlay.querySelector('.sng-close').addEventListener('click',close);
  overlay.addEventListener('click',function(e){if(e.target===overlay)close();});
  overlay.addEventListener('keydown',function(e){
   if(e.key==='Escape'){e.preventDefault();close();}
   if(e.key==='Tab'){
    var buttons=Array.from(overlay.querySelectorAll('button:not([disabled])'));
    if(!buttons.length)return;
    if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus();}
    else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus();}
   }
  });

  function addButton(parent,label,kind){
   if(!parent||parent.querySelector('[data-note-photo-guide="'+kind+'"]'))return;
   var btn=document.createElement('button');
   btn.type='button';btn.className='sng-open-guide';
   btn.dataset.notePhotoGuide=kind;
   btn.textContent=label;
   btn.addEventListener('click',open);
   if(kind==='more')parent.insertBefore(btn,parent.children[1]||null);
   else parent.appendChild(btn);
  }
  addButton(more,'📸 Så fotograferar du noter','more');
  addButton(document.getElementById('sau-catalog'),'📸 Guide: fotografera noter','catalog');
  function attachSong(){
   var opts=document.querySelector('#songBody .sau-song-options #sau-controls details');
   addButton(opts,'📸 Fotografera noter','song');
  }
  attachSong();
  var body=document.getElementById('songBody');
  if(body){
   new MutationObserver(function(){attachSong();}).observe(body,{childList:true});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();