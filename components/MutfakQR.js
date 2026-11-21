'use client';
// İşletme sahibi: mutfak ekranı linki ve masadan QR sipariş (masa QR'ları yazdırma).
import {useEffect,useState} from 'react';
export default function MutfakQR({tok}){
 const [d,setD]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(''),[mqr,setMqr]=useState(''),[n,setN]=useState(0);
 const api=async(m,body)=>{const r=await fetch('/api/mutfak-ayar',{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+await tok()},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Hata');return j;};
 const doldur=j=>{setD(j);setN(j.masaSayisi);};
 useEffect(()=>{api('GET').then(doldur).catch(e=>setMsg(e.message));},[]);
 useEffect(()=>{if(!d?.mutfak){setMqr('');return;}(async()=>{try{const Q=(await import('qrcode')).default;setMqr(await Q.toDataURL(d.mutfak,{width:240,margin:1}));}catch{setMqr('');}})();},[d?.mutfak]);
 const is=async(islem,body,ok)=>{setBusy(islem);setMsg('');try{doldur(await api('POST',{islem,...body}));if(ok)setMsg(ok);}catch(e){setMsg(e.message);}setBusy('');};
 const kopya=async t=>{try{await navigator.clipboard.writeText(t);setMsg('Link kopyalandı.');}catch{setMsg(t);}};
 // Yazdırılabilir masa QR sayfası: her masa için büyük QR, masa numarası ve kısa açıklama
 const yazdir=async()=>{try{const Q=(await import('qrcode')).default,w=window.open('','_blank');if(!w){setMsg('Açılır pencere engellendi, izin verin.');return;}
  const kartlar=await Promise.all(d.qr.masalar.map(async x=>`<div class="k"><img src="${await Q.toDataURL(x.url,{width:420,margin:1,errorCorrectionLevel:'M'})}"/><b>Masa ${x.masa}</b><span>Menü ve sipariş için okutun</span></div>`));
  w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Masa QR kodları</title><style>body{font-family:system-ui,sans-serif;margin:0}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:0}.k{border:1px dashed #bbb;padding:22px;text-align:center;page-break-inside:avoid}.k img{width:62%;display:block;margin:0 auto 8px}.k b{display:block;font-size:28px}.k span{color:#555}@media print{.y{display:none}}</style></head><body><p class="y" style="padding:12px">Yazdırın, kesin ve her masaya kendi numaralı QR'ını yapıştırın. <button onclick="print()">Yazdır</button></p><div class="g">${kartlar.join('')}</div></body></html>`);w.document.close();}catch(e){setMsg('QR sayfası hazırlanamadı.');}};
 if(!d)return <div className="card sec2"><h2>Mutfak ekranı ve masadan sipariş</h2><p className="mut">{msg||'Yükleniyor…'}</p></div>;
 const q=d.qr;
 return <>
  <div className="card sec2"><h2>👨‍🍳 Mutfak ekranı</h2>
   <p className="mut">Mutfaktaki tablette ya da televizyonda açık bırakın: telefonla, masadan ve paket gelen siparişler anında düşer, yeni siparişte zil çalar. Aşçı "Hazırlanıyor" ve "Hazır" diye işaretler. Şifre gerekmez; link size özeldir, kimseyle paylaşmayın.</p>
   {d.mutfak?<><div className="row" style={{gap:8,flexWrap:'wrap',justifyContent:'flex-start'}}><a className="btn" href={d.mutfak} target="_blank" rel="noopener"><button>Mutfak ekranını aç</button></a>
     <button className="g" onClick={()=>kopya(d.mutfak)}>Linki kopyala</button>
     <button className="g" disabled={!!busy} onClick={()=>{if(confirm('Yeni link oluşturulursa mutfaktaki eski link çalışmaz. Devam edilsin mi?'))is('mutfak',{},'Yeni link oluşturuldu. Mutfaktaki cihazda yeni linki açın.');}}>Linki yenile</button></div>
    {mqr&&<p className="mut" style={{marginTop:10}}>Tablette açmak için bu QR'ı okutun:<br/><img src={mqr} alt="Mutfak ekranı QR" style={{width:160,borderRadius:8,marginTop:6,background:'#fff',padding:6}}/></p>}</>
   :<button disabled={!!busy} onClick={()=>is('mutfak',{},'Mutfak ekranı hazır.')}>{busy==='mutfak'?'…':'Mutfak ekranı linki oluştur'}</button>}</div>
  <div className="card sec2"><h2>🍽 Masadan QR ile sipariş</h2>
   <p className="mut">Her masaya QR yapıştırın. Müşteri okutunca menünüz açılır; sepete ekleyip siparişi gönderir, sipariş mutfak ekranına ve panele "Masa 5" diye düşer. Garson çağırma ve hesap isteme butonları da vardır. Ödeme her zamanki gibi kasada ya da garsona yapılır.</p>
   {!q.izin?<p>🔒 <b>{q.enAz}</b> paketten itibaren açılır. </p>:<>
    <div className="frm"><label>Masa sayısı<input type="number" min="0" max="100" value={n} onChange={e=>setN(+e.target.value)}/></label>
     <button className="g" disabled={!!busy} onClick={()=>is('masa_sayisi',{n},'Masa sayısı kaydedildi.')}>Kaydet</button></div>
    <label className="ck" style={{marginTop:8}}><input type="checkbox" style={{width:'auto'}} checked={q.acik} onChange={e=>is('qr',{acik:e.target.checked,garsonOnay:q.garsonOnay},e.target.checked?'Masadan sipariş açıldı.':'Masadan sipariş kapatıldı.')}/> Masadan sipariş açık</label>
    <label className="ck" style={{marginTop:6}}><input type="checkbox" style={{width:'auto'}} checked={q.garsonOnay} onChange={e=>is('qr',{acik:q.acik,garsonOnay:e.target.checked},'Kaydedildi.')}/> Her masanın ilk siparişini garson onaylasın (mutfak ekranında "Onayla")</label>
    <p className="mut" style={{fontSize:'.82rem',marginTop:8}}>Sahte siparişe karşı: QR'daki gizli masa kodu olmadan sipariş verilemez. Menü linki başkasına gönderilse bile, sipariş için masadaki QR'ın kamerayla okutulması istenir. Bir masadan saatte en fazla 8 sipariş gelebilir.</p>
    {q.acik&&q.masalar.length>0&&<div className="row" style={{gap:8,flexWrap:'wrap',justifyContent:'flex-start',marginTop:8}}>
     <button onClick={yazdir}>Masa QR'larını yazdır ({q.masalar.length} masa)</button>
     <button className="g" disabled={!!busy} onClick={()=>{if(confirm("QR'lar yenilenirse masalardaki eski QR'larla sipariş verilemez; yenilerini yazdırıp yapıştırmanız gerekir. Devam edilsin mi?"))is('qr_yenile',{},'QR kodları yenilendi. Yeni QR\'ları yazdırın.');}}>QR'ları yenile</button></div>}
    {q.acik&&!q.masalar.length&&<p className="mut">Önce masa sayısını girin.</p>}</>}
   {msg&&<p className="mut" style={{marginTop:8}}>{msg}</p>}</div></>;}
