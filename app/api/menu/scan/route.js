import {NextResponse} from 'next/server';import {requireOwner} from '@/lib/owner';import {visionItems} from '@/lib/gemini';
export const maxDuration=60;
export async function POST(req){try{const b=await requireOwner(req);if(b.plan!=='all')throw new Error('Bu özellik All in one pakete dahildir.');
 const {images,mode}=await req.json();if(!Array.isArray(images)||!images.length||images.length>3)throw new Error('1 ile 3 arasında fotoğraf yükleyin.');
 if(images.some(x=>typeof x!=='string'||x.length>2800000))throw new Error('Fotoğraf çok büyük, daha küçük bir fotoğraf deneyin.');
 const r=await visionItems(images,mode==='cost'?'cost':'menu');if(r.error)throw new Error('Fotoğraf okunamadı: '+r.error);
 return NextResponse.json({items:r.items});}catch(e){return NextResponse.json({error:e.message},{status:400});}}
