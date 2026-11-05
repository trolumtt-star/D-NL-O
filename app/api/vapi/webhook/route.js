import {adminSb} from '@/lib/admin';import {resolve} from '@/lib/resolve';import {extract,extractGeneric} from '@/lib/gemini';import {createVapiHandler} from '@/lib/vapiWebhook.mjs';
export const maxDuration=60;
export const POST=createVapiHandler({adminSb,resolve,extract,extractGeneric});
