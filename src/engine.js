import {parse} from 'tldts';
export function skeleton(value, map=globalThis.HOST_CONFUSABLES){
  return Array.from(value.normalize('NFD'),c=>map[c]??c).join('').normalize('NFD').toLowerCase().replace(/[il1|]/g,'l');
}
export function domainParts(host){
 const value=host.replace(/\.$/,'');
 const parts=parse(value,{allowPrivateDomains:true});
 return {host:value,domain:parts.domain||value,label:parts.domainWithoutSuffix||value,suffix:parts.publicSuffix||'',ip:parts.isIp};
}
export function distance(a,b,max=2){
 const aa=Array.from(a),bb=Array.from(b);if(Math.abs(aa.length-bb.length)>max)return max+1;
 let prev=bb.map((_,i)=>i);prev.push(bb.length);
 for(let i=1;i<=aa.length;i++){const row=[i];for(let j=1;j<=bb.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(aa[i-1]===bb[j-1]?0:1));prev=row;}
 return prev[bb.length];
}
export function createIndex(companies,knownHosts=[]){
 const records=[];const exact=new Map();
 for(const company of companies)for(const host of company.domains){
  let url;try{url=new URL('https://'+host);}catch{continue;}
  const parts=domainParts(url.hostname);if(parts.ip)continue;
  const label=globalThis.HostPunycode.toUnicode(parts.label);
  const record={company,host:parts.host,domain:parts.domain,label,shape:skeleton(label)};
  records.push(record);if(!exact.has(parts.domain))exact.set(parts.domain,[]);exact.get(parts.domain).push(record);
 }
 return {records,exact,knownHosts:new Set(knownHosts),companyCount:companies.length};
}
export function compare(data,index){
 const input=domainParts(data.asciiHost);if(input.ip)return {matches:[],references:[]};
 const references=index.exact.get(input.domain)||[];
 if(index.knownHosts?.has(input.host.toLowerCase()))return {matches:[],references,knownHostMatch:true};
 if(references.length)return {matches:[],references};
 const label=globalThis.HostPunycode.toUnicode(input.label);
 let originalLabel=label;
 try{const parts=domainParts(data.originalHost);if(parts.label)originalLabel=parts.label;}catch{}
 const shapes=new Set([skeleton(label),skeleton(originalLabel)]);
 const best=new Map();
 for(const record of index.records){
  let kind=null,rank=0,reason='';
  if(label.toLowerCase()===record.label.toLowerCase()){kind='suffix';rank=3;reason='名称相同，但实际域名后缀不同';}
  else if(shapes.has(record.shape)){kind='visual';rank=3;reason='参考视觉形式相同，可能通过相似字符或字符组合仿冒';}
  else if(data.asciiHost.includes(record.domain+'.')){kind='subdomain';rank=3;reason='参考域名出现在子域中，实际注册域名属于另一地址';}
  else if(label.length>=5 && record.label.length>=5){
   const d=distance(label.toLowerCase(),record.label.toLowerCase());
   if(d===1 && Math.max(label.length,record.label.length)>=6){kind='spelling';rank=1;reason='名称相差一个字符，仅供人工核对';}
  }
  if(!kind)continue;
  const previous=best.get(record.company.id);
  if(!previous||rank>previous.rank||(rank===previous.rank&&record.domain.endsWith('.com')&&!previous.domain.endsWith('.com')))best.set(record.company.id,{...record,kind,rank,reason,inputLabel:label});
 }
 return {references:[],matches:[...best.values()].sort((a,b)=>b.rank-a.rank || (b.company.sitelinks||0)-(a.company.sitelinks||0)).slice(0,3)};
}
export function diffParts(input,reference){
 const a=Array.from(input),b=Array.from(reference);let start=0;
 while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 let endA=a.length,endB=b.length;
 while(endA>start&&endB>start&&a[endA-1]===b[endB-1]){endA--;endB--;}
 return {input:{before:a.slice(0,start).join(''),change:a.slice(start,endA).join(''),after:a.slice(endA).join('')},reference:{before:b.slice(0,start).join(''),change:b.slice(start,endB).join(''),after:b.slice(endB).join('')}};
}
