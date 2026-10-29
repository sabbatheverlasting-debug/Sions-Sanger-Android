/* One import, one complete ZIP backup; help stays behind ?. */
(function(){
'use strict';
function init(){
 const more=document.getElementById('moreScreen');
 if(!more||document.getElementById('sions-smart-import'))return;
 const css=document.createElement('style');
 css.textContent=[
 '#sions-smart-import{margin-top:4px}',
 '#sions-smart-import .ssi-title{display:flex;align-items:center;justify-content:space-between;gap:12px}',
 '#sions-smart-import .ssi-help{flex:0 0 40px;width:40px;height:40px;border:1px solid #d1b679;border-radius:50%;background:#f4e5c4;color:#193a55;font-size:22px;font-weight:bold}',
 '#sions-smart-import .ssi-helptext{margin:12px 0;padding:12px 14px;border-radius:12px;background:#f6efdf;border:1px solid #decda7;color:#243c50}',
 '#sions-smart-import .ssi-helptext p,#sions-smart-import .ssi-helptext li{font-size:14px;line-height:1.55;margin:6px 0}',
 '#sions-smart-import .ssi-helptext ul{padding-left:20px;margin:8px 0 12px}',
 '#sions-smart-import .ssi-helptext button{width:100%;padding:10px 12px;margin:5px 0;background:#fff9eb;border:1px solid #d5be8a;border-radius:10px;color:#183650}',
 '#sions-smart-import .ssi-helptext[hidden]{display:none!important}',
 '#sions-smart-import .ssi-status{margin-top:12px!important;white-space:pre-line}',
 '#sions-smart-import .ssi-count{font-weight:650;margin:10px 0!important}',
 '#moreScreen .ssi-legacy-hidden,#sau-catalog .ssi-legacy-hidden,#sions-score-import.ssi-legacy-hidden{display:none!important}'
 ].join('\n');document.head.appendChild(css);
 const panel=document.createElement('section');panel.id='sions-smart-import';panel.className='panel';
 const title=document.createElement('div');title.className='ssi-title';
 const heading=document.createElement('h3');heading.textContent='Import och säkerhetskopia';
 const info=document.createElement('button');info.type='button';info.className='ssi-help';info.textContent='?';
 info.setAttribute('aria-label','Visa format och instruktioner');info.setAttribute('aria-expanded','false');
 title.append(heading,info);
 const explain=document.createElement('p');explain.textContent='Välj dina filer. Appen känner igen format och sångnummer automatiskt.';
 const open=document.createElement('button');open.type='button';open.className='primary';open.id='sions-smart-import-open';open.textContent='＋ Importera filer eller ZIP';
 const backup=document.createElement('button');backup.type='button';backup.className='secondary';backup.id='sions-smart-backup-export';backup.textContent='⇩ Säkerhetskopiera allt (ZIP)';
 const count=document.createElement('p');count.className='ssi-count';count.id='sions-smart-count';
 const status=document.createElement('p');status.className='ssi-status';status.id='sions-smart-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const help=document.createElement('section');help.className='ssi-helptext';help.hidden=true;help.id='sions-smart-help';
 help.innerHTML='<p><strong>Format som stöds</strong></p>'+
 '<ul><li><strong>Sångtexter:</strong> JSON med sångnummer, titel och verser, eller ett JSON-paket med <code>songs</code>.</li>'+
 '<li><strong>Ljud:</strong> MP3, Opus, OGG, M4A, WAV, AAC, FLAC, MID och MIDI.</li>'+
 '<li><strong>Noter:</strong> PDF, JPG, PNG, WebP, MusicXML, MXL och MusicXML-baserad XML.</li>'+
 '<li><strong>ZIP:</strong> flera stödda filer i en samling, eller en komplett säkerhetskopia skapad i appen.</li></ul>'+
 '<p><strong>Så känner appen igen en sång:</strong> börja filnamnet med sångnumret, t.ex. <code>055_Melodi.opus</code> eller <code>55_noter.pdf</code>. En unik titel kan också räcka. Vid osäkra noter får du ange numret.</p>'+
 '<p><strong>För att få med precis allt:</strong> välj <em>Säkerhetskopiera allt (ZIP)</em>. Då sparas sångtexter, ljud, noter, favoriter, inställningar och versstarter tillsammans. En vanlig ZIP med musik är <strong>inte</strong> en komplett säkerhetskopia.</p>'+
 '<p>För att återställa väljer du samma <em>Importera filer eller ZIP</em> och pekar på säkerhetskopian. Kontrollera att filen finns och spara den gärna utanför telefonen före en uppdatering.</p>';
 const manage=document.createElement('button');manage.type='button';manage.id='sions-open-library';manage.textContent='♫ Visa ljudbibliotek och kopplingar';help.appendChild(manage);
 [title,explain,open,backup,count,status,help].forEach(el=>panel.appendChild(el));
 const h=more.querySelector('h2');h?h.insertAdjacentElement('afterend',panel):more.prepend(panel);
 const importPanel=Array.from(more.querySelectorAll('.panel')).find(el=>el!==panel&&el.querySelector('#importBtn'));
 if(importPanel)importPanel.classList.add('ssi-legacy-hidden');
 const oldBackup=document.getElementById('sions-backup');if(oldBackup)oldBackup.classList.add('ssi-legacy-hidden');
 const libraryLauncher=Array.from(more.querySelectorAll('button')).find(el=>el.textContent.includes('Ljudbibliotek · importera'));
 if(libraryLauncher)libraryLauncher.classList.add('ssi-legacy-hidden');
 const guide=document.querySelector('#moreScreen [data-note-photo-guide="more"]');
 if(guide){guide.classList.add('ssi-legacy-hidden');const button=document.createElement('button');button.type='button';button.textContent='📷 Så fotograferar du noter';button.onclick=()=>guide.click();help.appendChild(button);}
 const catalog=document.getElementById('sau-catalog');
 const catalogImport=catalog&&Array.from(catalog.querySelectorAll('button')).find(b=>b.textContent.includes('Importera ljud / ZIP'));
 if(catalogImport)catalogImport.classList.add('ssi-legacy-hidden');
 manage.onclick=()=>{if(libraryLauncher)libraryLauncher.click();else status.textContent='Ljudbiblioteket kan inte öppnas just nu.';};
 const scoreImport=document.getElementById('sions-score-import');if(scoreImport)scoreImport.classList.add('ssi-legacy-hidden');
 const source=document.getElementById('allSongsCount');
 const refresh=()=>{if(source)count.textContent=source.textContent+' sånger i biblioteket';};refresh();
 if(source)new MutationObserver(refresh).observe(source,{childList:true,characterData:true,subtree:true});
 info.onclick=()=>{help.hidden=!help.hidden;info.setAttribute('aria-expanded',String(!help.hidden));};
 open.onclick=()=>{
   const native=window.SionsAndroid;
   if(!native||typeof native.smartImport!=='function'){status.textContent='Blandad filimport kräver den senaste Android-versionen.';return;}
   let songs=[];try{songs=(window.SionsTvData&&window.SionsTvData().library||[]).map(s=>({number:String(s.song_number||''),title:String(s.title||'')}));}catch(_){}
   native.smartImport(JSON.stringify(songs));
 };
 backup.onclick=()=>{const original=document.querySelector('#sions-backup button.primary');if(original)original.click();else status.textContent='ZIP-säkerhetskopiering finns inte i denna version.';};
 window.sionsSmartImportStatus=function(text){status.textContent=String(text);};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
