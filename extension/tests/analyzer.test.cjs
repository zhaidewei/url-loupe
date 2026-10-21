const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {domainToUnicode}=require('node:url');
const root=path.join(__dirname,'..');
const context=vm.createContext({URL});
for(const name of ['vendor/punycode.js','vendor/confusables.js','known-hosts.js','analyzer.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
const analyze=context.HostLens.analyze;
test('LinkedIn ASCII ambiguity survives URL lowercasing',()=>{
 const data=analyze('https://Inkd.in/enHTuknJ');
 assert.equal(data.asciiHost,'inkd.in');
 assert.equal(data.originalHost,'Inkd.in');
 assert.ok(data.originalTokens.find(t=>t.char==='I').similar);
 assert.equal(data.nonAsciiCount,0);
 assert.equal(analyze('https://lnkd.in').similarCount,0);
});
test('Cyrillic hostname highlighted after Punycode decoding',()=>{
 const url=new URL('https://аррӏе.com');const data=analyze(url.href);
 assert.equal(data.unicodeHost,'аррӏе.com');
 assert.equal(data.unicodeHost,domainToUnicode(url.hostname));
 assert.equal(data.tokens.filter(t=>t.nonAscii).length,5);
 assert.ok(data.tokens.slice(0,5).every(t=>t.similar));
 assert.ok(data.asciiHost.startsWith('xn--'));
});
test('legitimate Chinese is non ASCII without maliciousness verdict',()=>{
 const data=analyze('https://例子.测试/路径');
 assert.equal(data.tokens.filter(t=>t.nonAscii).length,4);
 assert.ok(!('malicious' in data));
});
test('userinfo, path, query, fragment and port are not host characters',()=>{
 const data=analyze('https://name:password@safe.test:8443/аррӏе?x=中文#I');
 assert.equal(data.unicodeHost,'safe.test');assert.equal(data.nonAsciiCount,0);
 assert.equal(data.hasCredentials,true);assert.ok(!JSON.stringify(data).includes('password'));
});
test('raw fullwidth input preserved while canonical host normalized',()=>{
 const data=analyze('https://ｅxample.com');
 assert.equal(data.asciiHost,'example.com');
 assert.equal(data.originalTokens[0].char,'ｅ');assert.ok(data.originalTokens[0].nonAscii);
});
test('sequence hints and clean punctuation',()=>{
 const data=analyze('https://rnvv.test');
 assert.ok(data.tokens.slice(0,4).every(t=>t.similar));
 assert.equal(data.tokens.find(t=>t.char==='.').similar,false);
});
test('relative and protocol-relative links resolve to actual host',()=>{
 assert.equal(analyze('/路径?x=а','https://example.com/base').asciiHost,'example.com');
 assert.equal(analyze('//аррӏе.com/a','https://example.com').unicodeHost,'аррӏе.com');
});
test('invalid and non-web inputs rejected',()=>{
 for(const input of ['','https://','javascript:alert(1)','data:text/html,test','https://xn--.com'])assert.throws(()=>analyze(input));
 assert.throws(()=>analyze('javascript:alert(1)','https://example.com'));
});
test('IP addresses and emoji parse consistently with Node URL',()=>{
 for(const input of ['https://[::1]:8080/a','https://127.0.0.1','https://😀.example','https://bücher.de']){
  const data=analyze(input);const host=new URL(input).hostname;
  assert.equal(data.asciiHost,host);assert.equal(data.unicodeHost,host.startsWith('[')?host:domainToUnicode(host));
 }
});
test('saved hosts suppress ASCII hints only on exact normalized matches',()=>{
 for(const host of ['chatgpt.com','CHATGPT.COM.','amazon.com','lnkd.in']){const result=analyze('https://'+host+'/path');assert.ok(result.knownReference,host);assert.equal(result.similarCount,0,host);assert.equal(result.nonAsciiCount,0,host);}
 for(const host of ['chatgpt.com.attacker.test','chatgpt.test','notchatgpt.com','new.chatgpt.com','chatgpt.com.evil.test']){const result=analyze('https://'+host);assert.equal(result.knownReference,null,host);assert.ok(result.similarCount>0,host);}
 assert.equal(analyze('https://chatgpt.com@attacker.test').knownReference,null);
});
test('known normalized host still preserves non-ASCII in original input',()=>{
 const result=analyze('https://ｃhatgpt.com');assert.ok(result.knownReference);assert.ok(result.nonAsciiCount>0);assert.ok(result.originalTokens.some(t=>t.char==='ｃ'&&t.nonAscii));assert.equal(result.tokens.filter(t=>t.similar).length,0);
 const puny=analyze('https://сhatgpt.com');assert.equal(puny.knownReference,null);assert.ok(puny.nonAsciiCount>0);
});
test('CrUX domain-only references suppress ASCII hints without exempting unknown subdomains',()=>{
 assert.ok(Array.isArray(context.HOST_LENS_KNOWN_HOSTS));assert.equal(context.HOST_LENS_KNOWN_HOSTS.length,6890);
 const google=analyze('https://www.google.com');assert.ok(google.knownReference);assert.equal(google.similarCount,0);
 assert.equal(analyze('https://www.google.com.attacker.test').knownReference,null);
 assert.equal(analyze('https://new.www.google.com').knownReference,null);
});
