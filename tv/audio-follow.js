/* Deterministic, local verse-following helper.
   Accurate when all verse start cues are calibrated. Uncalibrated timings
   are approximate and must be identified as such by the UI. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SionsAudioFollow=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 function calculate(cues,count,duration){
  count=Math.max(0,Math.min(200,Math.floor(Number(count)||0)));
  duration=Number(duration);
  if(!count||!Number.isFinite(duration)||duration<=0)return {times:[],mode:'unavailable',exact:0};
  const saved=new Map();
  if(cues&&typeof cues==='object')Object.keys(cues).forEach(function(k){
   const i=Number(k),sec=Number(cues[k]);
   if(Number.isInteger(i)&&i>=0&&i<count&&Number.isFinite(sec)&&sec>=0&&sec<=duration)
     saved.set(i,sec);
  });
  const anchors=[[0,0],...Array.from(saved.entries()),[count,duration]];
  const ordered=Array.from(new Map(anchors).entries()).sort((a,b)=>a[0]-b[0]);
  // Inconsistent/misordered manually recorded start times must not cause the
  // TV to jump backwards. Fall back to proportional estimates instead.
  let valid=true;
  for(let j=1;j<ordered.length;j++)if(ordered[j][1]<ordered[j-1][1])valid=false;
  const times=Array.from({length:count},(_,i)=>{
   if(valid&&saved.has(i))return saved.get(i);
   if(valid){
    for(let p=1;p<ordered.length;p++){
     const [r,tr]=ordered[p],[l,tl]=ordered[p-1];
     if(i>=l&&i<r)return tl+(tr-tl)*(i-l)/(r-l);
    }
   }
   return duration*i/count;
  });
  // Correctly calibrated if there is a precise start marker for each verse,
  // including verse 1. If any are missing, warn that timings are estimated.
  const exact=valid?saved.size:0;
  return {times,mode:valid&&exact===count?'calibrated':'estimated',exact};
 }
 function verseAt(times,position){
  if(!Array.isArray(times)||!times.length)return -1;
  position=Number(position);
  if(!Number.isFinite(position)||position<0)return -1;
  let selected=0;
  for(let i=0;i<times.length;i++)if(position+0.10>=times[i])selected=i;
  return selected;
 }
 return {calculate,verseAt};
});