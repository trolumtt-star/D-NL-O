import {SITE} from '@/lib/site';
export default function sitemap(){const d=new Date();return [{url:SITE+'/',lastModified:d,changeFrequency:'weekly',priority:1},...['kvkk','gizlilik','sozlesme'].map(s=>({url:`${SITE}/yasal/${s}`,lastModified:d,changeFrequency:'yearly',priority:.3}))];}
