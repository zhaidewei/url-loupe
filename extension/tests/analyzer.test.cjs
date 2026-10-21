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
 assert.ok(context.HostLensAnalysis.inspect('https://Inkd.in').displayTokens.find(t=>t.char==='I').similar);
 assert.equal(data.nonAsciiCount,0);
 assert.equal(context.HostLensAnalysis.inspect('https://lnkd.in').displayTokens.filter(t=>t.similar).length,0);
});
test('Cyrillic hostname highlighted after Punycode decoding',()=>{
 const url=new URL('https://аррӏе.com');const data=analyze(url.href);
 assert.equal(data.unicodeHost,'аррӏе.com');
 assert.equal(data.unicodeHost,domainToUnicode(url.hostname));
 assert.equal(data.tokens.filter(t=>t.nonAscii).length,5);
 assert.ok(context.HostLensAnalysis.inspect(url.href).displayTokens.slice(0,5).every(t=>t.similar));
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
test('unrelated ASCII combinations have no generic highlights',()=>{
 const data=context.HostLensAnalysis.inspect('https://rnvv.test');assert.equal(data.displayTokens.filter(t=>t.similar).length,0);
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
test('saved-host matching is exact and does not hide original non-ASCII input',()=>{
 const inspect=context.HostLensAnalysis.inspect;
 for(const host of ['chatgpt.com','CHATGPT.COM.','amazon.com','lnkd.in','www.google.com']){const result=inspect('https://'+host+'/path');assert.equal(result.comparison.knownHostMatch,true,host);assert.equal(result.displayTokens.filter(t=>t.similar).length,0,host);}
 for(const host of ['chatgpt.com.attacker.test','chatgpt.test','new.chatgpt.com','new.www.google.com','chatgpt.com@attacker.test'])assert.ok(!inspect('https://'+host).comparison.knownHostMatch,host);
 const fullwidth=inspect('https://ｃhatgpt.com');assert.equal(fullwidth.comparison.knownHostMatch,true);assert.ok(fullwidth.displayTokens.some(t=>t.char==='ｃ'&&t.nonAscii));
 const cyrillic=inspect('https://сhatgpt.com');assert.ok(!cyrillic.comparison.knownHostMatch);assert.ok(cyrillic.nonAsciiCount>0);
 assert.equal(context.HOST_LENS_KNOWN_HOSTS.length,6890);
});
test('shared website explanation highlights only actual brand differences',()=>{
 const inspect=context.HostLensAnalysis.inspect;
 const unknown=inspect('https://zhaidewei.com');assert.equal(unknown.displayTokens.filter(t=>t.similar).length,0);
 const amazon=inspect('https://arnazon.test');assert.deepEqual(Array.from(amazon.displayTokens.filter(t=>t.similar),t=>t.char),Array.from('rn.test'));assert.ok(amazon.comparison.matches.some(m=>m.host==='amazon.com'));
 const known=inspect('https://chatgpt.com');assert.equal(known.displayTokens.filter(t=>t.similar).length,0);assert.equal(known.comparison.knownHostMatch,true);
 const unicode=inspect('https://例子.test');assert.equal(unicode.displayTokens.filter(t=>t.nonAscii).length,2);
});
