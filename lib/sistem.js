// Sistem geneli ayarlar (admin panelinden değişir). KDV açık/kapalı burada.
import {adminSb} from './admin';
let onbellek={t:0,v:null};
export async function kdvOrani(){if(Date.now()-onbellek.t<30000&&onbellek.v!==null)return onbellek.v;
 let v=0.20;try{const {data}=await adminSb.from('sistem_ayarlari').select('deger').eq('anahtar','kdv').maybeSingle();if(data?.deger)v=data.deger.acik===false?0:(+data.deger.oran||0.20);}catch{}
 onbellek={t:Date.now(),v};return v;}
export const kdvSifirla=()=>{onbellek={t:0,v:null};};
