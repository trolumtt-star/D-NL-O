import {SITE} from '@/lib/site';
export default function robots(){return {rules:[{userAgent:'*',allow:['/','/yasal/','/llms.txt'],disallow:['/admin','/panel','/saha','/kod','/login','/api/']}],sitemap:SITE+'/sitemap.xml',host:SITE};}
