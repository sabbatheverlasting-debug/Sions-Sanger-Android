/* Regression test: MusicXML title should not be part of a cropped SVG image. */
const fs=require('fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');

(async function(){
 const html=fs.readFileSync(process.argv[2]||'android-source/app/src/main/assets/index.html','utf8');
 assert.match(html,/score-viewer\.js/,'Updated score viewer is included in Android assets');
 assert.match(html,/opensheetmusicdisplay\.min\.js/,'Offline MusicXML renderer exists in assets');
 const page='<!doctype html><html><head></head><body>'+
 '<div id="songScreen"><div class="song-inner"><div id="songBody"></div></div></div>'+
 '</body></html>';
 const dom=new JSDOM(page,{url:'https://sions.test/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.HTMLElement.prototype.scrollTo=function(){}; // jsdom lacks browser scrollTo
 const title='My complete hymn title – Över hela skärmen ska rubriken synas';
 let options=null,rendered=0;
 w.SionsAndroid={
  scoreInfo:()=>JSON.stringify({count:1,mode:'musicxml'}),
  scoreXml:()=>'<score-partwise version="4.0"><movement-title>'+title+
   '</movement-title><part-list></part-list><part id="P1">'+
   '<measure number="1"/><measure number="2"/><measure number="3"/><measure number="4"/>'+
   '</part></score-partwise>',
  scorePage:()=>'',scoreRemove:()=>{},scorePick:()=>{}
 };
 w.SionsTvData=()=>({activeSong:{song_number:103,title:'Fallback title'}});
 w.opensheetmusicdisplay={OpenSheetMusicDisplay:function(id,opts){
  options=opts;
  this.load=()=>Promise.resolve();
  this.render=()=>{rendered++;};
  this.Zoom=1;
 }};
 w.eval(fs.readFileSync('tv/score-viewer.js','utf8'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const toggle=d.querySelector('#sions-show-scores');
 assert(toggle,'Noter button is available on the reader');
 toggle.click();
 await new Promise(resolve=>setTimeout(resolve,30));
 const heading=d.querySelector('#sions-score-heading');
 assert.equal(heading.textContent,title,'Whole MusicXML title is included without truncation');
 assert(!heading.classList.contains('score-hidden'),'Title is visible in score mode');
 assert.equal(options.drawTitle,false,'OSMD must not draw a duplicate, potentially cropped SVG title');
 assert.equal(options.stretchLastSystemLine,true,'The final system must fill the available page width');
 assert.match(d.querySelector('#sions-score-message').textContent,/4 takter/,'Show the actual number of measures in the imported score');
 assert(rendered>0,'MusicXML notation is rendered');
 d.querySelector('#sions-score-plus').click();
 assert.equal(d.querySelector('#sions-score-xml').style.width,'240px','Zoom keeps a single stable layout width');
 assert.equal(heading.textContent,title,'Zoom never changes or truncates heading');
 d.querySelector('#sions-score-fit').click();
 assert.equal(heading.textContent,title,'Fit view preserves heading');
 dom.window.close();
 process.stdout.write('PASS: Full MusicXML title and responsive score mode\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
