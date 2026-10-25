'use client';
import {useEffect,useRef,useState} from 'react';import Link from 'next/link';import './landing.css';
const CONTACT='trolumtt@gmail.com';
const PK=[{id:'s',name:'Başlangıç',min:100,price:3499,first:499,note:'Yeni başlayan işletmeler'},{id:'m',name:'Standart',min:300,price:4899,note:'Küçük işletmeler'},{id:'l',name:'Büyük',min:500,price:5299,note:'Yoğun çağrı alan işletmeler'}];
const FEAT=['Telefonu 7/24 karşılar','Sipariş ve adres alır','Masa kontrolü ve rezervasyon, çift rezervasyon olmaz','Canlı işletme paneli','Dakika kotası takibi','Çağrı özeti ve geçmişi'];
const SCRIPT=[['a','Anadolu Sofrası, buyurun.'],['c','İki dürüm bir de ayran alacaktım.'],['a','Adresinizi alabilir miyim?'],['c','Adnan Menderes Caddesi.'],['a','Siparişiniz alındı, afiyet olsun.']];
const tl=n=>Math.round(n).toLocaleString('tr-TR')+' TL';
function useReveal(){const r=useRef(),[v,setV]=useState(false);useEffect(()=>{const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);o.disconnect();}},{threshold:.15});o.observe(r.current);return()=>o.disconnect();},[]);return [r,v];}
function useCount(t){const [n,setN]=useState(0),ref=useRef(0);useEffect(()=>{let raf;const s=ref.current,st=performance.now();const f=now=>{const k=Math.min(1,(now-st)/600),e=1-Math.pow(1-k,3);ref.current=s+(t-s)*e;setN(ref.current);if(k<1)raf=requestAnimationFrame(f);};raf=requestAnimationFrame(f);return()=>cancelAnimationFrame(raf);},[t]);return n;}
const tilt=(e,max=10)=>{const el=e.currentTarget,b=el.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;el.style.setProperty('--rx',(-y*max)+'deg');el.style.setProperty('--ry',(x*max*1.4)+'deg');};
const untilt=e=>{e.currentTarget.style.setProperty('--rx','0deg');e.currentTarget.style.setProperty('--ry','0deg');};
function Phone(){const [n,setN]=useState(0);useEffect(()=>{const t=setInterval(()=>setN(x=>x>=8?0:x+1),1500);return()=>clearInterval(t);},[]);
 return <div className="stage" onPointerMove={e=>tilt({currentTarget:e.currentTarget.firstChild,clientX:e.clientX,clientY:e.clientY},16)} onPointerLeave={e=>untilt({currentTarget:e.currentTarget.firstChild})}><div className="rig">
 <div className="phone"><div className="notch"/><div className="scr"><div className="top"><b>Gelen çağrı</b><span className="wave">{Array.from({length:14},(_,i)=><i key={i} style={{animationDelay:i*.09+'s'}}/>)}</span></div>
 <div className="chat">{SCRIPT.slice(0,Math.min(n,5)).map(([w,t],i)=><p key={i} className={'bub '+w}>{t}</p>)}</div></div></div>
 <div className={'fl f1'+(n>=5?' on':'')}><small>Yeni sipariş</small><b>2 dürüm, 1 ayran</b><span>Adnan Menderes Caddesi</span></div>
 <div className={'fl f2'+(n>=6?' on':'')}><small>Rezervasyon</small><b>Masa 3 · 19:30</b><span>Panelde masa kırmızı oldu</span></div>
 <div className="fl f3 on"><small>Kalan kota</small><b>82 dk</b></div></div></div>;}
