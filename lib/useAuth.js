'use client';
import {useEffect,useState} from 'react';import {sb} from './supabase';
export function useUser(){const [u,setU]=useState(undefined);useEffect(()=>{sb.auth.getSession().then(({data})=>setU(data.session?.user||null));const {data}=sb.auth.onAuthStateChange((_,s)=>setU(s?.user||null));return()=>data.subscription.unsubscribe();},[]);return u;}
export const usedSec=b=>b.quota_seconds_used||0;
export const fmt=s=>Math.floor((s||0)/60)+':'+String((s||0)%60).padStart(2,'0');
