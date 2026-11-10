'use client';
// Ek dakika / aşım ödemesi. Kartta özet + "Ek dakika al" butonu; tıklayınca ekrana ödeme penceresi gelir:
// 1) miktar  2) fatura/iletişim bilgileri  3) ödeme yöntemi -> Shopier'e yönlendirir ya da havale bilgisini gösterir.
import {useEffect,useState} from 'react';import {createPortal} from 'react-dom';
const tl=x=>Number(x).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺';
const DURUM={bekliyor:'Ödeme bekleniyor',bildirildi:'Kontrol ediliyor',odendi:'Eklendi ✓',iptal:'İptal'};
const AK='dinlio_odeme_bilgi';
const oku=()=>{try{return JSON.parse(localStorage.getItem(AK)||'{}')}catch{return {}}};
const yaz=x=>{try{localStorage.setItem(AK,JSON.stringify(x))}catch{}};
export default function EkDakika({tok,b,yenile}){
 const [v,setV]=useState(null),[msg,setMsg]=useState(''),[acik,setAcik]=useState(null);
 const api=async(m,body)=>{const r=await fetch('/api/dakika',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const yukle=()=>api('GET').then(setV).catch(e=>setMsg(e.message));
 useEffect(()=>{yukle();const q=new URLSearchParams(location.search).get('odeme');
  if(q){setMsg({ok:'Ödemeniz alındı, dakikalarınız hesabınıza eklendi. 🎉',iptal:'Ödeme tamamlanmadı, kartınızdan para çekilmedi.',hata:'Ödeme doğrulanamadı. Kartınızdan para çekildiyse destekten bize yazın.',bekle:'Ödeme sonucu bekleniyor.'}[q]||'');history.replaceState(null,'',location.pathname);if(q==='ok')yenile?.();}
  const ac=e=>setAcik(e.detail||'ek');window.addEventListener('ekdakika',ac);return()=>window.removeEventListener('ekdakika',ac);},[]);
 if(!v)return <div className="card" id="ekdk"><h2>Ek dakika al</h2><p className="mut">{msg||'Yükleniyor…'}</p></div>;
 const bu=v.birim.usd,kur=v.kur?.usd,yok=!v.shopier&&!v.iban,kd=v.kdv??0.2,kdvY=kd?' + KDV':'';
 return <div className="card" id="ekdk"><div className="row"><h2 style={{margin:0}}>Ek dakika al</h2>{!yok&&kur&&<button onClick={()=>setAcik('ek')}>Ek dakika al</button>}</div>
  <p className="mut" style={{marginTop:6}}>{v.birim.paket} paketinizdeki fiyatla: dakikası <b>${bu}</b>{kdvY}{kur?` (≈ ${tl(bu*kur*(1+kd))}${kd?' KDV dahil':''})`:''}. Ek dakikalar paket dakikanız bittikten sonra kullanılır, kullanılmayanlar sonraki aya devreder.</p>
  {v.asim?.borcDk>0&&<div style={{marginTop:10,padding:14,borderRadius:12,border:'1px solid rgba(255,31,61,.55)',background:'var(--redSoft)'}}>
   <b>Aşım ücreti: {v.asim.borcDk} dk{v.asim.borc?` · ${tl(v.asim.borc.toplam_tl)}${kd?' (KDV dahil)':''}`:''}</b>
   <p className="mut" style={{marginTop:4}}>Paket dakikanız bitti, asistan aşım hakkınızla çalışmaya devam etti.{v.asim.son?` Son ödeme: ${new Date(v.asim.son).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}. Ödenmezse asistan durur.`:''} Ödeyince kilitli siparişleriniz hemen açılır.</p>
   {!yok&&kur?<button style={{marginTop:10}} onClick={()=>setAcik('asim')}>Aşım ücretini öde</button>:<p className="mut" style={{marginTop:6}}>Ödeme için sağ alttaki Destek butonundan bize yazın.</p>}</div>}
  {msg&&<div style={{marginTop:8,padding:'10px 14px',borderRadius:12,background:'var(--soft)',border:'1px solid var(--line)'}}>{msg}</div>}
  {yok&&<p className="mut" style={{marginTop:10}}>Online ödeme yakında. Şimdilik ek dakika için sağ alttaki <b>Destek</b> butonundan bize yazın.</p>}
  {!yok&&!kur&&<p className="mut" style={{marginTop:10}}>Döviz kuru şu an alınamadı, birkaç dakika sonra sayfayı yenileyin.</p>}
  {v.siparisler?.length>0&&<details style={{marginTop:12}}><summary className="mut" style={{cursor:'pointer'}}>Geçmiş ödemeler</summary><table style={{marginTop:6}}><tbody>{v.siparisler.map(x=><tr key={x.kod}><td>{new Date(x.created_at).toLocaleDateString('tr-TR')}</td><td>{x.dakika} dk{x.tur==='asim'?' (aşım)':''}</td><td>{tl(x.toplam_tl)}</td><td className="mut">{x.yontem==='shopier'?'Kart':'Havale'}</td><td>{DURUM[x.durum]}</td></tr>)}</tbody></table></details>}
  {acik&&kur&&<Pencere v={v} b={b} tur={acik} api={api} kapat={()=>{setAcik(null);yukle();}} setMsg={setMsg}/>}
 </div>;}

function Pencere({v,b,tur,api,kapat,setMsg}){
 const bu=v.birim.usd,kur=v.kur.usd,asim=tur==='asim',kd=v.kdv??0.2;
 const [adim,setAdim]=useState(asim?2:1),[sec,setSec]=useState(100),[ozel,setOzel]=useState(''),[yontem,setY]=useState(v.shopier?'shopier':'iban'),[busy,setBusy]=useState(false),[hata,setHata]=useState(''),[iban,setIban]=useState(null),[kop,setKop]=useState('');
 const k0=oku(),[bi,setBi]=useState({ad:k0.ad||'',soyad:k0.soyad||'',eposta:k0.eposta||(b?.email&&!/@isletme\.panel$/.test(b.email)?b.email:''),tel:k0.tel||String(b?.phone_number||'').replace(/\D/g,'').slice(-10)});
 useEffect(()=>{const e=x=>x.key==='Escape'&&kapat();addEventListener('keydown',e);document.body.style.overflow='hidden';return()=>{removeEventListener('keydown',e);document.body.style.overflow='';};},[]);
 const dk=asim?v.asim.borcDk:sec==='ozel'?Math.round(+ozel||0):sec,gec=asim||(dk>=v.enAz&&dk<=v.enCok);
 const f=gec&&dk?(()=>{const usd=Math.round(dk*bu*100)/100,t=Math.round(usd*kur*100)/100,k=Math.round(t*kd*100)/100;return {usd,t,k,top:Math.round((t+k)*100)/100};})():null;
 const telOk=/^5\d{9}$/.test(bi.tel.replace(/\D/g,'').slice(-10)),mailOk=/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(bi.eposta.trim());
 const bilgiOk=bi.ad.trim().length>=2&&bi.soyad.trim().length>=2&&mailOk&&telOk;
 const [link,setLink]=useState(null),[kod,setKod]=useState(null),[bitti,setBitti]=useState(false);
 useEffect(()=>{if(!kod||bitti)return;const t=setInterval(async()=>{try{const r=await api('POST',{islem:'durum',kod});if(r.durum==='odendi'){setBitti(true);clearInterval(t);}}catch{}},5000);return()=>clearInterval(t);},[kod,bitti]);
 const ode=async()=>{setBusy(true);setHata('');yaz(bi);const pen=yontem==='shopier'?window.open('about:blank','_blank'):null;try{const j=await api('POST',{...(asim?{tur:'asim'}:{dakika:dk}),yontem,alici:{...bi,tel:bi.tel.replace(/\D/g,'').slice(-10)}});
  if(j.link){setLink(j.link);setKod(j.kod);setAdim(5);setBusy(false);if(pen&&!pen.closed)pen.location.href=j.link;return;}
  pen?.close();
  if(j.form){const fm=document.createElement('form');fm.method='POST';fm.action=j.form.action;for(const [k,x] of Object.entries(j.form.fields)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=x;fm.appendChild(i);}document.body.appendChild(fm);fm.submit();return;}
  setIban(j);setAdim(4);}catch(e){pen?.close();setHata(e.message);}setBusy(false);};
 const bildirdim=async()=>{setBusy(true);try{await api('POST',{islem:'bildirdim',kod:iban.kod});setMsg('Teşekkürler! Havaleniz kontrol edilince dakikalar hesabınıza eklenecek.');kapat();}catch(e){setHata(e.message);setBusy(false);}};
 const kopyala=async(x,n)=>{try{await navigator.clipboard.writeText(x);}catch{}setKop(n);setTimeout(()=>setKop(''),1500);};
 const In=({k,l,...p})=><label style={{display:'block'}}>{l}<input value={bi[k]} onChange={e=>setBi({...bi,[k]:e.target.value})} {...p}/></label>;
 const Ozet=()=>f&&<div style={{padding:12,borderRadius:12,background:'var(--soft)',border:'1px solid var(--line)',marginTop:12}}>
  <div className="row"><span className="mut">{dk} dk{asim?' aşım':' ek dakika'} × ${bu}</span><span>${f.usd.toFixed(2)}</span></div>
  <div className="row"><span className="mut">Tutar (kur {kur.toLocaleString('tr-TR')})</span><span>{tl(f.t)}</span></div>{kd>0&&<div className="row"><span className="mut">KDV %{Math.round(kd*100)}</span><span>{tl(f.k)}</span></div>}
  <div className="row" style={{marginTop:4}}><b>Ödenecek</b><b style={{fontSize:'1.25rem'}}>{tl(f.top)}</b></div></div>;
 const adimlar=asim?['Bilgiler','Ödeme']:['Miktar','Bilgiler','Ödeme'],aktif=asim?adim-2:adim-1;
 return createPortal(<div role="dialog" aria-modal="true" aria-label="Ek dakika satın al" onClick={e=>e.target===e.currentTarget&&!busy&&kapat()} style={{position:'fixed',top:0,left:0,width:'100vw',height:'100dvh',zIndex:9999,background:'rgba(0,0,0,.75)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,boxSizing:'border-box'}}>
  <div style={{width:'min(560px,100%)',maxHeight:'calc(100dvh - 32px)',overflowY:'auto',position:'relative',background:'#0e0e10',border:'1px solid rgba(255,255,255,.14)',borderRadius:20,padding:'24px 22px',boxShadow:'0 30px 90px -20px rgba(0,0,0,.9),0 0 0 1px rgba(255,31,61,.12)',transform:'none',animation:'none'}}>
   <button className="g" aria-label="Kapat" onClick={kapat} style={{position:'absolute',right:12,top:12,padding:'4px 10px'}}>✕</button>
   <h2 style={{marginRight:40}}>{asim?'Aşım ücretini öde':'Ek dakika al'}</h2>
   {adim<4&&<div className="row" style={{justifyContent:'flex-start',gap:6,margin:'6px 0 14px'}}>{adimlar.map((x,i)=><span key={x} className={'tag'+(i===aktif?' x':'')} style={{opacity:i>aktif?.5:1}}>{i+1}. {x}</span>)}</div>}

   {adim===1&&<>
    <div className="tgrid" style={{gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
     {v.secenekler.map(o=><button key={o.dakika} type="button" className={sec===o.dakika?'':'g'} onClick={()=>setSec(o.dakika)} style={{padding:'14px 12px',textAlign:'left',lineHeight:1.35}}><b style={{fontSize:'1.15rem'}}>{o.dakika} dk</b><br/>{tl(o.toplam_tl)}<br/><small style={{opacity:.75}}>{kd?'KDV dahil':'\u00a0'}</small></button>)}
     <button type="button" className={sec==='ozel'?'':'g'} onClick={()=>setSec('ozel')} style={{padding:'14px 12px',textAlign:'left',lineHeight:1.35}}><b style={{fontSize:'1.15rem'}}>Özel miktar</b><br/>istediğiniz kadar<br/><small style={{opacity:.75}}>en az {v.enAz} dk</small></button>
    </div>
    {sec==='ozel'&&<label style={{display:'block',marginTop:12}}>Kaç dakika?<input autoFocus type="number" inputMode="numeric" min={v.enAz} max={v.enCok} value={ozel} onChange={e=>setOzel(e.target.value)} placeholder="ör. 150"/></label>}
    {!gec&&sec==='ozel'&&ozel&&<p className="mut" style={{marginTop:4}}>En az {v.enAz}, en çok {v.enCok} dakika girin.</p>}
    <Ozet/>
    <button style={{marginTop:14,width:'100%'}} disabled={!f} onClick={()=>setAdim(2)}>Devam et</button></>}

   {adim===2&&<>
    <p className="mut" style={{marginBottom:10}}>Fatura ve ödeme makbuzu için gerekli. Bir dahaki sefere bu bilgiler hazır gelir.</p>
    <div className="grid" style={{gridTemplateColumns:'1fr 1fr',gap:10}}>{In({k:'ad',l:'Ad',autoComplete:'given-name'})}{In({k:'soyad',l:'Soyad',autoComplete:'family-name'})}</div>
    {In({k:'eposta',l:'E-posta (makbuz buraya gelir)',type:'email',autoComplete:'email',inputMode:'email'})}
    {In({k:'tel',l:'Cep telefonu',type:'tel',autoComplete:'tel',inputMode:'tel',placeholder:'5XX XXX XX XX'})}
    {bi.eposta&&!mailOk&&<p className="mut">Geçerli bir e-posta girin.</p>}{bi.tel&&!telOk&&<p className="mut">Telefonu 5 ile başlayan 10 hane olarak girin.</p>}
    <Ozet/>
    <div className="row" style={{marginTop:14,gap:8}}>{!asim&&<button className="g" onClick={()=>setAdim(1)}>Geri</button>}<button style={{flex:1}} disabled={!bilgiOk} onClick={()=>setAdim(3)}>Devam et</button></div></>}

   {adim===3&&<>
    <div style={{display:'grid',gap:8}}>
     {v.shopier&&<label className="card" style={{margin:0,padding:12,display:'flex',gap:10,alignItems:'center',cursor:'pointer',borderColor:yontem==='shopier'?'var(--red)':undefined}}><input type="radio" checked={yontem==='shopier'} onChange={()=>setY('shopier')} style={{width:'auto',margin:0}}/><span><b>Kredi / banka kartı</b><br/><small className="mut">Shopier güvenli ödeme sayfasına yönlendirilirsiniz, dakikalar anında eklenir.</small></span></label>}
     {v.iban&&<label className="card" style={{margin:0,padding:12,display:'flex',gap:10,alignItems:'center',cursor:'pointer',borderColor:yontem==='iban'?'var(--red)':undefined}}><input type="radio" checked={yontem==='iban'} onChange={()=>setY('iban')} style={{width:'auto',margin:0}}/><span><b>Havale / EFT</b><br/><small className="mut">IBAN bilgisi gösterilir, kontrol sonrası dakikalar eklenir.</small></span></label>}
    </div>
    <Ozet/>
    {hata&&<p style={{color:'var(--redInk)',marginTop:8}}>{hata}</p>}
    <div className="row" style={{marginTop:14,gap:8}}><button className="g" disabled={busy} onClick={()=>setAdim(2)}>Geri</button><button style={{flex:1}} disabled={busy||!f} onClick={ode}>{busy?'Yönlendiriliyor…':yontem==='shopier'?`Ödemeye geç · ${tl(f.top)}`:`Havale bilgilerini göster`}</button></div>
    <p className="mut" style={{fontSize:'.78rem',marginTop:8}}>Tutar şu anki TCMB kuruyla hesaplandı. Kart bilgileriniz bize gelmez, ödeme Shopier üzerinden alınır.</p></>}

   {adim===5&&link&&(bitti?<div style={{textAlign:'center',padding:'10px 0'}}><div style={{fontSize:44}}>🎉</div><h2>Ödemeniz alındı</h2><p className="mut">{asim?'Aşım ücretiniz ödendi, kilitli siparişleriniz açıldı.':`${dk} dakika hesabınıza eklendi.`}</p><button style={{marginTop:14,width:'100%'}} onClick={()=>{kapat();location.reload();}}>Tamam</button></div>
   :<div style={{textAlign:'center',padding:'6px 0'}}><p>Shopier ödeme sayfası <b>yeni sekmede</b> açıldı. Ödemeyi orada tamamlayın, bu pencere ödemeyi kendiliğinden algılar.</p>
    <p className="mut" style={{marginTop:10}}>⏳ Ödeme bekleniyor…</p>
    <a className="lb" href={link} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',marginTop:12}}>Ödeme sayfası açılmadıysa buraya tıklayın</a>
    <p className="mut" style={{fontSize:'.8rem',marginTop:12}}>Ödeme kodunuz: <b style={{fontFamily:'monospace'}}>{kod}</b>. Sayfa 2 saat geçerlidir. Ödedikten sonra bu pencereyi kapatsanız da dakikalar eklenir.</p>
    <button className="g" style={{marginTop:12}} onClick={kapat}>Kapat</button></div>)}
   {adim===4&&iban&&<>
    <p><b>{iban.dakika} dk · {tl(iban.toplam_tl)}</b> {kd?'(KDV dahil)':''}</p>
    <p style={{marginTop:6}}>Aşağıdaki hesaba havale/EFT yapın. <b>Açıklamaya mutlaka bu kodu yazın:</b></p>
    {[['Açıklama kodu',iban.kod,'k'],['IBAN',iban.iban,'i'],['Alıcı',iban.ad,'a'],['Tutar',String(iban.toplam_tl).replace('.',','),'t']].filter(x=>x[1]).map(([l,x,n])=><div key={n} className="row" style={{justifyContent:'flex-start',gap:8,marginTop:6,flexWrap:'wrap'}}><span className="mut" style={{minWidth:100}}>{l}</span><b style={{fontFamily:'monospace',wordBreak:'break-all'}}>{x}</b><button className="g" style={{padding:'4px 10px'}} onClick={()=>kopyala(x,n)}>{kop===n?'Kopyalandı ✓':'Kopyala'}</button></div>)}
    {iban.banka&&<p className="mut" style={{marginTop:6}}>Banka: {iban.banka}</p>}
    {hata&&<p style={{color:'var(--redInk)',marginTop:8}}>{hata}</p>}
    <div className="row" style={{marginTop:14,gap:8}}><button className="g" onClick={kapat}>Sonra öderim</button><button style={{flex:1}} disabled={busy} onClick={bildirdim}>Ödemeyi yaptım</button></div></>}
  </div></div>,document.body);}
