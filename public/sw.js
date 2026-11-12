// Dinlio AI bildirim servisi: panel kapalıyken gelen bildirimleri gösterir, tıklanınca paneli açar.
// Yeni sipariş bildiriminde Onayla / Reddet tuşları vardır; panel açmadan siparişi işler.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
 let d={};try{d=e.data?e.data.json():{};}catch{d={title:'Dinlio AI',body:e.data?e.data.text():''};}
 const o={body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',tag:d.tag||undefined,renotify:!!d.tag,vibrate:[120,60,120],data:{url:d.url||'/panel',onay:d.onay||null}};
 if(d.onay){o.actions=[{action:'onay',title:'✅ Onayla'},{action:'red',title:'❌ Reddet'}];o.requireInteraction=true;}
 e.waitUntil(self.registration.showNotification(d.title||'Dinlio AI',o));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();const v=e.notification.data||{},url=v.url||'/panel';
 if((e.action==='onay'||e.action==='red')&&v.onay){
  e.waitUntil(fetch('/api/onay',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...v.onay,a:e.action})})
   .then(r=>r.json()).then(j=>self.registration.showNotification('Dinlio AI',{body:j.mesaj||j.error||'Tamam',icon:'/icon-192.png',tag:'onay-sonuc'}))
   .catch(()=>self.registration.showNotification('Dinlio AI',{body:'İşlem yapılamadı, paneli açın.',icon:'/icon-192.png',data:{url}})));
  return;}
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
  const hedef=url.startsWith('/go')?'/go':'/panel';
  for(const c of l){if(new URL(c.url).pathname.startsWith(hedef)&&'focus' in c)return c.focus();}
  return self.clients.openWindow(url);}));
});
