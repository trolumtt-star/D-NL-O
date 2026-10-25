import {createClient} from '@supabase/supabase-js';
export const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://missing.supabase.co',process.env.NEXT_PUBLIC_SUPABASE_KEY||'missing');
export const live=(name,table,filter,cb)=>{const ch=sb.channel(name+Math.random()).on('postgres_changes',{event:'*',schema:'public',table,...(filter?{filter}:{})},cb).subscribe();return()=>sb.removeChannel(ch);};
