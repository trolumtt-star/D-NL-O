'use client';
// Şifre yazılırken canlı güç göstergesi ve kural listesi (lib/sifre.js ile aynı kurallar)
import {sifreKontrol} from '@/lib/sifre';
const RENK=['#ff1f3d','#ff1f3d','#ff9f1c','#ffd60a','#2ee66b'],AD=['Çok zayıf','Zayıf','Orta','İyi','Güçlü'];
export default function SifreGucu({sifre,eposta,ad}){if(!sifre)return null;const r=sifreKontrol(sifre,{eposta,ad}),p=r.gecerli?4:Math.min(3,r.puan);
 return <div style={{margin:'6px 0 4px'}}>
  <div style={{display:'flex',gap:4}}>{[0,1,2,3].map(i=><i key={i} style={{flex:1,height:5,borderRadius:9,background:i<=p-1||(p===0&&i===0)?RENK[p]:'rgba(255,255,255,.12)',transition:'background .25s'}}/>)}</div>
  <div style={{display:'flex',justifyContent:'space-between',fontSize:'.78rem',margin:'4px 0',color:RENK[p]}}><b>{AD[p]}</b>{r.gecerli&&<span>✓ Kullanılabilir</span>}</div>
  {!r.gecerli&&<ul style={{listStyle:'none',padding:0,margin:'2px 0 0',display:'grid',gap:2,fontSize:'.8rem'}}>{r.kurallar.map(k=><li key={k.m} style={{color:k.ok?'#7be3a0':'var(--mute,#999)'}}>{k.ok?'✓':'○'} {k.m}</li>)}</ul>}</div>;}
