'use client';
import {useEffect} from 'react';
export default function Guard(){useEffect(()=>{(function(){var ed=function(t){return t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"]')};
document.addEventListener('contextmenu',function(e){if(!ed(e.target))e.preventDefault()},true);
document.addEventListener('keydown',function(e){var k=(e.key||'').toLowerCase(),c=e.ctrlKey||e.metaKey;
if(e.key==='F12'||(c&&(e.shiftKey||e.altKey)&&(k==='i'||k==='j'||k==='c'))||(c&&(k==='u'||k==='s'))){e.preventDefault();e.stopPropagation();}},true);
document.addEventListener('dragstart',function(e){if(e.target&&e.target.tagName==='IMG')e.preventDefault()},true);
try{console.log('%cDUR!','color:#FF1F3D;font:900 48px sans-serif');console.log('%cBu alan geliştiriciler içindir. Biri size buraya bir şey yapıştırmanızı söylediyse bu bir dolandırıcılıktır ve hesabınızı ele geçirmeye çalışıyordur.','font:16px sans-serif');}catch(_){}})();},[]);return null;}
