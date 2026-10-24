const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'android-source/app/src/main/assets/index.html','utf8');
async function open(imported){
 const dom=new JSDOM(html,{url:'https://sions.test',runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};
 if(imported)w.localStorage.setItem('sions-sanger-imports-1',JSON.stringify(imported));
 w.localStorage.setItem('sions-sanger-favorites-1',JSON.stringify(['nr:1']));
 w.localStorage.setItem('sions-app-colour-v1','#49345e');
 for(const script of w.document.querySelectorAll('script:not([src])'))if(script.type!=='application/json')w.eval(script.textContent);
 await new Promise(r=>setTimeout(r,20));return dom;
}
(async()=>{
 let dom=await open(),w=dom.window,d=w.document;
 assert.equal(JSON.parse(d.getElementById('initialSongs').textContent).songs.length,0,'No bundled text in the installed assets');
 assert.equal(d.getElementById('allSongsCount').textContent,'0');assert.equal(d.querySelectorAll('.song-row').length,0);
 assert(d.body.textContent.includes('Biblioteket är tomt'));dom.window.close();
 assert.match(html,/Compact library chrome/,'The compact catalogue style reaches the APK');
 assert.match(html,/padding-top:max\(58px/,'Status-bar and camera safe area remains intact');
 assert.match(html,/height:calc\(66px \+ env\(safe-area-inset-bottom\)\)/,'Footer is compact and safe-area aware');
 assert.match(html,/min-height:49px!important/,'Footer buttons keep comfortable touch targets');
 const song={song_number:1,title:'Egen testsång',category:null,authors:[],sections:[{type:'verse',number:1,lines:['Min egen provrad.']}]};
 dom=await open([song]);w=dom.window;d=w.document;
 assert.equal(d.getElementById('allSongsCount').textContent,'1');assert(d.body.textContent.includes(song.title));


 assert.deepEqual(JSON.parse(w.localStorage.getItem('sions-sanger-imports-1')),[song],'An update keeps manual imports, including same-number songs');
 assert.equal(w.localStorage.getItem('sions-app-colour-v1'),'#49345e');

 // Verify that the music button is unobtrusive until explicitly expanded.
 let audioStatus={number:'1',playing:true,ready:true,position:5,duration:90},stopped=false;
 w.SionsAndroid={
  audioList:()=>JSON.stringify({'1':{number:'1',title:'Provsång',file:'1.mp3'}}),
  audioStatus:()=>JSON.stringify(audioStatus),
  audioPause:()=>{audioStatus.playing=false},
  audioPlay:()=>{audioStatus.playing=true},
  audioStop:()=>{stopped=true;audioStatus={}},
  audioSeek:()=>{}
 };
 w.setInterval=()=>0;
 w.SionsTvData=()=>({library:[song],activeSong:song,openSong(){}});
 w.eval(fs.readFileSync('tv/audio-mini-player.js','utf8'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const launch=d.getElementById('sau-mini-launch'),panel=d.getElementById('sau-mini-player');
 assert(launch&&!launch.hidden&&panel.hidden,'Compact player must be collapsed on opening');
 assert(launch.parentElement===d.body,'Music toggle must not alter the existing bottom navigation');
 assert(panel.parentElement===d.body,'Expanded player stays independent from existing navigation');
 assert(!d.querySelector('.sau-mini-host'),'No extra footer or menu may be created');
 launch.click();assert(!panel.hidden,'Corner button should show player on request');
 assert(!d.body.classList.contains('sau-player-expanded'),'Opening player must not modify body classes');
 assert(!d.querySelector('.sau-mini-host'),'No screen elements should be reparented');
 panel.querySelector('.sau-mini-close').click();
 assert(panel.hidden&&!launch.hidden,'Close should bring back the corner button');
 launch.click();panel.querySelector('.sau-mini-stop').click();
 assert(stopped&&panel.hidden,'Stop stops playback and hides the player');

 assert.deepEqual(JSON.parse(w.localStorage.getItem('sions-sanger-favorites-1')),['nr:1']);
 d.getElementById('clearImports').click();assert.equal(d.getElementById('allSongsCount').textContent,'0','Clearing imports never restores bundled songs');
 dom.window.close();console.log('PASS: empty installation, no bundled lyrics, retained imports/favourites/colour, clearing imports stays empty');
})().catch(e=>{console.error(e);process.exit(1)});
