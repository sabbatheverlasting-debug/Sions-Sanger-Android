/* Local audio selection, import and optional verse cues. */
(function(){
 'use strict';
 function init(){
  var native=window.SionsAndroid;if(!native||!native.audioList)return;
  var $=function(id){return document.getElementById(id);};
  var library={},status={},following=false,lastCue='',activeKey='',catalogOpen=false;
  var badgeCss=document.createElement('style');badgeCss.textContent='.sau-audio-badge{display:inline-flex;align-items:center;gap:4px;margin-top:5px;padding:3px 8px;border:1px solid #2f7052;border-radius:20px;background:#e3f3e9;color:#185037;font:700 12px system-ui;white-space:nowrap}';document.head.appendChild(badgeCss);
  function decorateRegister(){
   document.querySelectorAll('.song-row[data-song-number]').forEach(function(row){
    var track=library[row.dataset.songNumber],badge=row.querySelector('.sau-audio-badge');
    if(!row.dataset.audioBaseLabel)row.dataset.audioBaseLabel=row.getAttribute('aria-label')||'';
    if(track&&track.file){
     var format=/\.mp3$/i.test(track.file)?'MP3':'Ljud';
     if(!badge){badge=document.createElement('span');badge.className='sau-audio-badge';var holder=row.querySelector('.song-row-body');if(holder)holder.appendChild(badge);}
     badge.textContent='♫ '+format;badge.title=format+' kopplad till sången';
     row.setAttribute('aria-label',row.dataset.audioBaseLabel+'. '+format+' kopplad');
    }else{if(badge)badge.remove();row.setAttribute('aria-label',row.dataset.audioBaseLabel);}
   });
  }
  function key(song){return song&&song.song_number!=null?String(song.song_number):'';}
  function data(){return window.SionsTvData?window.SionsTvData():{};}
  function parse(raw){try{return JSON.parse(raw||'{}');}catch(e){return {};}}
  function selection(){return window.sionsTvSelection?window.sionsTvSelection():null;}
  function time(n){n=Math.max(0,Math.floor(Number(n)||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
  function button(text,click){var b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=click;return b;}
  function play(number){if(status.number===number&&status.playing)native.audioPause();else native.audioPlay(number);refresh();}
  var css=document.createElement('style');css.textContent='.sau-controls{font:14px system-ui;color:var(--ink);padding:10px 18px 6px;text-align:center}.sau-controls button,#sau-catalog button{min-height:40px;border:1px solid #c8aa70;border-radius:9px;background:#f5e7c6;color:#17354d;padding:8px 12px;font:600 14px system-ui;margin:3px}.sau-controls select{max-width:100%;padding:9px;border-radius:8px;margin:7px 0}.sau-controls summary{cursor:pointer;padding:8px}.sau-controls small{display:block;line-height:1.5;opacity:.8}.sau-controls progress{width:90%;max-width:380px;display:block;margin:8px auto}.sau-controls input[type=range]{width:90%;max-width:380px}.sau-controls details{margin-top:4px}.sau-controls label{display:block}#sau-catalog{position:fixed;inset:0;overflow:auto;z-index:2147483500;background:var(--paper);color:var(--ink);padding:25px 16px 60px;font:16px system-ui}#sau-catalog[hidden]{display:none!important}.sau-track{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid #8c8c8c44}.sau-track span{flex:1}';document.head.appendChild(css);
  var catalog=document.createElement('section');catalog.id='sau-catalog';catalog.hidden=true;
  var heading=document.createElement('h2');heading.textContent='Ljudbibliotek';catalog.appendChild(heading);
  catalog.appendChild(button('Stäng',function(){catalog.hidden=true;catalogOpen=false;}));
  catalog.appendChild(button('Importera ljud / ZIP',function(){native.audioImport();}));
  var message=document.createElement('p');message.id='sau-import-status';catalog.appendChild(message);
  var explanation=document.createElement('p');explanation.textContent='Importera MP3 eller Opus, även många filer i en ZIP. Sångnummer i filnamnet kopplar ljudet automatiskt. Saknad sångtext kan läggas till senare.';catalog.appendChild(explanation);
  var rows=document.createElement('div');rows.id='sau-tracks';catalog.appendChild(rows);document.body.appendChild(catalog);
  function openCatalog(){catalog.hidden=false;catalogOpen=true;refresh(true);}
  var more=$('moreScreen');if(more){var launch=button('♫ Ljudbibliotek · importera musik',openCatalog);launch.style.cssText='display:block;margin:16px 0;padding:13px;border-radius:10px';more.insertBefore(launch,more.children[1]||null);}
  function catalogRows(){rows.replaceChildren();Object.keys(library).sort(function(a,b){return parseInt(a)-parseInt(b)||a.localeCompare(b);}).forEach(function(number){var track=library[number],row=document.createElement('div');row.className='sau-track';var name=document.createElement('span');name.textContent=number+'. '+track.title;row.appendChild(name);row.appendChild(button(status.number===number&&status.playing?'Pausa':'Spela',function(){
    var song=(data().library||[]).find(function(s){return key(s)===number;});
    if(song&&data().openSong){catalog.hidden=true;catalogOpen=false;data().openSong(song);if(window.sionsTvShowVerse)window.sionsTvShowVerse(0);}
    else if(!(status.number===number&&status.playing))try{native.tvUpdate(JSON.stringify({number:number,title:track.title,lines:[],section:'Sång '+number,theme:'navy',blank:false}));}catch(e){}
    play(number);
  }));rows.appendChild(row);});if(!Object.keys(library).length)rows.textContent='Inga ljud importerade än.';}
  function decorate(){var song=data().activeSong,body=$('songBody'),number=key(song);if(!song||!body||!number)return;
   var old=$('sau-controls');if(old&&old.dataset.song===number)return;if(old)old.remove();
   var root=document.createElement('div');root.id='sau-controls';root.className='sau-controls';root.dataset.song=number;
   var main=button('Spela',function(){if(library[number]){var sel=selection();if(!sel||key(sel.song)!==number){if(window.sionsTvShowVerse)window.sionsTvShowVerse(0);}play(number);}else native.audioImportFor(number);});main.id='sau-play';root.appendChild(main);
   var opts=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Musikval';opts.appendChild(summary);
   var choose=document.createElement('select');choose.id='sau-select';choose.setAttribute('aria-label','Välj musik till sången');opts.appendChild(choose);
   opts.appendChild(button('Koppla valt ljud',function(){if(choose.value){native.audioAssign(number,choose.value);refresh(true);}}));
   opts.appendChild(button('Importera ljud till denna sång',function(){native.audioImportFor(number);}));
   opts.appendChild(button('Öppna ljudbibliotek',openCatalog));
   var tvLabel=document.createElement('label'),tvCheck=document.createElement('input');tvCheck.type='checkbox';tvCheck.id='sau-tv-output';tvCheck.checked=!!status.targetTv;
   tvCheck.onchange=function(){native.audioTargetTv(tvCheck.checked);};tvLabel.appendChild(tvCheck);tvLabel.appendChild(document.createTextNode(' Ljud på TV (mobilen tyst)'));opts.appendChild(tvLabel);
   var tvHelp=document.createElement('small');tvHelp.textContent='Starta mobilbryggan och anslut LG-appen. Om TV:n nekar automatisk uppspelning: tryck Aktivera ljud på TV:n. MP3 rekommenderas för TV.';opts.appendChild(tvHelp);
   var help=document.createElement('small');help.textContent='Markera en vers, spela ljudet och spara versstarten när den börjar. Upprepa för varje vers. Aktivera sedan Följ ljudet.';opts.appendChild(help);
   opts.appendChild(button('Spara start för vald vers',function(){var sel=selection();if(status.ready&&status.number===number&&sel&&key(sel.song)===number){native.audioCue(number,sel.index,status.position);refresh(true);}else{$('sau-info').textContent='Välj en vers på TV och starta sångens ljud först.';}}));
   opts.appendChild(button('Rensa versstarter',function(){native.audioClearCues(number);lastCue='';refresh(true);}));
   var followLabel=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=false;check.id='sau-follow';check.onchange=function(){following=check.checked;lastCue='';};followLabel.appendChild(check);followLabel.appendChild(document.createTextNode(' Följ ljudet – byt vers på TV'));opts.appendChild(followLabel);root.appendChild(opts);
   var seek=document.createElement('input');seek.type='range';seek.id='sau-seek';seek.min='0';seek.max='1';seek.step='.1';seek.value='0';seek.setAttribute('aria-label','Spola i sången');seek.onchange=function(){native.audioSeek(number,Number(seek.value));};root.appendChild(seek);
   var info=document.createElement('small');info.id='sau-info';root.appendChild(info);
   var head=body.querySelector('.song-head');if(head)head.insertAdjacentElement('afterend',root);else body.prepend(root);
   activeKey=number;following=false;lastCue='';updateChoices();
  }
  function updateChoices(){var choose=$('sau-select');if(!choose)return;var prior=choose.value;choose.replaceChildren();var empty=document.createElement('option');empty.value='';empty.textContent='Välj ett importerat ljud';choose.appendChild(empty);Object.keys(library).sort(function(a,b){return parseInt(a)-parseInt(b)||a.localeCompare(b);}).forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n+'. '+library[n].title;choose.appendChild(o);});choose.value=prior&&library[prior]?prior:library[activeKey]?activeKey:'';}
  var lastLibrary='',lastStatus='';
  function refresh(force){var raw=native.audioList();if(raw!==lastLibrary||force){lastLibrary=raw;library=parse(raw);decorateRegister();updateChoices();if(catalogOpen)catalogRows();}status=parse(native.audioStatus());decorate();
   if($('sau-import-status'))$('sau-import-status').textContent=(status.busy?'Importerar… ': '')+(status.importStatus||'')+(status.error?' · '+status.error:'');
   var number=key(data().activeSong);if($('sau-tv-output')&&document.activeElement!==$('sau-tv-output'))$('sau-tv-output').checked=!!status.targetTv;if($('sau-play')){
    var same=status.number===number,has=!!library[number];$('sau-play').textContent=has?(same&&status.playing?'Pausa':'Spela'):'Lägg till musik';
    $('sau-seek').disabled=!same||!status.ready;$('sau-seek').max=String(same?status.duration||1:1);
    if(document.activeElement!==$('sau-seek'))$('sau-seek').value=String(same?status.position:0);
    var cues=parse(native.audioCues(number)),count=Object.keys(cues).length;
    $('sau-info').textContent=status.error||(!has?'Ingen musik kopplad':(same?time(status.position)+' / '+time(status.duration)+' · ':'')+count+' versstarter sparade');
    if(following&&same&&status.playing){var best=-1,bestTime=-1;Object.keys(cues).forEach(function(v){var t=Number(cues[v]);if(Number.isFinite(t)&&t<=status.position&&t>bestTime){best=Number(v);bestTime=t;}});var token=number+':'+best;if(best>=0&&token!==lastCue){lastCue=token;if(window.sionsTvShowVerse)window.sionsTvShowVerse(best);}}
   }
   var stamp=status.number+':'+status.playing;if(catalogOpen&&stamp!==lastStatus)catalogRows();lastStatus=stamp;
  }
  var body=$('songBody');if(body)new MutationObserver(function(){decorate();}).observe(body,{childList:true});
  ['list','favoriteList'].forEach(function(id){var root=$(id);if(root)new MutationObserver(decorateRegister).observe(root,{childList:true});});
  refresh();setInterval(function(){try{refresh();}catch(e){}},500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
