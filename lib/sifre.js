// GÜÇLÜ ŞİFRE KURALI (hem tarayıcıda hem sunucuda aynı): en az 10 karakter, büyük harf, küçük harf, rakam, sembol;
// çok bilinen şifreler ve kişinin kendi e-postası/adı içeren şifreler reddedilir.
const YAYGIN=['password','sifre','şifre','parola','qwerty','asdf','123456','12345678','123456789','1234567890','111111','abc123','iloveyou','admin','welcome','galatasaray','fenerbahce','fenerbahçe','besiktas','beşiktaş','trabzonspor','turkiye','türkiye','istanbul','ankara','dinlio','sevgilim','aşkım','askim','canim','canım'];
const kucuk=s=>String(s||'').toLocaleLowerCase('tr-TR');
export function sifreKontrol(pw,{eposta='',ad=''}={}){pw=String(pw||'');const k=kucuk(pw);
 const kisisel=[kucuk(eposta).split('@')[0],...kucuk(ad).split(/\s+/)].filter(x=>x&&x.length>=4);
 const kurallar=[
  {ok:pw.length>=10,m:'En az 10 karakter'},
  {ok:/[a-zçğıöşü]/.test(pw),m:'Küçük harf'},
  {ok:/[A-ZÇĞİÖŞÜ]/.test(pw),m:'Büyük harf'},
  {ok:/\d/.test(pw),m:'Rakam'},
  {ok:/[^A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(pw),m:'Sembol (! ? . * - _ @ # gibi)'},
  {ok:!!pw&&!YAYGIN.some(w=>k.includes(w))&&!/(.)\1{3,}/.test(pw)&&!/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(pw),m:'Tahmin edilmesi kolay kelime ya da sıra içermesin'},
  {ok:!!pw&&!kisisel.some(w=>k.includes(w)),m:'Adını veya e-postanı içermesin'}];
 const gecen=kurallar.filter(x=>x.ok).length,uzunBonus=pw.length>=14?1:0;
 const puan=Math.min(4,Math.max(0,Math.round((gecen/kurallar.length)*4)-(gecen<kurallar.length?1:0)+uzunBonus));
 return {gecerli:gecen===kurallar.length,puan,kurallar,hata:gecen===kurallar.length?null:'Şifre yeterince güçlü değil: '+kurallar.filter(x=>!x.ok).map(x=>x.m.toLocaleLowerCase('tr-TR')).join(', ')+'.'};}
