/* Cache-backed JS adapter for WKWebView's asynchronous native message channel. */
(function(){
 'use strict';
 var cache={catalog:{},cues:{},status:{ready:false,position:0,duration:0},address:''};
 function send(method,args){window.webkit.messageHandlers.sions.postMessage({method:method,args:args||[]});}
 window.SionsIOSReceive=function(next){cache=next;};
 window.SionsIOS={send:send};
 var bridge={
  audioList:function(){return JSON.stringify(cache.catalog);},
  audioStatus:function(){return JSON.stringify(cache.status);},
  audioCues:function(n){return JSON.stringify(cache.cues[n]||{});},
  tvAddress:function(){return cache.address||'';},tvCode:function(){return '';}
 };
 ['audioImport','audioImportFor','audioPlay','audioPause','audioSeek','audioAssign','audioCue','audioClearCues','audioTargetTv',
  'tvUpdate','tvCopy','tvKeepAwake','tvFullscreen','tvStop','tvConnect','saveJson'].forEach(function(name){
   bridge[name]=function(){send(name,Array.from(arguments));};
 });
 window.SionsAndroid=bridge;
 document.addEventListener('DOMContentLoaded',function(){
  document.getElementById('importBtn').onclick=function(){send('importJSON');};
  send('ready');
 });
})();
