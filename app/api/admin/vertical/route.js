import {NextResponse} from 'next/server';import {adminSb,requireAdmin} from '@/lib/admin';import {geminiJSON} from '@/lib/gemini';
export const maxDuration=60;
const ascii=s=>String(s).toLowerCase().replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const slug=s=>ascii(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30);
const KIND={appointment:'randevu',order:'sipariş',lead:'talep',stay:'rezervasyon'};
const TERMS={appointment:{booking:'Randevu',resource:'Çalışan',service:'Hizmet',customer:'Müşteri'},order:{booking:'Sipariş',resource:'Sevkiyat',service:'Ürün',customer:'Müşteri'},lead:{booking:'Görüşme',resource:'Danışman',service:'Hizmet',customer:'Müşteri'},stay:{booking:'Rezervasyon',resource:'Oda',service:'Oda tipi',customer:'Misafir'}};
const lines=t=>String(t||'').split('\n').map(x=>x.trim()).filter(Boolean);
export function keyOf(label,used){const w=ascii(label).split(/[^a-z0-9]+/).filter(Boolean).slice(0,4);let k=w.length?w[0]+w.slice(1).map(x=>x[0].toUpperCase()+x.slice(1)).join(''):'alan';if(/^[0-9]/.test(k))k='f'+k;let n=k,i=2;while(used.has(n))n=k+i++;used.add(n);return n;}
export async function POST(req){try{await requireAdmin(req);const b=await req.json(),kind=KIND[b.kind]?b.kind:'appointment',name=String(b.name||'').trim().slice(0,60);if(name.length<3)throw new Error('Sektör adı en az 3 harf olmalı.');
 if(b.action==='draft'){const schema={type:'OBJECT',properties:{intents:{type:'ARRAY',items:{type:'STRING'}},fields:{type:'ARRAY',items:{type:'OBJECT',properties:{label:{type:'STRING'},sensitive:{type:'BOOLEAN'}},required:['label','sensitive']}},services:{type:'ARRAY',items:{type:'OBJECT',properties:{name:{type:'STRING'},minutes:{type:'INTEGER'}},required:['name','minutes']}},notes:{type:'STRING'}},required:['intents','fields','services','notes']};
  const g=await geminiJSON([{text:`Türkiye'de "${name}" işletmelerine gelen telefon çağrılarında bir yapay zeka asistanının ${KIND[kind]} oluşturmak için toplaması gereken bilgileri ve tipik çağrı nedenlerini çıkar. intents: en fazla 8 kısa çağrı nedeni. fields: en fazla 10 bilgi alanı (kısa Türkçe etiket); sağlık, finans veya kimlik gibi hassas veri içerenlere sensitive=true. services: bu işletmenin tipik hizmet veya ürünleri ve ortalama süre (dakika), en fazla 12; uygulanmıyorsa boş dizi. notes: asistanın yapmaması gerekenler ve kişisel veri uyarıları, 2-3 cümle. Telefon numarasını alan olarak ekleme (sistem zaten biliyor). Genel bilgiyle yaz, kesin fiyat uydurma.`}],schema,45000);
  if(g.error)throw new Error('Taslak oluşturulamadı: '+g.error);const d=g.data;return NextResponse.json({intents:(d.intents||[]).slice(0,8),fields:(d.fields||[]).slice(0,10),services:(d.services||[]).slice(0,12),notes:d.notes||''});}
 if(b.action==='save'){const id=slug(name);if(!id)throw new Error('Geçersiz ad.');if(['restaurant','generic'].includes(id))throw new Error('Bu ad hazır sektörlerde var.');
  const used=new Set(['customerName','statedPhone']),fields=lines(b.fields).slice(0,12).map(l=>{const s=/\*\s*$/.test(l),label=l.replace(/\*\s*$/,'').trim().slice(0,80);return {k:keyOf(label,used),l:label,...(s?{s:1}:{})};}),
   services=lines(b.services).slice(0,30).map(l=>{const [n,d]=l.split('|');return {n:n.trim().slice(0,60),d:Math.min(600,Math.max(5,parseInt(d)||30))};}).filter(x=>x.n),
   config={terms:TERMS[kind],intents:lines(b.intents).slice(0,10).map(x=>x.slice(0,100)),fields,services,notes:String(b.notes||'').slice(0,600)};
  if(!fields.length)throw new Error('En az bir bilgi alanı olmalı.');
  const {error}=await adminSb.from('verticals').upsert({id,name,kind,sort:100,config},{onConflict:'id'});if(error)throw error;return NextResponse.json({id});}
 throw new Error('Geçersiz işlem');}catch(e){return NextResponse.json({error:e.message},{status:400});}}
