import {createClient} from '@supabase/supabase-js';
export const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_KEY);
export const live=(name,table,filter,cb)=>{const ch=sb.channel(name+Math.random()).on('postgres_changes',{event:'*',schema:'public',table,...(filter?{filter}:{})},cb).subscribe();return()=>sb.removeChannel(ch);};
