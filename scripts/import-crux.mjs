import fs from 'node:fs';import {execFileSync} from 'node:child_process';import crypto from 'node:crypto';import {isIP} from 'node:net';
const base=new URL('../data/crux/202609/',import.meta.url);
const commit='5493dd425c47fc7895d7d92df688d70638fb2aa7';
const prefix='https://raw.githubusercontent.com/crissyfield/crux-dumps/'+commit+'/2026/09/';
const files=[{file:'1000.txt.xz',rank:1000,count:1000},{file:'5000.txt.xz',rank:5000,count:4000}];
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const refresh=process.argv.includes('--refresh');fs.mkdirSync(base,{recursive:true});
const previous=fs.existsSync(new URL('source.json',base))?JSON.parse(fs.readFileSync(new URL('source.json',base))):null;
const hosts=new Set();let originCount=0;const sources=[];
for(const spec of files){
 const local=new URL(spec.file,base),url=prefix+spec.file;
 if(refresh||!fs.existsSync(local)){const response=await fetch(url);if(!response.ok)throw Error('Download failed '+response.status);fs.writeFileSync(local,Buffer.from(await response.arrayBuffer()));}
 const compressed=fs.readFileSync(local);const hash=sha(compressed);const expected=previous?.files.find(f=>f.file===spec.file)?.sha256;
 if(expected&&expected!==hash)throw Error('Snapshot checksum changed: '+spec.file);
 const text=execFileSync('xz',['-dc',local.pathname],{encoding:'utf8',maxBuffer:4*1024*1024});const rows=text.trim().split(/\r?\n/);
 if(rows.length!==spec.count)throw Error('Unexpected origin count for '+spec.file+': '+rows.length);
 for(const origin of rows){const url=new URL(origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Invalid origin in snapshot');const host=url.hostname.toLowerCase().replace(/\.$/,'');if(isIP(host)||host.startsWith('['))throw Error('Unexpected IP in snapshot');hosts.add(host);originCount++;}
 sources.push({...spec,url,sha256:hash,compressedBytes:compressed.length});
}
if(originCount!==5000)throw Error('Incomplete Top 5000');const sorted=[...hosts].sort();const content=JSON.stringify(sorted)+'\n';fs.writeFileSync(new URL('hosts.json',base),content);
const source={dataset:'Google Chrome UX Report (CrUX)',snapshot:'202609',ranking:'Global origin popularity buckets <= 5000; unordered within buckets',originCount,uniqueHosts:sorted.length,transform:'HTTP(S) origin → URL.hostname → lowercase ASCII/Punycode → remove one trailing dot → exact-host deduplication; retain subdomains',officialDocumentation:'https://developer.chrome.com/docs/crux/bigquery',officialLicense:'https://developer.chrome.com/docs/crux/methodology#license',license:'CC-BY-4.0',attribution:'Google, Chrome UX Report, September 2026. Hostnames extracted and deduplicated by URL Loupe.',mirror:{repository:'https://github.com/crissyfield/crux-dumps',commit,directGoogleExport:false},retrievedAt:'2026-10-21',files:sources,hostsSha256:sha(content),crossCheck:previous?.hostsSha256===sha(content)?previous.crossCheck:undefined};
fs.writeFileSync(new URL('source.json',base),JSON.stringify(source,null,2)+'\n');console.log(JSON.stringify({snapshot:source.snapshot,originCount,uniqueHosts:sorted.length}));
