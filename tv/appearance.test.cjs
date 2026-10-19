const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const html=fs.readFileSync(process.argv[2]||'android-source/app/src/main/assets/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),script=fs.readFileSync(path.join(__dirname,'appearance.js'),'utf8');
async function start(colour,theme='light'){
 const dom=new JSDOM(html,{url:'https://sions.test',runScripts:'outside-only'}),w=dom.window;
 w.document.documentElement.dataset.theme=theme;
 w.localStorage.setItem('sions-settings-v1',JSON.stringify({theme,size:27,leading:1.85}));
 w.localStorage.setItem('tv-theme-test','forest');
 if(colour)w.localStorage.setItem('sions-app-colour-v1',colour);
 w.eval(script);await new Promise(r=>setTimeout(r,20));return dom;
}
(async()=>{
 let dom=await start(),w=dom.window,d=w.document,a=w.SionsAppearance;
 for(let r=0;r<=255;r+=17)for(let g=0;g<=255;g+=17)for(let b=0;b<=255;b+=17){
  const p=a.palette('#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join(''));
  for(const bg of ['--sions-bg','--sions-top','--sions-end']){
   assert(a.contrast(p['--sions-text'],p[bg])>=4.5);
   assert(a.contrast(p['--sions-accent'],p[bg])>=4.5);
  }
  for(const bg of ['--sions-dark','--sions-dark-card','--sions-dark-raised'])assert(a.contrast('#f6efe1',p[bg])>=4.5);
 }
 assert.equal(a.palette('url(https://invalid.test)'),null);
 assert.equal(d.querySelectorAll('[data-app-color]').length,8);
 d.querySelector('[data-app-color="#49345e"]').click();
 assert.equal(d.documentElement.style.getPropertyValue('--sions-bg'),'#49345e');
 assert.equal(d.querySelector('[data-app-color="#49345e"]').getAttribute('aria-pressed'),'true');
 const input=d.getElementById('sionsAppColour');input.value='#ffeedd';input.dispatchEvent(new w.Event('input'));
 assert.equal(w.localStorage.getItem('sions-app-colour-v1'),'#ffeedd');
 assert.equal(d.documentElement.dataset.theme,'light');assert.equal(w.localStorage.getItem('tv-theme-test'),'forest');
 assert.equal(JSON.parse(w.localStorage.getItem('sions-settings-v1')).size,27);
 const saved=w.localStorage.getItem('sions-app-colour-v1');dom.window.close();
 dom=await start(saved,'dark');w=dom.window;d=w.document;
 assert.equal(d.getElementById('sionsAppColour').value,'#ffeedd');assert.equal(d.documentElement.dataset.theme,'dark');
 d.getElementById('sionsResetColour').click();assert(!d.documentElement.hasAttribute('data-sions-colour'));
 assert.equal(d.documentElement.style.getPropertyValue('--sions-bg'),'');assert.equal(w.localStorage.getItem('sions-app-colour-v1'),null);
 dom.window.close();console.log('PASS: colour contrast, presets, custom colour, persistence, reset, independent reading/TV settings');
 if(process.env.SIONS_PREVIEW_DIR&&process.env.CHROME_PATH){
  const cp=require('child_process'),out=process.env.SIONS_PREVIEW_DIR;fs.mkdirSync(out,{recursive:true});
  for(const [name,colour,theme,more] of [['green-library','#164b3c','light',false],['sand-library','#e8d5a5','light',false],['purple-settings','#49345e','light',true],['green-dark','#164b3c','dark',true]]){
   dom=await start(colour,theme);d=dom.window.document;
   if(more){d.querySelectorAll('.screen').forEach(n=>n.classList.remove('active'));d.getElementById('moreScreen').classList.add('active');d.querySelectorAll('.nav-btn').forEach(n=>n.classList.toggle('active',n.dataset.screen==='moreScreen'));}
   const h=path.join(out,name+'.html');fs.writeFileSync(h,d.documentElement.outerHTML);
   cp.execFileSync(process.env.CHROME_PATH,['--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files','--force-device-scale-factor=1','--window-size=390,1000','--screenshot='+path.join(out,name+'.png'),'file://'+h],{stdio:'ignore'});dom.window.close();
  }
 }
})().catch(e=>{console.error(e);process.exit(1)});
