'use client';
// Canlı demo sayfası. Sitede "Asistanla konuş" penceresinin içinde açılır (?gomulu=1).
import {useEffect,useState} from 'react';import '@/components/ks.css';import SesliDeneme from '@/components/SesliDeneme';
export default function Demo(){const [g,setG]=useState(false);useEffect(()=>{setG(new URLSearchParams(location.search).has('gomulu'));},[]);
 return <div className="ks" style={g?{background:'transparent',minHeight:0}:{}}><div className="ks-w" style={g?{padding:'8px 4px'}:{}}>
  {!g&&<div className="ks-top"><a className="ks-logo" href="/"><i>🎙</i><span>Dinlio <b>AI</b></span></a></div>}
  <h1 style={{textAlign:'center'}}>Telefonun öbür ucunda <em>Dinlio</em> var.</h1>
  <p className="ks-alt" style={{textAlign:'center'}}>Küreye dokun, mikrofon iznini ver ve hayali bir dönerciden sipariş vermeyi dene. Görüşme en fazla 2 dakika.</p>
  <SesliDeneme/>
  <a className="ks-btn" style={{display:'grid',placeItems:'center',textDecoration:'none'}} href="/kayit" target={g?'_top':undefined}>Kendi işletmen için 7 gün ücretsiz dene</a></div></div>;}
