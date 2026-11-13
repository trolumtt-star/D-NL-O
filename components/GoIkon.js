// Dinlio Go çizimleri (inline SVG, ek dosya yok)
export const Motor=({s=44,kutu=true})=><svg width={s} height={s*0.7} viewBox="0 0 64 44" fill="none" aria-hidden="true">
 {kutu&&<rect x="3" y="9" width="17" height="14" rx="3.5" fill="#FF1F3D"/>}
 {kutu&&<path d="M6 16h11" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round"/>}
 <circle cx="14" cy="34" r="7" stroke="currentColor" strokeWidth="3.6"/><circle cx="50" cy="34" r="7" stroke="currentColor" strokeWidth="3.6"/>
 <path d="M14 34h15l7-13h9l5 13" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M22 25h11" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"/>
 <path d="M45 21l-3-9h-6" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
export const Konfeti=({n=26})=>{const r=['#FF1F3D','#ffffff','#2ee66b','#ff8a9a','#ffd23f'];
 return <div className="go-konf" aria-hidden="true">{Array.from({length:n},(_,i)=>{const a=(i/n)*Math.PI*2,d=110+((i*37)%90);
  return <i key={i} style={{'--x':Math.cos(a)*d+'px','--y':Math.sin(a)*d-40+'px','--r':((i*71)%360)+'deg','--c':r[i%r.length],animationDelay:(i%5)*30+'ms'}}/>;})}</div>;};
