'use client';
// Mesajlaşma: WhatsApp / Instagram otomatik cevap ve otomatik mesajlar. Altyapı hazır, özellikler "Yakında".
import {useEffect,useState} from 'react';
// durum: 'hazir' = kuruldu, ilgili hat/hesap bağlanınca çalışır (Ayarlar'dan açılır); yoksa Yakında
const LISTE=[
 ['Otomatik cevap',[['WhatsApp otomatik cevap','Müşteri WhatsApp\'tan yazınca asistan telefondaki gibi cevaplar; sipariş ve randevu alır.'],['Instagram DM otomatik cevap','Instagram\'dan gelen mesajlara asistan cevap verir, fiyat söyler, randevu yazar.']]],
 ['Otomatik mesajlar',[['Sipariş ve randevu onay SMS\'i','"Siparişiniz alındı" / "randevunuz oluşturuldu" mesajı müşteriye otomatik gider. Ayarlar > Müşteriye mesajlar.','hazir'],['Randevu hatırlatma (SMS veya arama)','Yarınki randevular için akşam hatırlatma. Ayarlar > Randevu hatırlatma.','hazir'],['Sipariş reddi bildirimi','Siparişi reddettiğinizde müşteriye SMS ile haber verilir.','hazir'],['"Siparişiniz yolda" takip linki','Kurye yola çıkınca müşteriye canlı takip linki gider (Dinlio Go ile).'],['Bekleme listesi bildirimi','Dolu randevuda iptal olunca sıradaki müşteriye haber verilir.']]],
 ['Müşteri ilişkisi',[['Google yorum isteme','Randevu veya siparişten sonra memnun müşteriye yorum linki gider.'],['Kampanya mesajı','İzin veren (İYS) müşterilere kampanya duyurusu.']]]];
export default function Mesajlasma({sb,bid}){
 const [m,setM]=useState(null);
 useEffect(()=>{sb.from('mesajlar').select('id,yon,kisi,metin,created_at').eq('business_id',bid).order('created_at',{ascending:false}).limit(50).then(({data})=>setM(data||[]));},[bid]);
 return <>
  {LISTE.map(([baslik,l])=><div className="card sec2" key={baslik}><h2>{baslik}</h2>
   <div style={{display:'grid',gap:10,marginTop:8}}>{l.map(([ad,ac,du])=><div key={ad} className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
    <div><b>{ad}</b><p className="mut" style={{margin:'2px 0 0'}}>{ac}</p></div><span className="tag" style={{whiteSpace:'nowrap'}}>{du==='hazir'?'SMS hattı bekleniyor':'Yakında'}</span></div>)}</div></div>)}
  {m&&m.length>0&&<div className="card sec2"><h2>Gelen mesajlar</h2><table><thead><tr><th>Tarih</th><th>Kimden</th><th>Mesaj</th></tr></thead><tbody>
   {m.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td>{x.kisi}</td><td>{x.metin}</td></tr>)}</tbody></table></div>}</>;}
