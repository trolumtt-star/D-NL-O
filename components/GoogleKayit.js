'use client';
// Google ile hesap açma: buton + dönüşte Google oturumunu algılama. Formda e-posta/şifre yerine Google hesabı kullanılır.
import {useEffect,useState} from 'react';import {sb} from '@/lib/supabase';
const G=<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>;
// Dönüşte: Google oturumu varsa {email,ad,token}; zaten işletmesi varsa panele gönderir
export function useGoogleOturum(){const [g,setG]=useState(null);
 useEffect(()=>{sb.auth.getSession().then(async({data})=>{const se=data?.session;if(!se)return;const u=se.user;if(!u||!(u.identities||[]).some(i=>i.provider==='google'))return;
  const {data:bz}=await sb.from('businesses').select('id').limit(1);if(bz?.length){location.replace('/panel');return;}
  setG({email:u.email,ad:u.user_metadata?.full_name||u.user_metadata?.name||'',token:se.access_token});});},[]);
 return [g,async()=>{await sb.auth.signOut();setG(null);}];}
export function GoogleButon({donus,once,yazi='Google ile hesap aç'}){const [b,setB]=useState(false);
 return <button type="button" className="ks-btn ni" disabled={b} style={{background:'#fff',color:'#1f1f1f',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow:'none'}}
  onClick={async()=>{setB(true);try{once&&once();await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+donus,queryParams:{prompt:'select_account'}}});}catch{setB(false);}}}>{G}{yazi}</button>;}
export function GoogleBagli({g,cik}){return <div className="ks-kart" style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',marginBottom:10}}>{G}<div style={{flex:1,fontSize:'.9rem'}}><b>{g.email}</b><div style={{color:'var(--mute)',fontSize:'.8rem'}}>Google hesabınla açılacak, şifre gerekmez</div></div><button type="button" className="ni" onClick={cik} style={{all:'unset',cursor:'pointer',color:'var(--ink2)',fontSize:'.85rem'}}>Değiştir</button></div>;}
