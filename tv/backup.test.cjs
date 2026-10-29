const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function environment(initial){
 const map=new Map(Object.entries(initial||{}));
 const storage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 const context={localStorage:storage,document:{readyState:'loading',addEventListener(){}},setTimeout(){},console};
 context.window=context;
 vm.runInNewContext(fs.readFileSync('tv/backup.js','utf8'),context);
 return {ctx:context,map};
}
const I='sions-sanger-imports-1',F='sions-sanger-favorites-1',S='sions-sanger-settings-1';
const existing={song_number:1,title:'Original',authors:[],sections:[{type:'verse',lines:['Originaltext']}]};
const restored={song_number:2,title:'Återställd',authors:[],sections:[{type:'verse',lines:['En vers']}]};
const env=environment({[I]:JSON.stringify([existing]),[F]:JSON.stringify(['nr:1']),[S]:JSON.stringify({theme:'dark'})});
const backup={schema:1,webStorage:{
 [I]:JSON.stringify([Object.assign({},existing,{title:'Overwriting forbidden'}),restored]),
 [F]:JSON.stringify(['nr:2','nr:1']),
 [S]:JSON.stringify({theme:'light',size:30}),
 'sions-reader-mode-v1':'sing'
}};
assert.equal(env.ctx.sionsBackupMerge(JSON.stringify(backup)),'OK');
const songs=JSON.parse(env.map.get(I));
assert.equal(songs.length,2);assert.equal(songs.find(s=>s.song_number===1).title,'Original');
assert.equal(songs.find(s=>s.song_number===2).title,'Återställd');
assert.equal(JSON.parse(env.map.get(S)).theme,'dark');
assert.equal(JSON.parse(env.map.get(S)).size,30);
assert.equal(JSON.parse(env.map.get(F)).length,2);
assert.equal(env.map.get('sions-reader-mode-v1'),'sing');
const previous=env.map.get(I);
assert.match(env.ctx.sionsBackupMerge(JSON.stringify({schema:1,webStorage:{'unexpected-key':'bad'}})),/^ERROR:/);
assert.equal(env.map.get(I),previous);
assert.match(env.ctx.sionsBackupMerge(JSON.stringify({schema:1,webStorage:{[I]:JSON.stringify([{broken:true}])}})),/^ERROR:/);
assert.equal(env.map.get(I),previous);
console.log('PASS: complete backup web restore merges safely and rejects malformed data');
