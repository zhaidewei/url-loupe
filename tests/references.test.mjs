import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import '../public/vendor/punycode.js';import '../public/vendor/confusables.js';import '../public/analyzer.js';
import {createIndex,compare} from '../src/engine.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));const hosts=read('../public/known-hosts.json');const crux=read('../data/crux/202609/hosts.json');const source=read('../data/crux/202609/source.json');
test('CrUX Top 5000 includes both disjoint buckets and checksum-bound domain-only data',()=>{
 assert.deepEqual(source.files.map(f=>f.count),[1000,4000]);assert.equal(source.originCount,5000);assert.equal(source.snapshot,'202609');assert.equal(source.license,'CC-BY-4.0');assert.equal(source.mirror.directGoogleExport,false);assert.equal(source.crossCheck.hostSetsEqual,true);
 for(const f of source.files){const b=fs.readFileSync(new URL('../data/crux/202609/'+f.file,import.meta.url));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../data/crux/202609/hosts.json',import.meta.url))).digest('hex'),source.hostsSha256);
 assert.equal(new Set(crux).size,4998);assert.ok(crux.includes('www.google.com'));assert.ok(crux.includes('github.com'));
});
test('merged runtime references contain exactly the deduplicated old plus CrUX host union',()=>{
 const companies=read('../public/companies.json').companies,aliases=read('../public/brand-aliases.json').brands;
 const old=[...companies,...aliases].flatMap(c=>c.domains).map(h=>new URL('https://'+h).hostname.toLowerCase().replace(/\.$/,''));
 assert.deepEqual(hosts,[...new Set([...old,...crux])].sort());assert.equal(hosts.length,6890);assert.ok(hosts.every(h=>typeof h==='string'&&h===new URL('https://'+h).hostname));
 const known=createIndex([],hosts);for(const h of ['www.google.com','github.com']){const result=compare(HostLens.analyze(h),known);assert.equal(result.knownHostMatch,true);assert.equal(result.matches.length,0);}
 for(const h of ['www.google.com.attacker.test','new.www.google.com'])assert.ok(!compare(HostLens.analyze(h),known).knownHostMatch);
});
test('runtime company projection preserves brand comparison without source snapshot payloads',()=>{
 const full=[...read('../public/companies.json').companies,...read('../public/brand-aliases.json').brands];const runtime=read('../data/runtime-references.json');
 assert.equal(runtime.companies.length,full.length);assert.equal(runtime.metadata.companyCount,671);
 const original=createIndex(full,hosts),projected=createIndex(runtime.companies,hosts);
 for(const value of ['Inkd.in','arnazon.test','аррӏе.test','amazon.com.attacker.test','amazon.co.uk','www.google.com','unknown-clean.test']){
  const data=HostLens.analyze(value);const brief=idx=>{const r=compare(data,idx);return {known:r.knownHostMatch,matches:r.matches.map(m=>[m.company.id,m.host,m.kind]),references:r.references.map(m=>[m.company.id,m.host])};};assert.deepEqual(brief(projected),brief(original),value);
 }
 assert.ok(runtime.companies.every(c=>!('websites'in c)&&!('listingStatements'in c)));
});
