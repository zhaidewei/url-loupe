import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import '../public/vendor/punycode.js';import '../public/vendor/confusables.js';import '../public/analyzer.js';
import {skeleton,createIndex,compare,domainParts,distance,diffParts} from '../src/engine.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/companies.json',import.meta.url)));
const index=createIndex(data.companies);
test('reference dataset has 500–1000 unique companies and attributable domains',()=>{
 assert.ok(data.companies.length>=500&&data.companies.length<=1000);assert.equal(new Set(data.companies.map(c=>c.id)).size,data.companies.length);
 for(const c of data.companies){assert.match(c.id,/^Q\d+$/);assert.ok(c.domains.length>0);assert.ok(c.sourceUrl.startsWith('https://www.wikidata.org/wiki/'));}
 assert.equal(new Set(data.companies.flatMap(c=>c.domains)).size,data.metadata.domainCount);
});
test('rn and m skeletons match; source text remains intact',()=>{
 assert.equal(skeleton('arnazon'),skeleton('amazon'));
 const found=compare(HostLens.analyze('https://arnazon.test'),index).matches;
 assert.ok(found.some(m=>m.company.id==='Q3884'&&m.kind==='visual'));
 assert.deepEqual(diffParts('arnazon','amazon'),{input:{before:'a',change:'rn',after:'azon'},reference:{before:'a',change:'m',after:'azon'}});
});
test('Cyrillic apple and uppercase I expose confusable brand candidates',()=>{
 const matches=compare(HostLens.analyze('https://аррӏе.test'),index).matches;
 assert.ok(matches.some(m=>m.company.id==='Q312'));
 const own=createIndex([{id:'link',domains:['lnkd.in'],name:'test'}]);
 assert.equal(compare(HostLens.analyze('https://Inkd.in'),own).matches[0].kind,'visual');
});
test('known brand root with ordinary subdomain is a reference, not impersonation',()=>{
 const result=compare(HostLens.analyze('https://www.amazon.com/a'),index);assert.equal(result.matches.length,0);assert.ok(result.references.some(r=>r.company.id==='Q3884'));
});
test('PSL handles co.uk and tenant domains; deceptive subdomains are not trusted',()=>{
 assert.equal(domainParts('a.amazon.co.uk').domain,'amazon.co.uk');
 assert.equal(domainParts('amazon.github.io').domain,'amazon.github.io');
 const result=compare(HostLens.analyze('https://amazon.com.attacker.test'),index);assert.equal(result.references.length,0);assert.ok(result.matches.some(m=>m.kind==='subdomain'));
});
test('non-ASCII across scripts flags host only; query and userinfo excluded',()=>{
 for(const h of ['例子.test','bücher.test','مثال.test','예시.test','😀.test'])assert.ok(HostLens.analyze('https://'+h).nonAsciiCount>0);
 assert.equal(HostLens.analyze('https://person@amazon.com/中文?x=а').nonAsciiCount,0);
 assert.ok(!JSON.stringify(compare(HostLens.analyze('https://secret:password@amazon.com/'),index)).includes('password'));
});
test('edit distance is bounded and recognizes a one-letter typo',()=>{assert.equal(distance('amazon','amzon'),1);assert.equal(distance('amazon','amazon'),0);assert.ok(distance('a','abcdef')>2);});
