// GÜNDÜZ / GECE TEMASI — sitenin her sayfasında (ana sayfa, giriş, panel, admin) çalışan tek betik.
// Site koyu tasarlandı. Açık tema için ayrı bir CSS yazmak yerine, betik sayfadaki CSS kurallarını okuyup
// renkleri açık karşılıklarına çevirir ve html[data-tema="acik"] altında yeni bir stil olarak ekler.
// Böylece ileride CSS'e eklenen her şey açık temada da kendiliğinden çalışır.
// Seçim tarayıcıda saklanır (localStorage 'tema'). Varsayılan: koyu.
function temaBetigi(){
 var D=document,R=D.documentElement,A='html[data-tema="acik"]',uretildi=false,zam=0;
 var t=null;try{t=localStorage.getItem('tema')}catch(e){}
 if(t==='acik')R.setAttribute('data-tema','acik');
 var acik=function(){return R.getAttribute('data-tema')==='acik'};
 var taban=D.createElement('style');taban.id='tema-taban';
 taban.textContent=A+'{color-scheme:light}'+A+','+A+' body{background-color:#f5f5f7;color:#141418}'+
  '#temaBtn{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9000;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:#111113;color:#fff;font-size:19px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0;margin:0;box-shadow:0 6px 18px rgba(0,0,0,.35);transition:transform .2s}'+
  '#temaBtn:hover{transform:scale(1.08);background:#111113;box-shadow:0 6px 18px rgba(0,0,0,.35)}#temaBtn::after,#temaBtn::before{display:none!important}'+
  A+' #temaBtn,'+A+' #temaBtn:hover{background:#fff;color:#141418;border-color:rgba(0,0,0,.14);box-shadow:0 6px 18px rgba(0,0,0,.12)}'+
  'html:has([data-tema-btn]) #temaBtn{display:none}'+A+' .tema-koyu-yazi{color:#141418!important;-webkit-text-fill-color:currentColor}';
 (D.head||R).appendChild(taban);

 // --- renk çevirme ---
 function hsl(r,g,b){r/=255;g/=255;b/=255;var M=Math.max(r,g,b),m=Math.min(r,g,b),l=(M+m)/2,h=0,s=0;
  if(M!==m){var d=M-m;s=l>.5?d/(2-M-m):d/(M+m);h=M===r?(g-b)/d+(g<b?6:0):M===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];}
 function rgb(h,s,l){if(!s){var v=l*255;return [v,v,v];}
  var f=function(p,q,x){if(x<0)x+=1;if(x>1)x-=1;if(x<1/6)return p+(q-p)*6*x;if(x<1/2)return q;if(x<2/3)return p+(q-p)*(2/3-x)*6;return p;};
  var q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return [f(p,q,h+1/3)*255,f(p,q,h)*255,f(p,q,h-1/3)*255];}
 function yaz(c,a){c=c.map(function(x){return Math.round(Math.max(0,Math.min(255,x)))});return a<1?'rgba('+c[0]+','+c[1]+','+c[2]+','+(+a.toFixed(3))+')':'rgb('+c[0]+','+c[1]+','+c[2]+')';}
 function coz(s){var m;if(s[0]==='#'){var h=s.slice(1);if(h.length<6)h=h.split('').map(function(x){return x+x}).join('');
   return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),h.length>=8?parseInt(h.slice(6,8),16)/255:1];}
  m=s.replace(/^rgba?\(|\)$/g,'').split(/[\s,\/]+/).filter(Boolean);if(m.length<3)return null;
  var a=m[3]===undefined?1:(/%$/.test(m[3])?parseFloat(m[3])/100:parseFloat(m[3]));return [+m[0],+m[1],+m[2],a];}
 // bir rengi açık temadaki karşılığına çevir (null = olduğu gibi kalsın)
 function cevir(s,ozellik,golge){var c=coz(s);if(!c||c.some(isNaN))return null;var x=hsl(c[0],c[1],c[2]),gri=x[1]<.2||x[2]<.13||x[2]>.92,a=c[3];
  if(a<=0)return null;
  if(a<1){if(x[2]<.5)return golge?yaz([0,0,0],a*.3):yaz([250,250,252],Math.min(1,a+.15)); // koyu yarı saydam: gölgede hafif gölge, zeminde açık buzlu cam
   if(gri)return yaz([20,20,28],Math.min(1,a*1.05));    // beyaz çizgi/yüzey → siyah çizgi/yüzey
   if(golge)return yaz(rgb(x[0],x[1],Math.min(x[2],.55)),a*.45); // kırmızı neon parıltı → hafif
   if(x[2]>.7)return yaz(rgb(x[0],x[1],.42),a);return null;}
  if(gri){var l=1-x[2];l=l<.5?Math.max(.08,l*.92):Math.min(.99,l+.02);return yaz(rgb(x[0],Math.min(x[1],.12),l),1);}
  if(x[2]>.62)return yaz(rgb(x[0],x[1],.44),1);          // açık kırmızı yazılar → okunur koyu kırmızı
  if(x[2]<.3)return yaz(rgb(x[0],x[1],1-x[2]),1);       // çok koyu renkli zemin → açık tonu
  return null;}
 var RENK=/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
 var KIRMIZI_ZEMIN=/var\(--(red|grad|bad|c1|a|cobalt|coral|mag|ind)\b|rgb\(255, ?31, ?61\)|#ff1f3d|#ff3a55|rgb\(255, ?58, ?85\)/i;
 // zemin dolu renkli mi (kırmızı, yeşil WhatsApp vb.): üstündeki beyaz yazı beyaz kalmalı
 function doluZemin(bg){if(KIRMIZI_ZEMIN.test(bg))return true;var r=bg.match(RENK)||[];for(var i=0;i<r.length;i++){var c=coz(r[i]);if(c&&c[3]>.6){var x=hsl(c[0],c[1],c[2]);if(x[1]>.3&&x[2]>.25&&x[2]<.75)return true;}}return false;}
 function acikZemin(bg){var r=bg.match(RENK)||[];for(var i=0;i<r.length;i++){var c=coz(r[i]);if(c&&c[3]>.85&&hsl(c[0],c[1],c[2])[2]>.8)return true;}return /\b(white)\b/.test(bg);}
 function deger(v,ozellik,kirmiziZemin){if(/url\(/i.test(v))return v;
  if(ozellik==='color-scheme')return v.replace(/\bdark\b/,'light');
  if(ozellik==='color'&&kirmiziZemin)return v;                  // kırmızı buton üstündeki beyaz yazı beyaz kalsın
  var golge=/shadow$/.test(ozellik)||(/^--/.test(ozellik)&&/\dpx/.test(v)&&!/gradient/.test(v));
  if(golge){var renkler=v.match(RENK)||[],beyaz=renkler.length>0;renkler.forEach(function(r){var c=coz(r);if(c){var x=hsl(c[0],c[1],c[2]);if(!(x[1]<.2&&x[2]>.6))beyaz=false;}});
   if(beyaz)return 'none';}                                     // beyaz parıltı açık zeminde bulanık leke yapar → kaldır
  return v.replace(RENK,function(r){var y=cevir(r,ozellik,golge);return y||r;});}
 var ILGILI=/^(color|background-color|background-image|border(-(top|right|bottom|left))?-color|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|color-scheme|accent-color|text-decoration-color|-webkit-text-fill-color|-webkit-text-stroke-color|--.+)$/;
 function secici(s){var p=[],d=0,b='';for(var i=0;i<s.length;i++){var ch=s[i];if(ch==='('||ch==='[')d++;if(ch===')'||ch===']')d--;if(ch===','&&!d){p.push(b);b='';}else b+=ch;}p.push(b);
  return p.map(function(x){x=x.trim();if(/^:root/.test(x))return A+x.slice(5);if(/^html(?![\w-])/.test(x))return A+x.slice(4);return A+' '+x;}).join(',');}
 var KISA=['background','border','border-top','border-right','border-bottom','border-left','outline'];
 function kural(r){var st=r.style,cikti='',bg=(st.getPropertyValue('background')+' '+st.getPropertyValue('background-color')+' '+st.getPropertyValue('background-image')),kz=doluZemin(bg),atla={};
  // var() içeren kısa yazımlar (background:var(--red) gibi) tarayıcıda alt özelliklere bölünmez: olduğu gibi taşı
  KISA.forEach(function(k){var v=st.getPropertyValue(k);if(v&&/var\(/.test(v)){cikti+=k+':'+deger(v.trim(),k,kz)+(st.getPropertyPriority(k)?' !important':'')+';';atla[k]=1;}});
  for(var i=0;i<st.length;i++){var o=st[i];if(!ILGILI.test(o))continue;if(atla[o.replace(/-(color|image|width|style)$/,'')]||atla[o.split('-')[0]])continue;var v=st.getPropertyValue(o);if(!v)continue;
   cikti+=o+':'+deger(v.trim(),o,kz)+(st.getPropertyPriority(o)?' !important':'')+';';}
  return cikti?secici(r.selectorText)+'{'+cikti+'}':'';}
 function kurallar(liste){var c='';for(var i=0;i<liste.length;i++){var r=liste[i];try{
   if(r.type===1&&r.selectorText)c+=kural(r);
   else if(r.type===4){var ic=kurallar(r.cssRules);if(ic)c+='@media '+r.conditionText+'{'+ic+'}';}
   else if(r.type===12){var ic2=kurallar(r.cssRules);if(ic2)c+='@supports '+r.conditionText+'{'+ic2+'}';}}catch(e){}}return c;}
 function uret(){var c='';for(var i=0;i<D.styleSheets.length;i++){var s=D.styleSheets[i],n=s.ownerNode;if(n&&(n.id==='tema-taban'||n.id==='tema-uret'))continue;
   try{c+=kurallar(s.cssRules);}catch(e){}}
  var el=D.getElementById('tema-uret');if(!el){el=D.createElement('style');el.id='tema-uret';}
  el.textContent=c+A+' input[type=date],'+A+' input[type=time]{color-scheme:light}';
  if(el.parentNode!==D.head)D.head.appendChild(el);uretildi=true;}
 // --- satır içi (style="...") renkler: CSS kuralı olmadığı için doğrudan öğenin üstünde çevrilir, koyu temaya dönünce geri alınır ---
 var SATIR_OZ=/^(color|background-color|background-image|border(-(top|right|bottom|left))?-color|outline-color|box-shadow|text-shadow|fill|stroke|-webkit-text-stroke-color)$/;
 function satir(el){var at=el.getAttribute&&el.getAttribute('style');if(!at||el.__tm===at)return;var st=el.style;
  var bg=st.getPropertyValue('background-color')+' '+st.getPropertyValue('background-image')+' '+st.getPropertyValue('background');
  if(acikZemin(bg)){el.__tm=at;return;}                          // beyaz kutu (QR, Google butonu): açık temada da olduğu gibi kalsın
  var kz=doluZemin(bg),o=el.__tmo||{},m=el.__tmm||{};
  for(var i=0;i<st.length;i++){var p=st[i];if(!SATIR_OZ.test(p))continue;var v=st.getPropertyValue(p);if(!v||v===m[p])continue;var y=deger(v,p,kz);
   if(y!==v){o[p]=v;m[p]=y;st.setProperty(p,y,st.getPropertyPriority(p));}}
  el.__tmo=o;el.__tmm=m;el.__tm=el.getAttribute('style');}
 function satirlar(kok){if(!acik()||!kok)return;if(kok.nodeType===1&&kok.hasAttribute('style'))satir(kok);if(kok.querySelectorAll){var l=kok.querySelectorAll('[style]');for(var i=0;i<l.length;i++)satir(l[i]);}}
 function satirGeri(){var l=D.querySelectorAll('[style]');for(var i=0;i<l.length;i++){var el=l[i],o=el.__tmo,m=el.__tmm;if(!o)continue;
   for(var p in o){if(el.style.getPropertyValue(p)===m[p])el.style.setProperty(p,o[p]);}el.__tmo=null;el.__tmm=null;el.__tm=null;}}
 // --- son kontrol: tıklanabilir öğede yazı açık, arkası da açık kaldıysa (örn. kırmızı butonun "boş" çeşidi) yazıyı koyulaştır ---
 var TIK='a,button,[role=button],summary,.btn,.tag,.chip,.pill';
 function renkDiz(v){var c=coz(v||'');return c&&!c.some(isNaN)?c:null;}
 function arka(el){var y=[];for(var x=el;x&&x.nodeType===1;x=x.parentElement){var cs=getComputedStyle(x),c=renkDiz(cs.backgroundColor);
   if(cs.backgroundImage&&cs.backgroundImage!=='none'){var g=(cs.backgroundImage.match(RENK)||[])[0],gc=g&&renkDiz(g);if(gc&&gc[3]>.5){y.push(gc);break;}}
   if(c&&c[3]>0){y.push(c);if(c[3]>=.95)break;}}
  var r=[245,245,247];for(var i=y.length-1;i>=0;i--){var a=y[i][3];r=[0,1,2].map(function(k){return r[k]*(1-a)+y[i][k]*a});}return r;}
 function parlak(c){return (c[0]*299+c[1]*587+c[2]*114)/1000;}
 function denetle(kok){if(!acik()||!kok||!kok.querySelectorAll)return;var l=kok.matches&&kok.matches(TIK)?[kok]:[];l=l.concat([].slice.call(kok.querySelectorAll(TIK)));
  for(var i=0;i<l.length;i++){var el=l[i];if(el.classList.contains('tema-koyu-yazi'))continue;var c=renkDiz(getComputedStyle(el).color);if(!c||c[3]<.5||parlak(c)<200)continue;
   if(parlak(arka(el))>185)el.classList.add('tema-koyu-yazi');}}
 var bekleyen=[],yeni=[],cerceve=0;
 function izle(){try{new MutationObserver(function(l){if(!acik())return;for(var i=0;i<l.length;i++){var x=l[i];if(x.type==='attributes')bekleyen.push(x.target);else for(var j=0;j<x.addedNodes.length;j++){bekleyen.push(x.addedNodes[j]);yeni.push(x.addedNodes[j]);}if(bekleyen.length>400)bekleyen=[D.body];if(yeni.length>60)yeni=[D.body];}
   if(!cerceve)cerceve=requestAnimationFrame(function(){cerceve=0;var b=bekleyen,yn=yeni;bekleyen=[];yeni=[];for(var k=0;k<b.length;k++)satirlar(b[k]);for(var n=0;n<yn.length&&n<60;n++)if(yn[n].nodeType===1&&yn[n].isConnected)denetle(yn[n]);});
  }).observe(D.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});}catch(e){}}
 function yenile(){if(!acik())return;clearTimeout(zam);zam=setTimeout(uret,120);}
 function renk(){var m=D.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',acik()?'#f5f5f7':'#050505');}
 function buton(){var b=D.getElementById('temaBtn');if(!b&&D.body){b=D.createElement('button');b.id='temaBtn';b.type='button';b.onclick=function(){window.temaDegis();};D.body.appendChild(b);}
  if(b){b.textContent=acik()?'🌙':'☀️';b.title=acik()?'Koyu temaya geç':'Açık temaya geç';b.setAttribute('aria-label',b.title);}}
 window.temaAcik=acik;
 window.temaDegis=function(){var y=!acik();if(y){if(!uretildi)uret();R.setAttribute('data-tema','acik');satirlar(D.body);setTimeout(function(){denetle(D.body)},60);}else{R.removeAttribute('data-tema');satirGeri();}
  try{localStorage.setItem('tema',y?'acik':'koyu')}catch(e){}renk();buton();try{window.dispatchEvent(new Event('tema'))}catch(e){}};
 if(acik())uret();
 var hazir=function(){if(acik()){uret();satirlar(D.body);setTimeout(function(){denetle(D.body)},60);}renk();buton();izle();
  try{new MutationObserver(function(l){for(var i=0;i<l.length;i++)for(var j=0;j<l[i].addedNodes.length;j++){var n=l[i].addedNodes[j];
    if(n.tagName==='STYLE'&&n.id!=='tema-uret'&&n.id!=='tema-taban'||n.tagName==='LINK'){if(n.tagName==='LINK')n.addEventListener('load',yenile);yenile();}}}).observe(D.head,{childList:true});}catch(e){}};
 if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',hazir);else hazir();
 window.addEventListener('load',function(){yenile();setTimeout(function(){denetle(D.body)},300);});}
export const TEMA_JS='('+temaBetigi.toString()+')();';
export const TEMA_ETIKET='<script>'+TEMA_JS+'</script>';
