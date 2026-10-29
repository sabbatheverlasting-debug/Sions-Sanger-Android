/* Sions Sånger: optional personal sheet music beside imported hymn text.
   Scores are stored privately by Android, not in the app's bundled assets. */
(function(){
  'use strict';
  function init(){
    var native=window.SionsAndroid;
    var body=document.getElementById('songBody');
    var root=document.querySelector('#songScreen .song-inner');
    if(!native || typeof native.scoreInfo!=='function' || !body || !root) return;

    var current='', mode='text', page=0, count=0, zoom=1, lastSource='';
    var css=document.createElement('style');
    css.textContent=[
      '#sions-score-tabs{display:flex;gap:6px;align-items:center;justify-content:center;padding:5px 8px;background:var(--paper,#fcf8ed);border-bottom:1px solid #ddcfb7;position:sticky;top:0;z-index:15}',
      '#sions-score-tabs button{min-height:34px;border:1px solid #c6ac77;border-radius:10px;padding:5px 12px;background:#f6edda;color:#193956;font:700 13px system-ui}',
      '#sions-score-tabs button[aria-pressed="true"]{background:#193b56;color:#fff4d5}',
      '#sions-score-viewer{background:#f8f4ec;color:#152c42;height:calc(100dvh - 150px);min-height:280px;display:flex;flex-direction:column;overflow:hidden}',
      '#sions-score-viewer[hidden],#sions-score-tabs[hidden]{display:none!important}',
      '#sions-score-viewer .score-tools{display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap;padding:8px 6px;flex:0 0 auto;background:#f4e8d1}',
      '#sions-score-viewer .score-tools button{min-height:36px;padding:7px 10px;background:#fff9ea;color:#1c3854;border:1px solid #c7b387;border-radius:8px;font:650 12px system-ui}',
      '#sions-score-viewer .score-tools button:disabled{opacity:.45}',
      '#sions-score-viewer .score-pages{font:600 12px system-ui;white-space:nowrap}',
      '#sions-score-viewer .score-canvas{flex:1 1 auto;overflow:auto;overscroll-behavior:contain;touch-action:pan-x pan-y;background:#dad7d2;text-align:center;padding:8px}',
      '#sions-score-viewer .score-canvas img{display:block;margin:0 auto;max-width:none;height:auto;box-shadow:0 2px 12px #0004;background:#fff;user-select:none;-webkit-user-drag:none}',
      '#sions-score-viewer .score-empty{padding:28px 17px;text-align:center;font:15px/1.5 system-ui;color:#173452}',
      '#sions-score-viewer .score-alert{padding:6px 10px;text-align:center;font:12px/1.4 system-ui;color:#66502d}',
      '#sions-score-viewer .score-hidden{display:none!important}'
    ].join('\n'); document.head.appendChild(css);

    var tabs=document.createElement('nav');
    tabs.id='sions-score-tabs';tabs.setAttribute('aria-label','Visningsläge');
    tabs.innerHTML='<button type="button" id="sions-show-text" aria-pressed="true">📖 Text</button>'+
      '<button type="button" id="sions-show-scores" aria-pressed="false">🎼 Noter</button>';
    root.insertBefore(tabs,body);

    var viewer=document.createElement('section');
    viewer.id='sions-score-viewer';viewer.hidden=true;viewer.setAttribute('aria-label','Notvisning');
    viewer.innerHTML=
      '<div class="score-tools">'+
       '<button id="sions-score-import" type="button">＋ Importera noter</button>'+
       '<button id="sions-score-remove" type="button">Radera noter</button>'+
       '<button id="sions-score-prev" type="button" aria-label="Föregående notsida">◀</button>'+
       '<span class="score-pages" id="sions-score-pages"></span>'+
       '<button id="sions-score-next" type="button" aria-label="Nästa notsida">▶</button>'+
       '<button id="sions-score-minus" type="button" aria-label="Minska noter">A−</button>'+
       '<button id="sions-score-plus" type="button" aria-label="Förstora noter">A＋</button>'+
      '</div>'+
      '<div class="score-alert" id="sions-score-message">Importera egna notbilder eller en PDF till den valda sången.</div>'+
      '<div class="score-canvas" id="sions-score-canvas">'+
       '<p class="score-empty" id="sions-score-empty">Inga noter importerade för den här sången.</p>'+
       '<img id="sions-score-image" alt="Notbild" class="score-hidden" />'+
      '</div>';
    body.insertAdjacentElement('afterend',viewer);

    function $(name){return document.getElementById('sions-'+name);}
    function selectedSong(){try{return window.SionsTvData&&window.SionsTvData().activeSong;}catch(e){return null;}}
    function number(){var song=selectedSong();return song&&song.song_number!=null?String(song.song_number):'';}
    function scoreInfo(no){try{return JSON.parse(native.scoreInfo(no)||'{}');}catch(e){return {};}}
    function notifyTv(){if(typeof window.sionsTvRefresh==='function')window.sionsTvRefresh();}
    function setControls(){
      $('show-text').setAttribute('aria-pressed',String(mode==='text'));
      $('show-scores').setAttribute('aria-pressed',String(mode==='notes'));
      body.style.display=mode==='notes'?'none':'';
      viewer.hidden=mode!=='notes';
      var info=scoreInfo(current);
      count=Number(info.count)||0;
      page=Math.max(0,Math.min(count-1,page));
      $('score-pages').textContent=count?(page+1)+' / '+count:'0 sidor';
      $('score-prev').disabled=page===0;
      $('score-next').disabled=page>=count-1;
      $('score-remove').disabled=!count;
      $('score-message').textContent=info.status|| (count?'Noter lagrade endast på den här enheten.':'Importera notbilder eller en PDF för vald sång.');
    }
    function draw(){
      setControls();
      if(mode!=='notes')return;
      if(!count){
        $('score-image').classList.add('score-hidden');
        $('score-empty').classList.remove('score-hidden');
        $('score-empty').textContent='Inga noter för sång '+current+'. Tryck på Importera noter och välj PDF, JPG, PNG eller WebP.';
        return;
      }
      $('score-empty').classList.add('score-hidden');
      var key=current+':'+page;
      if(lastSource!==key){
        var imgdata='';
        try {imgdata=native.scorePage(current,page);} catch(e){}
        if(!imgdata) {
          $('score-empty').textContent='Notsidan kunde inte läsas. Prova att importera den igen.';
          $('score-empty').classList.remove('score-hidden');
          $('score-image').classList.add('score-hidden');
          return;
        }
        $('score-image').src=imgdata;
        $('score-image').classList.remove('score-hidden');
        lastSource=key;
      }
      // Native bitmap is 1500px wide. CSS sizing keeps the whole page visible initially.
      $('score-image').style.width=(100*zoom)+'%';
      $('score-image').style.minWidth='0';
    }
    function changeMode(next){
      var n=number(); if(!n)return;
      if(current!==n){current=n;page=0;zoom=1;lastSource='';}
      mode=next;
      draw();
      if(mode==='notes'&&typeof window.sionsTvShowVerse==='function')window.sionsTvShowVerse(0);
      else notifyTv();
    }
    $('show-text').onclick=function(){changeMode('text');};
    $('show-scores').onclick=function(){changeMode('notes');};
    $('score-import').onclick=function(){if(current)native.scorePick(current);};
    $('score-remove').onclick=function(){
      if(current&&count&&confirm('Ta bort alla importerade noter för sång '+current+' från enheten?')){
        native.scoreRemove(current);page=0;lastSource='';draw();notifyTv();
      }
    };
    function changePage(delta){
      if(mode!=='notes'||!count)return;
      var next=Math.max(0,Math.min(count-1,page+delta));
      if(next===page)return;
      page=next;lastSource='';draw();notifyTv();
      $('score-canvas').scrollTo(0,0);
    }
    $('score-prev').onclick=function(){changePage(-1);};
    $('score-next').onclick=function(){changePage(1);};
    $('score-minus').onclick=function(){zoom=Math.max(.6,Math.round((zoom-.2)*10)/10);draw();};
    $('score-plus').onclick=function(){zoom=Math.min(4,Math.round((zoom+.2)*10)/10);draw();};

    // Two-finger pinch in the scrolling score canvas, with A-/A+ as accessible fallback.
    var pinch=0,initialZoom=1;
    $('score-canvas').addEventListener('touchstart',function(e){
      if(e.touches.length===2) {
        pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
                         e.touches[0].clientY-e.touches[1].clientY);
        initialZoom=zoom;
      }
    },{passive:true});
    $('score-canvas').addEventListener('touchmove',function(e){
      if(e.touches.length===2 && pinch>0){
        var size=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
                            e.touches[0].clientY-e.touches[1].clientY);
        zoom=Math.max(.6,Math.min(4,initialZoom*size/pinch));
        $('score-image').style.width=(zoom*100)+'%';
        e.preventDefault();
      }
    },{passive:false});
    $('score-canvas').addEventListener('touchend',function(e){
      if(e.touches.length<2)pinch=0;
    },{passive:true});

    // Called from TV controller; the TV server fetches a protected JPEG separately.
    window.sionsScoreTvPayload=function(song){
      if(mode!=='notes'||!song||String(song.song_number)!==current||!count)return null;
      return {scoreMode:true,scoreNumber:current,scorePage:page,scoreCount:count};
    };
    window.sionsScoreNextPage=function(delta){changePage(delta);};
    window.sionsScoreOpenForSong=function(song){
      if(!song||song.song_number==null)return;
      current=String(song.song_number);page=0;zoom=1;lastSource='';
      mode='notes';draw();
      if(typeof window.sionsTvShowVerse==='function')window.sionsTvShowVerse(0);
    };

    // Opening a different imported song switches back to its text, not the previous score.
    function checkSong(){
      var n=number();
      tabs.hidden=!n;
      if(n!==current){
        current=n;mode='text';page=0;zoom=1;lastSource='';
        setControls();
        notifyTv();
      }
    }
    var observer=new MutationObserver(checkSong);
    observer.observe(body,{childList:true,subtree:false});
    window.addEventListener('sions-score-updated',function(){lastSource='';draw();notifyTv();});
    checkSong();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
