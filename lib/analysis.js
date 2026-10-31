// Sade, açıklanabilir istatistik. Karmaşık model yok (aşırı öğrenmeyi önlemek için), her sinyal geriye dönük sınanır.
const DAY=864e5,d0=s=>Date.parse(s+'T00:00:00Z');
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
const sma=(p,k)=>p.length>=k?mean(p.slice(-k)):null;
function emaSeries(p,k){const a=2/(k+1),o=[];let e=null;for(let i=0;i<p.length;i++){if(i<k-1){o.push(null);continue;}if(i===k-1){e=mean(p.slice(0,k));o.push(e);continue;}e=p[i]*a+e*(1-a);o.push(e);}return o;}
function rsi(p,k=14){if(p.length<k+1)return null;let g=0,l=0;for(let i=p.length-k;i<p.length;i++){const d=p[i]-p[i-1];if(d>0)g+=d;else l-=d;}if(g+l===0)return 50;return 100-100/(1+(g/k)/((l/k)||1e-9));}
function macd(p){if(p.length<26)return null;const e12=emaSeries(p,12),e26=emaSeries(p,26),m=p.map((_,i)=>e26[i]!=null?e12[i]-e26[i]:null).filter(x=>x!=null);const s=m.length>=9?emaSeries(m,9).at(-1):null;return {macd:m.at(-1),signal:s};}
function trendWeekPct(series){const s=series.slice(-14);if(s.length<5)return null;const x=s.map(r=>(d0(r.day)-d0(s[0].day))/DAY),y=s.map(r=>r.price),mx=mean(x),my=mean(y);let c=0,v=0;for(let i=0;i<s.length;i++){c+=(x[i]-mx)*(y[i]-my);v+=(x[i]-mx)**2;}if(!v||!my)return null;return c/v/my*7*100;}
const rets=p=>p.slice(1).map((v,i)=>(v-p[i])/p[i]);
function pairFor(n){return n>=30?[7,21]:n>=14?[5,10]:n>=8?[3,7]:null;}
export function signal(series){
 const p=series.map(x=>x.price),n=p.length;if(n<8)return {dir:'none',score:0,parts:{}};const parts={};
 const t=trendWeekPct(series);if(t!=null)parts.trend=Math.abs(t)<0.4?0:Math.sign(t);
 const pr=pairFor(n);if(pr){const a=sma(p,pr[0]),b=sma(p,pr[1]),r=(a-b)/b*100;parts.sma=Math.abs(r)<0.2?0:Math.sign(r);}
 const r=rsi(p);if(r!=null)parts.rsi=r>58?1:r<42?-1:0;
 const m=macd(p);if(m&&m.signal!=null)parts.macd=Math.sign(m.macd-m.signal);
 const v=Object.values(parts),score=v.length?mean(v):0;
 return {dir:score>=0.34?'up':score<=-0.34?'down':'flat',score,parts};}
function priceAt(series,target){for(let i=series.length-1;i>=0;i--){const t=d0(series[i].day);if(t<=target){return target-t<=2*DAY?series[i].price:null;}}return null;}
export const actualDir=pct=>pct>=1?'up':pct<=-1?'down':'flat';
export function backtest(series,H=7){const tests=[];for(let i=9;i<series.length;i++){const s=signal(series.slice(0,i+1));if(s.dir==='none')continue;const fut=priceAt(series,d0(series[i].day)+H*DAY);if(fut==null||d0(series[i].day)+H*DAY>d0(series.at(-1).day))continue;tests.push({pred:s.dir,act:actualDir((fut-series[i].price)/series[i].price*100)});}
 const hits=tests.filter(t=>t.pred===t.act).length,flat=tests.filter(t=>t.act==='flat').length;return {tests:tests.length,hits,rate:tests.length?hits/tests.length:null,baseline:tests.length?flat/tests.length:null};}
export function quality(series){const n=series.length;if(!n)return {points:0,span:0,missing:0,outliers:[],level:'yetersiz'};let missing=0;const out=[];for(let i=1;i<series.length;i++){const gap=(d0(series[i].day)-d0(series[i-1].day))/DAY;if(gap>1)missing+=gap-1;const ch=(series[i].price-series[i-1].price)/series[i-1].price*100;if(Math.abs(ch)>20)out.push({day:series[i].day,pct:Math.round(ch*10)/10});}
 const span=Math.round((d0(series.at(-1).day)-d0(series[0].day))/DAY)+1;const level=n<10?'yetersiz':(n<21||missing/span>0.25)?'zayıf':n<45?'orta':'iyi';return {points:n,span,missing,outliers:out,level};}
export function confidenceLevel(n,bt,rec,flags){if(n<10)return 'Yetersiz';let c=1;
 if(n>=21&&bt.tests>=8&&bt.rate>=0.6&&bt.rate>=(bt.baseline??0)+0.1)c=2;
 if(c===2&&bt.tests>=20&&bt.rate>=0.7&&rec.scored>=10&&rec.hits/rec.scored>=0.65)c=3;
 if(flags.spike||flags.shock)c=Math.max(1,c-1);return ['','Düşük','Orta','Yüksek'][c];}
export function analyze(series){
 const p=series.map(x=>x.price),n=p.length,q=quality(series),sig=signal(series),bt=backtest(series),rt=rets(p);
 const tw=trendWeekPct(series),dsd=rt.length>=5?sd(rt)*100:null,spike=dsd!=null&&rt.length>=10&&Math.abs(rt.at(-1)*100)>Math.max(3*dsd,3);
 const last=p.at(-1),w=series.filter(x=>d0(x.day)>=d0(series.at(-1).day)-29*DAY).map(x=>x.price),sup=w.length?Math.min(...w):null,res=w.length?Math.max(...w):null;
 const pr=pairFor(n),a=pr?sma(p,pr[0]):null,b=pr?sma(p,pr[1]):null,mc=macd(p),exp=tw==null?null:Math.max(-15,Math.min(15,tw)),band=dsd==null?null:dsd*Math.sqrt(7);
 return {n,quality:q,direction:sig.dir,score:sig.score,parts:sig.parts,spike,
  indicators:{trendWeekPct:tw==null?null:Math.round(tw*10)/10,sma:pr?{short:pr[0],long:pr[1],a:Math.round(a*100)/100,b:Math.round(b*100)/100,up:a>b}:null,rsi:rsi(p)==null?null:Math.round(rsi(p)),macd:mc&&mc.signal!=null?{macd:Math.round(mc.macd*100)/100,signal:Math.round(mc.signal*100)/100}:null,support:sup,resistance:res,pos:sup!=null&&res>sup?Math.round((last-sup)/(res-sup)*100):null,dailyVolPct:dsd==null?null:Math.round(dsd*100)/100},
  expected:exp==null?null:{pct:Math.round(exp*10)/10,low:band==null?null:Math.round((exp-band)*10)/10,high:band==null?null:Math.round((exp+band)*10)/10},backtest:bt};}
