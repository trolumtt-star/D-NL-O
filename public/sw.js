// Dinlio AI bildirim servisi: panel kapalıyken gelen bildirimleri gösterir, tıklanınca paneli açar.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
 let d={};try{d=e.data?e.data.json():{};}catch{d={title:'Dinlio AI',body:e.data?e.data.text():''};}
 e.waitUntil(self.registration.showNotification(d.title||'Dinlio AI',{body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',tag:d.tag||undefined,renotify:!!d.tag,vibrate:[120,60,120],data:{url:d.url||'/panel'}}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();const url=e.notification.data?.url||'/panel';
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
  for(const c of l){if(new URL(c.url).pathname.startsWith('/panel')&&'focus' in c)return c.focus();}
  return self.clients.openWindow(url);}));
});
