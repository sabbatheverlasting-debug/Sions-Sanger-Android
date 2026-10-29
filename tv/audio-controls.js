/* Local audio selection, import and optional verse cues. */
(function(){
 'use strict';
 function init(){
  var native=window.SionsAndroid;if(!native||!native.audioList)return;
  var $=function(id){return document.getElementById(id);};
  var library={},status={},following=false,lastCue='',activeKey='',catalogOpen=false;
  var followEngine=window.SionsAudioFollow;
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
  var css=document.createElement('style');css.textContent='.sau-controls{font:14px system-ui;color:var(--ink);padding:10px 18px 6px;text-align:center}.sau-controls button,#sau-catalog button{min-height:40px;border:1px solid #c8aa70;border-radius:9px;background:#f5e7c6;color:#17354d;padding:8px 12px;font:600 14px system-ui;margin:3px}.sau-controls select{max-width:100%;padding:9px;border-radius:8px;margin:7px 0}.sau-controls summary{cursor:pointer;padding:8px}.sau-controls small{display:block;line-height:1.5;opacity:.8}.sau-controls progress{width:90%;max-width:380px;display:block;margin:8px auto}.sau-controls input[type=range]{width:90%;max-width:380px}.sau-follow-label{display:flex!important;align-items:center;gap:8px;text-align:left!important;margin:6px 0!important;cursor:pointer;font-weight:650}.sau-follow-label input{width:20px;height:20px;flex:0 0 20px;accent-color:#1b5a48}.sau-follow-warning{border-left:3px solid #bc8b3b;background:rgba(240,194,113,.12);padding:6px 8px!important;margin:4px 0 6px!important;line-height:1.45!important}.sau-controls details{margin-top:4px}.sau-controls label{display:block}#sau-catalog{position:fixed;inset:0;overflow:auto;z-index:2147483500;background:var(--paper);color:var(--ink);padding:25px 16px 60px;font:16px system-ui}#sau-catalog[hidden]{display:none!important}.sau-track{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid #8c8c8c44}.sau-track span{flex:1}';
   css.textContent+='.sau-song-options{margin:0!important;max-width:100%} .sau-song-options>summary{cursor:pointer;list-style:none;min-height:34px;padding:6px 11px;border:1px solid #d4b773;border-radius:9px;background:#f6ead1;color:#283a4c;font:600 12px system-ui} .sau-song-options>summary::-webkit-details-marker{display:none} .sau-song-options[open]{width:100%} .sau-song-options:not([open]) #sau-controls{display:none!important} .sau-song-options #sau-controls{padding:5px 2px!important;margin:0!important} .sau-song-options #sau-controls button{min-height:33px!important;padding:5px 8px!important;margin:2px!important;font-size:12px!important} .sau-song-options #sau-controls summary{padding:4px!important} .sau-song-options #sau-controls input[type=range]{margin:4px!important}';
   css.textContent+='.sau-track{flex-wrap:wrap}.sau-manual-link{display:flex;flex:1 1 100%;gap:7px;align-items:center;flex-wrap:wrap}.sau-manual-link select{flex:1 1 180px;max-width:100%;min-height:39px;border:1px solid #c8aa70;border-radius:8px;padding:7px;color:#17354d;background:#fff}.sau-import-summary{font-weight:650;color:var(--ink);margin:10px 0}';
   document.head.appendChild(css);
  var catalog=document.createElement('section');catalog.id='sau-catalog';catalog.hidden=true;
  var heading=document.createElement('h2');heading.textContent='Ljudbibliotek';catalog.appendChild(heading);
  catalog.appendChild(button('Stäng',function(){catalog.hidden=true;catalogOpen=false;}));
  catalog.appendChild(button('Importera ljud / ZIP',function(){native.audioImport();}));
  var message=document.createElement('p');message.id='sau-import-status';catalog.appendChild(message);
  var explanation=document.createElement('p');explanation.textContent='Importera MP3, Opus eller ZIP. Sångnummer (t.ex. 055 eller Sions Sånger 55) och unika sångtitlar matchas automatiskt. Okopplade filer kan kopplas manuellt här, utan att du importerar dem på nytt.';catalog.appendChild(explanation);
  var summaryCounts=document.createElement('p');summaryCounts.id='sau-library-summary';summaryCounts.className='sau-import-summary';catalog.appendChild(summaryCounts);
  var rows=document.createElement('div');rows.id='sau-tracks';catalog.appendChild(rows);document.body.appendChild(catalog);
  function openCatalog(){catalog.hidden=false;catalogOpen=true;refresh(true);}
  var more=$('moreScreen');if(more){var launch=button('♫ Ljudbibliotek · importera musik',openCatalog);launch.style.cssText='display:block;margin:16px 0;padding:13px;border-radius:10px';more.insertBefore(launch,more.children[1]||null);}
  var matcher=window.SionsAudioMatch;
  function songNumbers(){var set=new Set();(data().library||[]).forEach(function(song){var n=key(song);if(n)set.add(n);});return set;}
  function matchUnnumbered(){
   var songs=data().library||[],linked=0;
   if(!matcher||!songs.length)return linked;
   var occupied={};
   Object.keys(library).forEach(function(n){if(!n.startsWith('unassigned:')&&library[n]&&library[n].file)occupied[n]=true;});
   Object.keys(library).filter(function(n){return n.startsWith('unassigned:');}).forEach(function(source){
    var result=matcher.resolve(library[source],songs,occupied),dest=result.number;
    if(!dest||occupied[dest])return;
    native.audioAssign(dest,source);
    occupied[dest]=true;
    linked++;
   });
   if(linked)library=parse(native.audioList());
   return linked;
  }
  function catalogRows(){
   rows.replaceChildren();
   var songs=data().library||[],known=songNumbers();
   var numbers=Object.keys(library),linked=numbers.filter(function(n){return known.has(n)&&!n.startsWith('unassigned:');}).length;
   var summary=$('sau-library-summary');
   if(summary)summary.textContent=numbers.length+' ljud · '+linked+' kopplade till sångtexter · '+(numbers.length-linked)+' behöver kopplas';
   numbers.sort(function(a,b){return parseInt(a)-parseInt(b)||a.localeCompare(b);}).forEach(function(number){
    var track=library[number],row=document.createElement('div');row.className='sau-track';
    var name=document.createElement('span');var assigned=known.has(number)&&!number.startsWith('unassigned:');
    name.textContent=(assigned?'✓ '+number+'. ':'⚠ Okopplad · ')+(track.title||track.originalName||'Ljudfil');
    row.appendChild(name);
    row.appendChild(button(status.number===number&&status.playing?'Pausa':'Spela',function(){
     var song=songs.find(function(s){return key(s)===number;});
     if(song&&data().openSong){catalog.hidden=true;catalogOpen=false;data().openSong(song);if(window.sionsTvShowVerse)window.sionsTvShowVerse(0);}
     else if(!(status.number===number&&status.playing))try{native.tvUpdate(JSON.stringify({number:number,title:track.title,lines:[],section:'Sång '+number,theme:'navy',blank:false}));}catch(e){}
     play(number);
    }));
    if(!assigned&&songs.length){
     var group=document.createElement('div');group.className='sau-manual-link';
     var choose=document.createElement('select');choose.setAttribute('aria-label','Välj sångtext till '+track.title);
     var placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Välj rätt sång';choose.appendChild(placeholder);
     songs.forEach(function(song){var n=key(song);if(!n)return;var option=document.createElement('option');option.value=n;option.textContent=n+' · '+song.title;choose.appendChild(option);});
     group.appendChild(choose);
     group.appendChild(button('Koppla',function(){
      var dest=choose.value;
      if(!dest)return;
      if(library[dest]&&library[dest].file!==track.file&&!window.confirm('Sång '+dest+' har redan ett ljud. Vill du ersätta kopplingen?'))return;
      native.audioAssign(dest,number);refresh(true);
     }));
     row.appendChild(group);
    }
    rows.appendChild(row);
   });
   if(!numbers.length)rows.textContent='Inga ljud importerade än.';
  }
  function decorate(){var song=data().activeSong,body=$('songBody'),number=key(song);if(!song||!body||!number)return;
   var old=$('sau-controls');if(old&&old.dataset.song===number)return;if(old){var previous=old.closest('.sau-song-options');if(previous)previous.remove();else old.remove();}
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
   var help=document.createElement('small');help.textContent='För exakta TV-versbyten: spela ljudet, markera varje vers och tryck Spara start när den börjar. Utan sparade tider används ungefärliga tider.';opts.appendChild(help);
   opts.appendChild(button('Spara start för vald vers',function(){var sel=selection();if(status.ready&&status.number===number&&sel&&key(sel.song)===number){native.audioCue(number,sel.index,status.position);refresh(true);}else{$('sau-info').textContent='Välj en vers på TV och starta sångens ljud först.';}}));
   opts.appendChild(button('Rensa versstarter',function(){native.audioClearCues(number);lastCue='';refresh(true);}));
   root.appendChild(opts);
   var followLabel=document.createElement('label'),check=document.createElement('input');
   followLabel.className='sau-follow-label';
   check.type='checkbox';check.checked=following;check.id='sau-follow';
   check.onchange=function(){
    following=check.checked;lastCue='';
    if(following&&!library[number]){following=false;check.checked=false;}
    if(following&&typeof native.tvKeepAwake==='function')native.tvKeepAwake(true);
    updateFollowInfo(number);
   };
   followLabel.appendChild(check);followLabel.appendChild(document.createTextNode(' Följ ljudet – byt vers på TV'));
   root.appendChild(followLabel);
   var followInfo=document.createElement('small');followInfo.id='sau-follow-status';followInfo.className='sau-follow-warning';
   followInfo.setAttribute('role','status');root.appendChild(followInfo);
   var seek=document.createElement('input');seek.type='range';seek.id='sau-seek';seek.min='0';seek.max='1';seek.step='.1';seek.value='0';seek.setAttribute('aria-label','Spola i sången');seek.onchange=function(){native.audioSeek(number,Number(seek.value));};root.appendChild(seek);
   var info=document.createElement('small');info.id='sau-info';root.appendChild(info);
   
    var wrap=document.createElement('details');wrap.className='sau-song-options';
    var label=document.createElement('summary');label.textContent='♫ Musik';wrap.appendChild(label);wrap.appendChild(root);
    var strip=body.querySelector('#song-utility-strip'),head=body.querySelector('.song-head');
    if(strip)strip.appendChild(wrap);else if(head)head.insertAdjacentElement('afterend',wrap);else body.prepend(wrap);
   if(activeKey!==number){following=false;lastCue='';}
   activeKey=number;check.checked=following;updateChoices();
  }
  function updateChoices(){var choose=$('sau-select');if(!choose)return;var prior=choose.value;choose.replaceChildren();var empty=document.createElement('option');empty.value='';empty.textContent='Välj ett importerat ljud';choose.appendChild(empty);Object.keys(library).sort(function(a,b){return parseInt(a)-parseInt(b)||a.localeCompare(b);}).forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n+'. '+library[n].title;choose.appendChild(o);});choose.value=prior&&library[prior]?prior:library[activeKey]?activeKey:'';}
  function updateFollowInfo(number,provided){
   var node=$('sau-follow-status'),song=data().activeSong;
   if(!node||!song||key(song)!==number)return;
   if(!library[number]){node.textContent='Importera eller koppla en ljudfil till denna sång först.';return;}
   var saved=provided||parse(native.audioCues(number));
   var parts=Array.isArray(song.sections)?song.sections.length:0;
   var plan=followEngine?followEngine.calculate(saved,parts,Math.max(1,status.duration||1)):null;
   if(!following){node.textContent='Av. Aktivera för TV-versbyten. För exakthet: spara varje versstart under Musikval.';return;}
   if(!status.ready||status.number!==number){node.textContent='På. Spela den här sångens ljud och anslut TV-visningen. Håll appen aktiv.';return;}
   node.textContent=plan&&plan.mode==='calibrated'
    ?'På · '+parts+' exakta versstarter sparade. TV:n byter vers vid dessa tider.'
    :'På · ungefärliga versbyten ('+(plan?plan.exact:0)+' av '+parts+' exakta starttider). Spara versstarter för bättre precision.';
  }
  var lastLibrary='',lastStatus='',lastSongSignature='',autoMatches=0;
  function refresh(force){
   var raw=native.audioList(),songs=data().library||[];
   var signature=songs.map(function(song){return key(song)+':'+(song.title||'');}).join('|');
   if(raw!==lastLibrary||force||signature!==lastSongSignature){
    lastSongSignature=signature;library=parse(raw);
    var matches=matchUnnumbered();autoMatches+=matches;
    lastLibrary=native.audioList();library=parse(lastLibrary);
    decorateRegister();updateChoices();if(catalogOpen)catalogRows();
   }
   status=parse(native.audioStatus());decorate();
   if($('sau-import-status'))$('sau-import-status').textContent=(status.busy?'Importerar… ': '')+(status.importStatus||'')+(autoMatches?' · '+autoMatches+' automatiskt kopplade':'')+(status.error?' · '+status.error:'');
   var number=key(data().activeSong);if($('sau-tv-output')&&document.activeElement!==$('sau-tv-output'))$('sau-tv-output').checked=!!status.targetTv;if($('sau-play')){
    var same=status.number===number,has=!!library[number];$('sau-play').textContent=has?(same&&status.playing?'Pausa':'Spela'):'Lägg till musik';
    $('sau-seek').disabled=!same||!status.ready;$('sau-seek').max=String(same?status.duration||1:1);
    if(document.activeElement!==$('sau-seek'))$('sau-seek').value=String(same?status.position:0);
    var cues=parse(native.audioCues(number)),count=Object.keys(cues).length;
    $('sau-info').textContent=status.error||(!has?'Ingen musik kopplad':(same?time(status.position)+' / '+time(status.duration)+' · ':'')+count+' versstarter sparade');
    updateFollowInfo(number,cues);
    if(following&&same&&status.ready&&status.playing&&followEngine){
     var song=data().activeSong,parts=song&&song.sections?song.sections.length:0;
     var schedule=followEngine.calculate(cues,parts,status.duration);
     var best=followEngine.verseAt(schedule.times,status.position),token=number+':'+best;
     if(best>=0&&token!==lastCue&&typeof window.sionsTvShowVerse==='function'){
      lastCue=token;
      window.sionsTvShowVerse(best);
      var note=$('sau-follow-status');
      if(note)note.textContent=(schedule.mode==='calibrated'?'Exakta sparade versstarter':'Ungefärliga versstarter')+' · visat '+(best+1)+' av '+parts+' på TV. Håll appen öppen och TV-anslutningen aktiv.';
     }
    }
   }
   var stamp=status.number+':'+status.playing;if(catalogOpen&&stamp!==lastStatus)catalogRows();lastStatus=stamp;
  }
  var body=$('songBody');if(body)new MutationObserver(function(){decorate();}).observe(body,{childList:true});
  ['list','favoriteList'].forEach(function(id){var root=$(id);if(root)new MutationObserver(decorateRegister).observe(root,{childList:true});});
  refresh();setInterval(function(){try{refresh();}catch(e){}},500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
