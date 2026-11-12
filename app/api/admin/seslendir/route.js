// Admin: reklam seslendirmesi. Gemini'nin doğal Türkçe sesiyle tek bir cümleyi okur, WAV (base64) döner.
import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';
export const dynamic='force-dynamic';export const maxDuration=60;
const MODELLER=['gemini-2.5-flash-preview-tts','gemini-2.5-flash-tts','gemini-2.5-pro-preview-tts','gemini-2.5-pro-tts'];
function wav(pcm,hz=24000){const h=Buffer.alloc(44);h.write('RIFF',0);h.writeUInt32LE(36+pcm.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);
 h.writeUInt32LE(hz,24);h.writeUInt32LE(hz*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
export async function POST(req){try{await requireAdmin(req);const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY tanımlı değil');
 const x=await req.json();const {ses='Charon',stil}=x;
 // Diyalog modu: en fazla 2 konuşmacı tek istekte (kota tasarrufu). diyalog:[{k,m}], kisiler:{ad:{ses,stil}}
 let speechConfig,icerik;
 if(Array.isArray(x.diyalog)&&x.diyalog.length){const d=x.diyalog.slice(0,8).map(l=>({k:String(l.k).replace(/[^\p{L}\p{N} ]/gu,'').slice(0,20)||'Kisi',m:String(l.m).slice(0,400)}));
  const ad=[...new Set(d.map(l=>l.k))];if(ad.length>2)throw new Error('Bir istekte en fazla 2 konuşmacı olabilir');const K=x.kisiler||{};
  icerik=ad.map(a=>`${a}: ${String(K[a]?.stil||'doğal Türkçe').slice(0,200)}`).join('\n')+'\n\nAşağıdaki konuşmayı bu karakterlere uygun tonlamayla, satırlar arasında kısa doğal duraklarla seslendir:\n'+d.map(l=>`${l.k}: ${l.m}`).join('\n');
  speechConfig=ad.length===2?{multiSpeakerVoiceConfig:{speakerVoiceConfigs:ad.map(a=>({speaker:a,voiceConfig:{prebuiltVoiceConfig:{voiceName:String(K[a]?.ses||'Kore').slice(0,30)}}}))}}
   :{voiceConfig:{prebuiltVoiceConfig:{voiceName:String(K[ad[0]]?.ses||ses).slice(0,30)}}};}
 else{const m=String(x.metin||'').trim().slice(0,600);if(!m)throw new Error('Metin boş');
  const yon=String(stil||'Sıcak, samimi, kendinden emin bir Türk reklam spikeri gibi; doğal tonlamayla, acele etmeden ama enerjik oku').slice(0,300);
  icerik=`${yon}: ${m}`;speechConfig={voiceConfig:{prebuiltVoiceConfig:{voiceName:String(ses).slice(0,30)}}};}
 let son='';
 for(const model of MODELLER){try{
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(45000),
   body:JSON.stringify({contents:[{parts:[{text:icerik}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig}})});
  const j=await r.json();if(!r.ok){son=model+': '+(j.error?.message||r.status);if(r.status===429)son='Günlük ücretsiz seslendirme kotası doldu (Türkiye saatiyle ~10:00-11:00 arası sıfırlanır). '+son.slice(0,120);continue;}
  const p=j.candidates?.[0]?.content?.parts?.find(x=>x.inlineData?.data);if(!p){son=model+': ses dönmedi';continue;}
  const hz=+(String(p.inlineData.mimeType||'').match(/rate=(\d+)/)?.[1]||24000);
  return NextResponse.json({ok:true,model,wav:wav(Buffer.from(p.inlineData.data,'base64'),hz).toString('base64')});}
  catch(e){son=model+': '+String(e.message).slice(0,100);}}
 throw new Error('Seslendirilemedi. '+son);}catch(e){return NextResponse.json({error:e.message},{status:e.message==='Yetkisiz'?401:400});}}
