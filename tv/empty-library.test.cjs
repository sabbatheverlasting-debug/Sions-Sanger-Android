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
 const song={song_number:1,title:'Egen testsång',category:null,authors:[],sections:[{type:'verse',number:1,lines:['Min egen provrad.']}]};
 dom=await open([song]);w=dom.window;d=w.document;
 assert.equal(d.getElementById('allSongsCount').textContent,'1');assert(d.body.textContent.includes(song.title));
 assert.deepEqual(JSON.parse(w.localStorage.getItem('sions-sanger-imports-1')),[song],'An update keeps manual imports, including same-number songs');
 assert.equal(w.localStorage.getItem('sions-app-colour-v1'),'#49345e');
 assert.deepEqual(JSON.parse(w.localStorage.getItem('sions-sanger-favorites-1')),['nr:1']);
 d.getElementById('clearImports').click();assert.equal(d.getElementById('allSongsCount').textContent,'0','Clearing imports never restores bundled songs');
 dom.window.close();console.log('PASS: empty installation, no bundled lyrics, retained imports/favourites/colour, clearing imports stays empty');
})().catch(e=>{console.error(e);process.exit(1)});
