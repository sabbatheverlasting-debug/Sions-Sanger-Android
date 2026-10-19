/* Personal app colours. Song data, reading theme and TV colours are independent. */
(function(){'use strict';
var KEY='sions-app-colour-v1',root=document.documentElement;
var names=['--sions-bg','--sions-top','--sions-end','--sions-text','--sions-accent','--sions-border','--sions-soft','--sions-dark','--sions-dark-card','--sions-dark-raised'];
function valid(c){return typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c.toLowerCase():'';}
function rgb(c){return [1,3,5].map(function(i){return parseInt(c.slice(i,i+2),16);});}
function mix(c,t,f){var a=rgb(c),b=rgb(t);return '#'+a.map(function(n,i){return Math.round(n+(b[i]-n)*f).toString(16).padStart(2,'0');}).join('');}
function luminance(c){return rgb(c).map(function(n){n/=255;return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);}).reduce(function(a,n,i){return a+n*[.2126,.7152,.0722][i];},0);}
function contrast(a,b){var x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function palette(c){
 c=valid(c);if(!c)return null;
 var dark=contrast('#000000',c)>=contrast('#ffffff',c),target=dark?'#ffffff':'#000000';
 var text=dark?(contrast('#101820',c)>=4.5?'#101820':'#000000'):'#ffffff';
 var surfaces=[c,mix(c,target,.07),mix(c,target,.19)];
 function score(ink){return Math.min.apply(null,surfaces.map(function(bg){return contrast(ink,bg);}));}
 var gold=score('#f4d999')>=4.5?'#f4d999':score('#65400b')>=4.5?'#65400b':text;
 var values=[surfaces[0],surfaces[1],surfaces[2],text,gold,mix(c,text,.5),mix(c,'#ffffff',.9),mix(c,'#000000',.85),mix(c,'#000000',.75),mix(c,'#000000',.65)],out={};
 names.forEach(function(n,i){out[n]=values[i];});return out;
}
function apply(c){
 var p=palette(c);names.forEach(function(n){if(p)root.style.setProperty(n,p[n]);else root.style.removeProperty(n);});
 if(p)root.setAttribute('data-sions-colour','');else root.removeAttribute('data-sions-colour');
 var meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=p?p['--sions-bg']:'#102d49';
}
function saved(){try{return valid(localStorage.getItem(KEY));}catch(e){return '';}}
var current=saved();apply(current);
window.SionsAppearance={valid:valid,palette:palette,contrast:contrast,apply:apply};
function init(){
 var host=document.getElementById('moreScreen');if(!host||document.getElementById('sionsAppearance'))return;
 var css=document.createElement('style');css.textContent=`
 #sionsAppearance .colour-options{display:flex;flex-wrap:wrap;gap:10px;margin:15px 0}
 #sionsAppearance .colour-option{min-width:44px;min-height:44px;border:2px solid var(--border);border-radius:50%;background:var(--swatch);position:relative}
 #sionsAppearance .colour-option[aria-pressed=true]{outline:3px solid var(--ink);outline-offset:3px}
 #sionsAppearance .colour-option[aria-pressed=true]::after{content:'✓';color:var(--swatch-ink);font-weight:800;font-size:21px}
 #sionsAppColour{width:70px;height:44px;padding:3px;border:1px solid var(--border);border-radius:9px;background:var(--card)}
 html[data-sions-colour] .hero{background:linear-gradient(158deg,var(--sions-bg),var(--sions-top) 66%,var(--sions-end));color:var(--sions-text)}
 html[data-sions-colour] .hero::after{display:none}
 html[data-sions-colour] .hero .app-name,html[data-sions-colour] .hero-note strong{color:var(--sions-accent)}
 html[data-sions-colour] .hero .tagline,html[data-sions-colour] .hero-note{color:var(--sions-text)}
 html[data-sions-colour] .round-btn{color:var(--sions-text);border-color:var(--sions-border);background:transparent}
 html[data-sions-colour] .bottom-nav{background:var(--sions-bg);color:var(--sions-text)}
 html[data-sions-colour] .bottom-nav .nav-btn{color:var(--sions-text)}
 html[data-sions-colour] .bottom-nav .nav-btn.active{color:var(--sions-accent)}
 html[data-sions-colour] .bottom-nav .nav-btn.active::after{background:var(--sions-accent)}
 html[data-sions-colour] .primary,html[data-sions-colour] .toast{background:var(--sions-bg);color:var(--sions-text)}
 html[data-sions-colour] .song-head{background:linear-gradient(var(--sions-soft),var(--paper))}
 html[data-sions-colour] .song-head h2{color:var(--ink)}
 html[data-sions-colour][data-theme=dark]{--background:var(--sions-dark);--card:var(--sions-dark-card);--paper:var(--sions-dark-card)}
 html[data-sions-colour][data-theme=dark] .song-top{background:var(--sions-dark-card)}
 html[data-sions-colour][data-theme=dark] .song-head{background:linear-gradient(var(--sions-dark-raised),var(--sions-dark-card))}
 html[data-sions-colour][data-theme=dark] .num-box,html[data-sions-colour][data-theme=dark] .stanza.chorus,html[data-sions-colour][data-theme=dark] .import-info,
 html[data-sions-colour][data-theme=dark] .chip,html[data-sions-colour][data-theme=dark] .mode,html[data-sions-colour][data-theme=dark] .small-toolbar button,
 html[data-sions-colour][data-theme=dark] .song-back,html[data-sions-colour][data-theme=dark] .song-action,html[data-sions-colour][data-theme=dark] .stepper button,
 html[data-sions-colour][data-theme=dark] .secondary,html[data-sions-colour][data-theme=dark] .setting-row select{background:var(--sions-dark-raised)}
 html[data-sions-colour][data-theme=dark] .chip.active,html[data-sions-colour][data-theme=dark] .mode.active{background:var(--gold)}
 `;document.head.appendChild(css);
 var panel=document.createElement('section');panel.id='sionsAppearance';panel.className='panel';
 panel.innerHTML='<h3>Appens färg</h3><p>Välj färgen på de blå ytorna. Ljust, bokpapper och mörkt läsläge fungerar fortfarande. TV-bakgrunden väljer du separat.</p><div class="colour-options" role="group" aria-label="Färdiga appfärger"></div><div class="setting-row"><label for="sionsAppColour">Välj egen färg</label><input id="sionsAppColour" type="color" value="#102d49"></div><p id="sionsColourStatus" role="status" aria-live="polite"></p><button type="button" class="secondary" id="sionsResetColour">Återställ originalfärg</button>';
 var presets=[['#123553','Blå'],['#164b3c','Skogsgrön'],['#49345e','Lila'],['#682f42','Vinröd'],['#145963','Petrol'],['#e8d5a5','Sand'],['#f5f2ea','Elfenben'],['#111820','Kolgrå']];
 presets.forEach(function(pair){var b=document.createElement('button');b.type='button';b.className='colour-option';b.dataset.appColor=pair[0];b.style.setProperty('--swatch',pair[0]);b.style.setProperty('--swatch-ink',palette(pair[0])['--sions-text']);b.setAttribute('aria-label',pair[1]);b.title=pair[1];b.onclick=function(){choose(pair[0]);};panel.querySelector('.colour-options').appendChild(b);});
 host.insertBefore(panel,host.querySelector('.panel'));
 var input=panel.querySelector('#sionsAppColour'),status=panel.querySelector('#sionsColourStatus');
 function refresh(){input.value=current||'#102d49';panel.querySelectorAll('[data-app-color]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.appColor===current));});}
 function choose(c){current=valid(c);apply(current);var stored=true;try{if(current)localStorage.setItem(KEY,current);else localStorage.removeItem(KEY);}catch(e){stored=false;}refresh();status.textContent=stored?(current?'Färgen är sparad.':'Originalfärgen är återställd.'):'Färgen visas nu men kunde inte sparas.';}
 input.oninput=function(){choose(input.value);};input.onchange=function(){choose(input.value);};panel.querySelector('#sionsResetColour').onclick=function(){choose('');};refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
