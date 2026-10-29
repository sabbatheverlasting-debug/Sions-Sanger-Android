/* Sions Sånger: offline complete library backup and safe additive restore. */
(function(){
'use strict';
const STORE={imports:'sions-sanger-imports-1',favs:'sions-sanger-favorites-1',settings:'sions-sanger-settings-1',mode:'sions-reader-mode-v1',colour:'sions-app-colour-v1'};
function get(k){try{return localStorage.getItem(k);}catch(_){return null;}}
function snapshot(){
 const webStorage={};
 Object.values(STORE).forEach(k=>{const value=get(k);if(value!==null)webStorage[k]=value;});
 return JSON.stringify({schema:1,webStorage:webStorage});
}
function array(s){try{const v=JSON.parse(s);return Array.isArray(v)?v:[];}catch(_){return [];}}
function key(s){return s&&s.song_number!=null?'nr:'+String(s.song_number):'titel:'+String(s&&s.title||'');}
function songOK(s){return s&&typeof s==='object'&&!Array.isArray(s)&&typeof s.title==='string'&&Array.isArray(s.authors)&&Array.isArray(s.sections)&&
 (s.song_number===null||(Number.isSafeInteger(s.song_number)&&s.song_number>0))&&s.sections.every(t=>t&&Array.isArray(t.lines));}
window.sionsBackupMerge=function(input){
 try{
  const payload=JSON.parse(input),data=payload.webStorage;
  if(payload.schema!==1||!data||typeof data!=='object'||Array.isArray(data))return 'ERROR:invalid web data';
  const allowed=Object.values(STORE);
  if(Object.keys(data).some(k=>!allowed.includes(k)||typeof data[k]!=='string'))return 'ERROR:invalid key';
  const newValues={};
  if(Object.prototype.hasOwnProperty.call(data,STORE.imports)){
   const existing=array(get(STORE.imports)),incoming=array(data[STORE.imports]);
   if(!incoming.every(songOK))return 'ERROR:invalid song';
   const result=new Map(existing.filter(songOK).map(s=>[key(s),s]));
   incoming.forEach(s=>{if(!result.has(key(s)))result.set(key(s),s);});
   newValues[STORE.imports]=JSON.stringify(Array.from(result.values()));
  }
  if(Object.prototype.hasOwnProperty.call(data,STORE.favs)){
   const favs=array(data[STORE.favs]);
   if(!favs.every(v=>typeof v==='string'))return 'ERROR:invalid favorites';
   newValues[STORE.favs]=JSON.stringify(Array.from(new Set([...array(get(STORE.favs)),...favs])));
  }
  if(Object.prototype.hasOwnProperty.call(data,STORE.settings)){
   const restored=JSON.parse(data[STORE.settings]);
   if(!restored||typeof restored!=='object'||Array.isArray(restored))return 'ERROR:invalid settings';
   let current={};try{current=JSON.parse(get(STORE.settings)||'{}');}catch(_){}
   newValues[STORE.settings]=JSON.stringify(Object.assign({},restored,current));
  }
  [STORE.mode,STORE.colour].forEach(k=>{if(get(k)===null&&Object.prototype.hasOwnProperty.call(data,k))newValues[k]=data[k];});
  const old={};Object.keys(newValues).forEach(k=>old[k]=get(k));
  try{Object.keys(newValues).forEach(k=>localStorage.setItem(k,newValues[k]));}
  catch(e){Object.keys(old).forEach(k=>{try{old[k]===null?localStorage.removeItem(k):localStorage.setItem(k,old[k]);}catch(_){}});return 'ERROR:storage full';}
  setTimeout(()=>location.reload(),700);
  return 'OK';
 }catch(e){return 'ERROR:'+String(e&&e.message||e).slice(0,100);}
};
function init(){
 const root=document.getElementById('moreScreen');
 if(!root||document.getElementById('sions-backup'))return;
 const panel=document.createElement('div');panel.id='sions-backup';panel.className='panel';
 const heading=document.createElement('h3');heading.textContent='Säkerhetskopia – allt i en ZIP';
 const detail=document.createElement('p');detail.textContent='Spara och återställ sångtexter, favoriter, inställningar, musik (även Opus), versstarter och noter tillsammans. Filerna stannar hos dig.';
 const save=document.createElement('button');save.type='button';save.className='primary';save.textContent='Spara allt som ZIP';
 const restore=document.createElement('button');restore.type='button';restore.className='secondary';restore.textContent='Återställ från ZIP';
 restore.style.marginLeft='8px';restore.style.marginTop='6px';
 const status=document.createElement('p');status.id='sions-backup-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 save.onclick=function(){
  const native=window.SionsAndroid;
  if(native&&typeof native.backupExport==='function')native.backupExport(snapshot());
  else status.textContent='Installera Android-versionen med fullständig säkerhetskopiering.';
 };
 restore.onclick=function(){
  const native=window.SionsAndroid;
  if(native&&typeof native.backupImport==='function'){
   if(confirm('Återställning lägger till sånger och media utan att ta bort befintliga uppgifter. Fortsätta?'))native.backupImport();
  } else status.textContent='Installera Android-versionen med ZIP-återställning.';
 };
 [heading,detail,save,restore,status].forEach(node=>panel.appendChild(node));
 const anchor=root.querySelector('#clearImports');const before=anchor&&anchor.closest('.panel');
 if(before)root.insertBefore(panel,before);else root.appendChild(panel);
}
window.sionsBackupStatus=function(message){
 const status=document.getElementById('sions-backup-status');if(status)status.textContent=String(message);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
