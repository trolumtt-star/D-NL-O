'use client';
export default function Shell({brand,sub,items,tab,setTab,onLogout,badge={},children}){
 return <div className="shell"><aside className="side"><div className="brand"><b>{brand}</b><small>{sub}</small></div>
 <nav>{items.map(([k,l,ic])=><button key={k} className={'ni'+(tab===k?' on':'')} onClick={()=>setTab(k)}><i>{ic}</i><span>{l}</span>{badge[k]>0&&<em>{badge[k]}</em>}</button>)}</nav>
 <button className="ni" onClick={onLogout}><i>⎋</i><span>Çıkış</span></button></aside><main className="main">{children}</main></div>;}
export const H=({t,s})=><div style={{marginBottom:20}}><h1 className="ph">{t}</h1>{s&&<p className="mut" style={{marginTop:4}}>{s}</p>}</div>;
