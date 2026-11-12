// Standart ve üstü: özel ses / ses kopyası (ElevenLabs). İşletme en az 1 dakikalık temiz bir ses kaydı yükler,
// sesin sahibi olduğunu ya da izni olduğunu onaylar; ses ElevenLabs'te oluşturulur ve asistan bu sesle konuşur.
// Gerekli env: ELEVENLABS_API_KEY. Aynı anahtar Vapi > Provider Keys > ElevenLabs alanına da girilmeli.
import {NextResponse} from 'next/server';import {adminSb} from '@/lib/admin';import {requireOwner} from '@/lib/owner';import {paketOf,enAzPaket} from '@/lib/paket';
export const dynamic='force-dynamic';export const maxDuration=60;
const hata=(m,s=400)=>NextResponse.json({error:m},{status:s});
export async function GET(req){try{const b=await requireOwner(req);const o=b.settings?.ozel_ses||null;
 return NextResponse.json({hazir:!!process.env.ELEVENLABS_API_KEY,izin:paketOf(b).ozelSes,enAz:enAzPaket('ozelSes'),ses:o?{ad:o.ad,tarih:o.tarih,aktif:o.aktif!==false}:null});}catch(e){return hata(e.message,401);}}
export async function POST(req){try{const b=await requireOwner(req);const key=process.env.ELEVENLABS_API_KEY,s={...(b.settings||{})};
 if(!paketOf(b).ozelSes)return hata(`Özel ses ${enAzPaket('ozelSes')} paketten itibaren açılır.`);
 if((req.headers.get('content-type')||'').includes('application/json')){const x=await req.json();
  if(x.islem==='kapat'||x.islem==='ac'){if(!s.ozel_ses)return hata('Kayıtlı ses yok.');s.ozel_ses={...s.ozel_ses,aktif:x.islem==='ac'};}
  else if(x.islem==='sil'){if(s.ozel_ses?.voiceId&&key)await fetch('https://api.elevenlabs.io/v1/voices/'+encodeURIComponent(s.ozel_ses.voiceId),{method:'DELETE',headers:{'xi-api-key':key}}).catch(()=>{});delete s.ozel_ses;}
  else return hata('Geçersiz işlem');
  await adminSb.from('businesses').update({settings:s}).eq('id',b.id);return NextResponse.json({ok:true});}
 if(!key)return hata('Ses kopyalama henüz açılmadı.');
 const f=await req.formData(),dosya=f.get('dosya');
 if(f.get('onay')!=='evet')return hata('Sesin size ait olduğunu veya sahibinin izni olduğunu onaylamanız gerekiyor.');
 if(!dosya||typeof dosya==='string')return hata('Ses dosyası seçin.');
 if(dosya.size>4e6)return hata('Dosya en fazla 4 MB olabilir (yaklaşık 2-3 dakikalık mp3/m4a).');
 if(dosya.size<120e3)return hata('Kayıt çok kısa; en az 1 dakikalık, gürültüsüz bir kayıt yükleyin.');
 if(!/^audio\//.test(dosya.type||''))return hata('Sadece ses dosyası yükleyin (mp3, m4a, wav).');
 const fd=new FormData();fd.append('name',`Dinlio ${String(b.name||'işletme').slice(0,40)}`);fd.append('files',dosya,dosya.name||'ses.mp3');fd.append('remove_background_noise','true');
 const r=await fetch('https://api.elevenlabs.io/v1/voices/add',{method:'POST',headers:{'xi-api-key':key},body:fd,signal:AbortSignal.timeout(50000)});const t=await r.text();let j={};try{j=JSON.parse(t);}catch{}
 if(!r.ok||!j.voice_id)return hata('Ses oluşturulamadı: '+(j.detail?.message||t.slice(0,160)));
 if(s.ozel_ses?.voiceId)await fetch('https://api.elevenlabs.io/v1/voices/'+encodeURIComponent(s.ozel_ses.voiceId),{method:'DELETE',headers:{'xi-api-key':key}}).catch(()=>{});
 s.ozel_ses={voiceId:j.voice_id,ad:String(f.get('ad')||'Özel ses').slice(0,40),tarih:new Date().toISOString(),aktif:true};
 await adminSb.from('businesses').update({settings:s}).eq('id',b.id);return NextResponse.json({ok:true});}catch(e){return hata(e.message,e.message==='Giriş gerekli'?401:400);}}