function Calc({onPick}){const [c,setC]=useState(30),[miss,setMiss]=useState(25),[avg,setAvg]=useState(350);
 const mc=Math.min(c,100)*30,missed=Math.round(mc*miss/100),loss=missed*avg,need=mc*1.5,over=need>500,pk=PK.find(p=>need<=p.min)||PK[2];
 useEffect(()=>{onPick(pk.id);},[pk.id]);const L=useCount(loss),max=Math.max(loss,pk.price,1),sl=(v,lo,hi)=>({'--p':(v-lo)/(hi-lo)*100+'%'});
 return <div className="calc"><div className="ctl">
 <label>Günde kaç telefon alıyorsunuz?<b>{c>100?'100+':c}</b><input type="range" min="1" max="101" value={c} style={sl(c,1,101)} onChange={e=>setC(+e.target.value)}/></label>
 <label>Telefona çıkılamayan çağrı oranı<b>%{miss}</b><input type="range" min="5" max="60" value={miss} style={sl(miss,5,60)} onChange={e=>setMiss(+e.target.value)}/></label>
 <label>Ortalama sipariş tutarı<b>{tl(avg)}</b><input type="range" min="100" max="1500" step="25" value={avg} style={sl(avg,100,1500)} onChange={e=>setAvg(+e.target.value)}/></label></div>
 <div className="res"><p className="mut">Tahmini aylık kaybınız</p><h3>{tl(L)}</h3><p className="mut">Ayda {mc} arama, yaklaşık {missed} tanesi cevapsız kalıyor. Yıllık {tl(loss*12)}.</p>
 <div className="bars"><div><i className="b1" style={{width:loss/max*100+'%'}}/><span>Kaçan ciro</span><em>{tl(loss)}</em></div><div><i className="b2" style={{width:pk.price/max*100+'%'}}/><span>{pk.name} paket</span><em>{tl(pk.price)}</em></div></div>
 <p>Tahmini ihtiyaç ayda yaklaşık <b>{Math.round(need)} dk</b>. {over?'500 dakikanın üstü için bizimle görüşün.':<>Size uygun: <b>{pk.name}</b> paket.</>}</p>
 <p className="mut" style={{marginTop:10}}>Bu bir tahmindir, girdiğiniz değerlere göre hesaplanır. Ortalama görüşme 1,5 dk, 100+ seçimi 100 arama olarak alınır.</p></div></div>;}
export default function Home(){const [pick,setPick]=useState('s'),[r,v]=useReveal();
 return <div className="lp"><nav className="nav"><b>Sesli Asistan</b><div><a href="#fiyat">Paketler</a><Link href="/login" className="btn" style={{padding:'9px 18px'}}>Giriş yap</Link></div></nav>
 <section className="hero"><div><h1>Telefon çalıyor, elleriniz dolu. Asistanınız açıyor.</h1><p className="lead">Sipariş alır, adresi yazar, masayı kontrol eder, rezervasyonu açar. Her şey işletme panelinizde anında görünür.</p>
 <div className="cta"><a className="btn" href="#fiyat">Paketleri gör</a><a className="btn w" href="#hesap">Ne kaybediyorum?</a></div></div><Phone/></section>
 <section><h2>Üç adımda çalışır</h2><p className="lead">Kurulumu biz yaparız, siz sadece numaranızı yönlendirirsiniz.</p>
 <div className="steps"><div className="step"><em>1</em><h3>Arama gelir</h3><p>Müşteri işletmenizi arar. Asistan ilk çalışta açar, bekletmez.</p></div><div className="step"><em>2</em><h3>Asistan konuşur</h3><p>Siparişi ve adresi alır, boş masayı sorar, rezervasyonu açar.</p></div><div className="step"><em>3</em><h3>Panelde görürsünüz</h3><p>Sipariş, rezervasyon ve kalan dakikanız anında ekranınıza düşer.</p></div></div></section>
 <section id="hesap"><h2>Telefon çaldığında kaç liranız kaçıyor?</h2><p className="lead">Çubukları kaydırın, işletmenize göre tahmini kaybı görün.</p><Calc onPick={setPick}/></section>
 <section id="fiyat"><h2>Paketler</h2><p className="lead">Üç pakette de özellikler aynı, fark dakikada.</p>
 <div ref={r} className={'price'+(v?' in':'')}>{PK.map(p=><div key={p.id} className={'pc'+(pick===p.id?' pick':'')} onPointerMove={e=>tilt(e,8)} onPointerLeave={untilt}><span className="badge">Size uygun</span>
 <h3>{p.name}</h3><p className="n">{p.note}</p>{p.first?<><div className="big">{tl(p.first)}</div><p className="was">İlk ay, sonra {tl(p.price)} / ay</p></>:<><div className="big">{tl(p.price)}</div><p className="was">aylık</p></>}
 <span className="min">{p.min} dakika / ay</span><ul>{FEAT.map(f=><li key={f}>{f}</li>)}</ul><a className="btn" href={`mailto:${CONTACT}?subject=${encodeURIComponent(p.name+' paket')}`}>Bu paketi seç</a></div>)}</div></section>
 <div className="foot">Sesli Asistan · <Link href="/login">İşletme girişi</Link></div></div>;}
