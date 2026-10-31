import {NextResponse} from 'next/server';import {requireOwner} from '@/lib/owner';import {adminSb} from '@/lib/admin';import {analyze,confidenceLevel,actualDir} from '@/lib/analysis';import {productContext} from '@/lib/marketnews';
export const maxDuration=60;
const iso=t=>new Date(t).toISOString().slice(0,10),today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
export async function POST(req){try{const b=await requireOwner(req);if(b.plan!=='all')throw new Error('Bu özellik All in one pakete dahildir.');
 const {watch_id}=await req.json();const {data:w}=await adminSb.from('watch_items').select('id,name,market_url').eq('id',watch_id).eq('business_id',b.id).maybeSingle();if(!w||!w.market_url)throw new Error('Ürün bulunamadı.');
 const day=today(),{data:cache}=await adminSb.from('market_analysis').select('day,result,created_at').eq('watch_id',w.id).maybeSingle();
 if(cache&&cache.day===day&&Date.now()-new Date(cache.created_at).getTime()<12*36e5)return NextResponse.json({...cache.result,cached:true});
 const {data:h}=await adminSb.from('market_price_history').select('day,price').eq('watch_id',w.id).order('day',{ascending:true}).limit(400);
 const series=(h||[]).map(x=>({day:x.day,price:+x.price}));
 // eski tahminleri puanla (7 gün geçenler)
 const {data:pend}=await adminSb.from('market_forecasts').select('*').eq('watch_id',w.id).eq('scored',false).lte('made_on',iso(Date.parse(day)-7*864e5));
 for(const f of pend||[]){const tgt=Date.parse(f.made_on)+7*864e5,row=[...series].reverse().find(r=>Date.parse(r.day)<=tgt&&tgt-Date.parse(r.day)<=2*864e5);if(!row)continue;const pct=(row.price-f.base_price)/f.base_price*100;await adminSb.from('market_forecasts').update({scored:true,actual_pct:Math.round(pct*10)/10,hit:f.direction===actualDir(pct)}).eq('id',f.id);}
 const {data:sc}=await adminSb.from('market_forecasts').select('hit').eq('watch_id',w.id).eq('scored',true).order('made_on',{ascending:false}).limit(60);
 const record={scored:(sc||[]).length,hits:(sc||[]).filter(x=>x.hit).length};
 const a=analyze(series),news=series.length>=1?await productContext(w.name):null;
 const confidence=confidenceLevel(a.n,a.backtest,record,{spike:a.spike,shock:news?.shock});
 const notes=[];
 if(a.n<10)notes.push('Henüz yeterli fiyat geçmişi yok (en az 10 gün gerekir). Tahmin üretilmedi, veri biriktikçe analiz açılır.');
 if(a.quality.missing>0)notes.push(`${a.quality.missing} gün eksik veri var, bu analizi zayıflatabilir.`);
 if(a.quality.outliers.length)notes.push('Veride %20’yi aşan ani sıçramalar var, bunlar hata olabilir: '+a.quality.outliers.slice(0,3).map(o=>o.day+' ('+o.pct+'%)').join(', ')+'.');
 if(a.spike)notes.push('Son günde olağan dışı büyük bir fiyat hareketi oldu, belirsizlik yüksek.');
 if(news?.shock)notes.push('Haberlerde ürünü ani etkileyebilecek bir gelişme var, tahminin güvenilirliği düşürüldü.');
 if(news&&a.direction!=='none'&&a.direction!=='flat'&&((a.direction==='up'&&news.pressure==='asagi')||(a.direction==='down'&&news.pressure==='yukari')))notes.push('Haberler fiyat eğilimiyle ters yönde, sonuç çelişkili.');
 if(a.backtest.tests>=8&&a.backtest.rate!=null&&a.backtest.rate<(a.backtest.baseline??0)+0.05)notes.push('Geçmiş denemede bu yöntem “fiyat değişmez” demekten daha iyi sonuç vermedi, tahmine dikkatli yaklaşın.');
 notes.push('Hacim (işlem miktarı) verisi market ürünlerinde bulunmuyor, bu yüzden hesaba katılmadı. Şirket bilançosu da bu tür ürünler için anlamlı değil.');
 const result={n:a.n,direction:a.n<10?'none':a.direction,confidence,horizon:7,expected:a.n<10?null:a.expected,indicators:a.indicators,quality:a.quality,backtest:a.backtest,record,news,notes,date:day};
 if(a.n>=10&&a.direction!=='none')await adminSb.from('market_forecasts').upsert({watch_id:w.id,made_on:day,direction:a.direction,expected_pct:a.expected?.pct??null,confidence,base_price:series.at(-1).price},{onConflict:'watch_id,made_on',ignoreDuplicates:true});
 await adminSb.from('market_analysis').upsert({watch_id:w.id,day,result,created_at:new Date().toISOString()});
 return NextResponse.json(result);}catch(e){return NextResponse.json({error:e.message},{status:400});}}
