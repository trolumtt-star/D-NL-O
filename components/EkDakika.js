'use client';
// Ek dakika satın alma kartı: paket fiyatından dakika başı, KDV dahil TL; Shopier (kart) veya havale/EFT.
import {useEffect,useState} from 'react';
const tl=x=>Number(x).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺';
const DURUM={bekliyor:'Ödeme bekleniyor',bildirildi:'Kontrol ediliyor',odendi:'Eklendi ✓',iptal:'İptal'};
export default function EkDakika({tok,b,yenile}){
 const [v,setV]=useState(null),[sec,setSec]=useState(100),[ozel,setOzel]=useState(''),[yontem,setY]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[iban,setIban]=useState(null),[kop,setKop]=useState('');
 const api=async(m,body)=>{const r=await fetch('/api/dakika',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const yukle=()=>api('GET').then(j=>{setV(j);setY(y=>y||(j.shopier?'shopier':'iban'));}).catch(e=>setMsg(e.message));
 useEffect(()=>{yukle();const q=new URLSearchParams(location.search).get('odeme');
  if(q){setMsg({ok:'Ödemeniz alındı, dakikalarınız hesabınıza eklendi. 🎉',iptal:'Ödeme tamamlanmadı, kartınızdan para çekilmedi.',hata:'Ödeme doğrulanamadı. Kartınızdan para çekildiyse destekten bize yazın.',bekle:'Ödeme sonucu bekleniyor.'}[q]||'');history.replaceState(null,'',location.pathname);if(q==='ok')yenile?.();}},[]);
 if(!v)return <div className="card" id="ekdk"><h2>Ek dakika al</h2><p className="mut">{typeof msg==='string'&&msg?msg:'Yükleniyor…'}</p></div>;
 const bu=v.birim.usd,kur=v.kur?.usd,dk=sec==='ozel'?Math.round(+ozel||0):sec,gec=dk>=v.enAz&&dk<=v.enCok;
 const f=kur&&gec?(()=>{const usd=Math.round(dk*bu*100)/100,t=Math.round(usd*kur*100)/100,k=Math.round(t*.2*100)/100;return {usd,t,k,top:Math.round((t+k)*100)/100};})():null;
 const kopyala=async(x,n)=>{try{await navigator.clipboard.writeText(x);}catch{}setKop(n);setTimeout(()=>setKop(''),1500);};
 const al=async(tur,yon=yontem)=>{setBusy(true);setMsg('');try{const j=await api('POST',tur==='asim'?{tur,yontem:yon}:{dakika:dk,yontem:yon});
  if(j.form){const fm=document.createElement('form');fm.method='POST';fm.action=j.form.action;for(const [k,x] of Object.entries(j.form.fields)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=x;fm.appendChild(i);}document.body.appendChild(fm);fm.submit();return;}
  setIban(j);yukle();}catch(e){setMsg(e.message);}setBusy(false);};
 const bildirdim=async()=>{setBusy(true);try{await api('POST',{islem:'bildirdim',kod:iban.kod});setIban(null);setMsg('Teşekkürler! Ödemeniz kontrol edilince dakikalar hesabınıza eklenecek, Telegram bağlıysa bildirim gelecek.');yukle();}catch(e){setMsg(e.message);}setBusy(false);};
 const yok=!v.shopier&&!v.iban;
 return <div className="card" id="ekdk"><h2>Ek dakika al</h2>
  <p className="mut">{v.birim.paket} paketinizdeki fiyatla: dakikası <b>${bu.toFixed(3).replace(/0$/,'')}</b> + KDV{kur?` (≈ ${tl(bu*kur*1.2)} KDV dahil)`:''}. Ek dakikalar paket dakikanız bittikten sonra kullanılır ve kullanılmayanlar sonraki aya devreder.</p>
  {v.asim?.borcDk>0&&!iban&&<div style={{marginTop:10,padding:14,borderRadius:12,border:'1px solid rgba(255,31,61,.55)',background:'var(--redSoft)'}}>
   <b>Aşım ücreti: {v.asim.borcDk} dk{v.asim.borc?` · ${tl(v.asim.borc.toplam_tl)} (KDV dahil)`:''}</b>
   <p className="mut" style={{marginTop:4}}>Paket dakikanız bittikten sonra asistan aşım hakkınızla çalışmaya devam etti.{v.asim.son?` Son ödeme: ${new Date(v.asim.son).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}. Ödenmezse asistan durur.`:''} Ödeyince kilitli siparişleriniz hemen açılır.</p>
   {(v.shopier||v.iban)&&kur?<div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:10,flexWrap:'wrap'}}>{v.shopier&&<button disabled={busy} onClick={()=>al('asim','shopier')}>Kartla öde</button>}{v.iban&&<button className={v.shopier?'g':''} disabled={busy} onClick={()=>al('asim','iban')}>Havale ile öde</button>}</div>:<p className="mut" style={{marginTop:6}}>Ödeme için sağ alttaki Destek butonundan bize yazın.</p>}</div>}
  {typeof msg==='string'&&msg&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:12,background:"var(--soft)",border:"1px solid var(--line)"}}>{msg}</div>}
  {iban?<div style={{marginTop:12,padding:14,borderRadius:12,border:'1px solid var(--line)',background:'var(--soft)'}}>
   <p><b>{iban.dakika} dakika · {tl(iban.toplam_tl)}</b> (KDV dahil)</p>
   <p style={{marginTop:8}}>Aşağıdaki hesaba havale/EFT yapın. <b>Açıklamaya mutlaka bu kodu yazın:</b></p>
   {[['Açıklama kodu',iban.kod,'k'],['IBAN',iban.iban,'i'],['Alıcı',iban.ad,'a'],['Tutar',String(iban.toplam_tl).replace('.',','),'t']].filter(x=>x[1]).map(([l,x,n])=><div key={n} className="row" style={{justifyContent:'flex-start',gap:8,marginTop:6}}><span className="mut" style={{minWidth:100}}>{l}</span><b style={{fontFamily:'monospace',wordBreak:'break-all'}}>{x}</b><button className="g" style={{padding:'4px 10px'}} onClick={()=>kopyala(x,n)}>{kop===n?'Kopyalandı ✓':'Kopyala'}</button></div>)}
   {iban.banka&&<p className="mut" style={{marginTop:6}}>Banka: {iban.banka}</p>}
   <div className="row" style={{justifyContent:'flex-start',marginTop:12}}><button disabled={busy} onClick={bildirdim}>Ödemeyi yaptım</button><button className="g" onClick={()=>setIban(null)}>Kapat</button></div></div>
  :yok?<p className="mut" style={{marginTop:10}}>Online ödeme yakında. Şimdilik ek dakika için sağ alttaki <b>Destek</b> butonundan bize yazın.</p>
  :!kur?<p className="mut" style={{marginTop:10}}>Döviz kuru şu an alınamadı, birkaç dakika sonra sayfayı yenileyin.</p>
  :<>
   <div className="tgrid" style={{marginTop:12,gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}>
    {v.secenekler.map(o=><button key={o.dakika} type="button" className={sec===o.dakika?'':'g'} onClick={()=>setSec(o.dakika)} style={{padding:'12px 10px',textAlign:'left',lineHeight:1.35}}><b style={{fontSize:'1.1rem'}}>{o.dakika} dk</b><br/>{tl(o.toplam_tl)}<br/><small style={{opacity:.75}}>KDV dahil</small></button>)}
    <button type="button" className={sec==='ozel'?'':'g'} onClick={()=>setSec('ozel')} style={{padding:'12px 10px',textAlign:'left',lineHeight:1.35}}><b style={{fontSize:'1.1rem'}}>Özel</b><br/>istediğiniz kadar<br/><small style={{opacity:.75}}>en az {v.enAz} dk</small></button>
   </div>
   {sec==='ozel'&&<label style={{display:'block',marginTop:10}}>Kaç dakika?<input type="number" inputMode="numeric" min={v.enAz} max={v.enCok} value={ozel} onChange={e=>setOzel(e.target.value)} placeholder={'ör. 150'} style={{maxWidth:180}}/></label>}
   {f&&<div style={{marginTop:12,padding:12,borderRadius:12,background:'var(--soft)',border:'1px solid var(--line)'}}>
    <div className="row"><span className="mut">{dk} dk × ${bu} = ${f.usd.toFixed(2)} · kur {kur.toLocaleString('tr-TR')}</span></div>
    <div className="row"><span className="mut">Tutar</span><span>{tl(f.t)}</span></div><div className="row"><span className="mut">KDV %20</span><span>{tl(f.k)}</span></div>
    <div className="row" style={{marginTop:4}}><b>Ödenecek (KDV dahil)</b><b style={{fontSize:'1.2rem'}}>{tl(f.top)}</b></div></div>}
   {!gec&&sec==='ozel'&&ozel&&<p className="mut" style={{marginTop:6}}>En az {v.enAz}, en çok {v.enCok} dakika girin.</p>}
   <div className="row" style={{justifyContent:'flex-start',gap:8,marginTop:12,flexWrap:'wrap'}}>
    {v.shopier&&<label style={{display:'flex',gap:6,alignItems:'center',margin:0}}><input type="radio" checked={yontem==='shopier'} onChange={()=>setY('shopier')} style={{width:'auto',margin:0}}/> Kart ile (Shopier)</label>}
    {v.iban&&<label style={{display:'flex',gap:6,alignItems:'center',margin:0}}><input type="radio" checked={yontem==='iban'} onChange={()=>setY('iban')} style={{width:'auto',margin:0}}/> Havale / EFT</label>}
   </div>
   <button style={{marginTop:12}} disabled={busy||!f} onClick={()=>al()}>{busy?'Hazırlanıyor…':yontem==='shopier'?`Kartla öde · ${f?tl(f.top):''}`:`Havale bilgilerini göster · ${f?tl(f.top):''}`}</button>
   <p className="mut" style={{fontSize:'.78rem',marginTop:6}}>Tutar ödeme anındaki TCMB kuruyla hesaplanır. Kartla ödemeler Shopier güvencesiyle alınır, kart bilgileriniz bize gelmez.</p></>}
  {v.siparisler?.length>0&&<details style={{marginTop:12}}><summary className="mut" style={{cursor:'pointer'}}>Geçmiş ek dakika alımları</summary><table style={{marginTop:6}}><tbody>{v.siparisler.map(x=><tr key={x.kod}><td>{new Date(x.created_at).toLocaleDateString('tr-TR')}</td><td>{x.dakika} dk{x.tur==='asim'?' (aşım)':''}</td><td>{tl(x.toplam_tl)}</td><td className="mut">{x.yontem==='shopier'?'Kart':'Havale'}</td><td>{DURUM[x.durum]}</td></tr>)}</tbody></table></details>}
 </div>;}
