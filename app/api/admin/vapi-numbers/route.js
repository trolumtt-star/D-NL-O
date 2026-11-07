import {NextResponse} from 'next/server';import {requireAdmin} from '@/lib/admin';
const err=e=>NextResponse.json({error:e.message},{status:400});
// Vapi hesabındaki tüm telefon numaralarını çeker; admin panelde UUID ile uğraşmadan
// isimden/numaradan seçebilmek için.
export async function GET(req){try{await requireAdmin(req);
 const key=process.env.VAPI_API_KEY;if(!key)throw new Error('VAPI_API_KEY tanımlı değil (Vercel env)');
 const r=await fetch('https://api.vapi.ai/phone-number',{headers:{authorization:'Bearer '+key},signal:AbortSignal.timeout(10000)});
 const t=await r.text();if(!r.ok)throw new Error(`Vapi: ${r.status} ${t.slice(0,200)}`);
 const j=JSON.parse(t);
 const items=(Array.isArray(j)?j:j.results||[]).map(x=>({id:x.id,number:x.number||x.sipUri||'(numara yok)',name:x.name||null,assistantId:x.assistantId||null}));
 return NextResponse.json({items});
}catch(e){return err(e);}}
