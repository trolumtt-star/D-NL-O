'use client';
import {useEffect,useState} from 'react';import {sb} from './supabase';
// İki adımlı doğrulaması açık hesap kod girmeden (aal1) panele giremez: girişe geri gönderilir.
export function useUser(){const [u,setU]=useState(undefined);useEffect(()=>{sb.auth.getSession().then(async({data})=>{if(data.session){const {data:al}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(al&&al.nextLevel==='aal2'&&al.currentLevel!=='aal2'){location.replace('/login');return;}}setU(data.session?.user||null);});const {data}=sb.auth.onAuthStateChange((_,s)=>setU(s?.user||null));return()=>data.subscription.unsubscribe();},[]);return u;}
export const usedSec=b=>b.quota_seconds_used||0;
export const fmt=s=>Math.floor((s||0)/60)+':'+String((s||0)%60).padStart(2,'0');
