'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';import {sb} from '@/lib/supabase';
export default function Login(){const r=useRouter(),[u,setU]=useState(''),[p,setP]=useState(''),[e,setE]=useState(''),[l,setL]=useState(false);
 async function go(ev){ev.preventDefault();setL(true);setE('');const email=u.includes('@')?u:u.toLowerCase().trim()+'@isletme.panel';const {data,error}=await sb.auth.signInWithPassword({email,password:p});
  if(error){setE('Kullanıcı adı veya şifre hatalı.');setL(false);return;}r.replace(data.user.email.toLowerCase()===process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase()?'/admin':'/panel');}
 return <main className="login"><h1>Çağrılarınız, rezervasyonlarınız, tek ekranda.</h1><p className="mut">Sesli asistanınızın aldığı her bilgi anında burada.</p>
 <form className="card" onSubmit={go}><label>Kullanıcı adı veya e-posta<input value={u} onChange={x=>setU(x.target.value)} required/></label><label>Şifre<input type="password" value={p} onChange={x=>setP(x.target.value)} required/></label>{e&&<p style={{color:'var(--bad)'}}>{e}</p>}<button disabled={l}>{l?'Giriş yapılıyor':'Giriş yap'}</button></form></main>;}
