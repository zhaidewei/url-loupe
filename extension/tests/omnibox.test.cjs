const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.join(__dirname,'..');
function setup(){
 const calls=[];const listeners={};const event=name=>({addListener:fn=>listeners[name]=fn});
 const context=vm.createContext({URL,console,chrome:{
  runtime:{getURL:file=>'chrome-extension://test/'+file},
  tabs:{update:async value=>calls.push(['update',value]),create:async value=>calls.push(['create',value])},
  omnibox:{setDefaultSuggestion:value=>calls.push(['default',value]),onInputStarted:event('started'),onInputChanged:event('changed'),onInputEntered:event('entered')}
 }});
 context.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context));
 context.importScripts('background.js');return {context,calls,listeners};
}
test('ASCII I remains visibly marked and never called Unicode',()=>{
 const {context}=setup();const result=context.HostLensOmnibox.describe('https://Inkd.test/a');
 assert.ok(result.description.includes('<match>I</match>'));assert.ok(result.description.includes('非 ASCII 0'));
 assert.equal(result.host,'Inkd.test');
});
test('Punycode entry exposes decoded Cyrillic in suggestions',()=>{
 const {context}=setup();const result=context.HostLensOmnibox.describe(new URL('https://аррӏе.test').href);
 assert.ok(result.description.includes('<match>а</match>'));assert.ok(result.description.includes('非 ASCII 5'));
 assert.equal(result.suggestions.length,5);
});
test('suggestions contain host only and XML metacharacters are escaped',()=>{
 const {context}=setup();const secret='https://user:secret@example.test/private?token=secret';
 const result=context.HostLensOmnibox.describe(secret);assert.ok(!JSON.stringify(result).includes('secret'));
 const escaped=context.HostLensOmnibox.describe('https://a&b.test');
 assert.ok(escaped.description.includes('&amp;'));assert.ok(!escaped.description.includes('a&b'));
});
test('input events update default and detail suggestions',()=>{
 const {listeners,calls}=setup();listeners.started();let suggestions;
 listeners.changed('https://аpple.test',value=>suggestions=value);
 assert.equal(calls.filter(c=>c[0]==='default').length,2);assert.ok(suggestions.length>0);
});
test('enter opens local review; respects all three dispositions',async()=>{
 const {context,calls}=setup();
 for(const disposition of ['currentTab','newForegroundTab','newBackgroundTab'])await context.openHostReview('https://user:secret@Inkd.test/private',disposition);
 assert.equal(calls[0][0],'update');assert.equal(calls[1][1].active,true);assert.equal(calls[2][1].active,false);
 for(const [,args]of calls){assert.equal(args.url,'chrome-extension://test/popup.html#host=Inkd.test');assert.ok(!args.url.includes('secret'));}
});
test('invalid and empty input never navigate to the supplied address',async()=>{
 const {context,calls}=setup();
 for(const value of ['', 'javascript:alert(1)', '<script>']){
  assert.equal(context.HostLensOmnibox.describe(value).suggestions.length,0);
  await context.openHostReview(value,'currentTab');
 }
 assert.ok(calls.every(([,args])=>args.url==='chrome-extension://test/popup.html#invalid=1'));
});
test('all non-ASCII scripts warn independently of confusable mappings',()=>{
 const {context}=setup();
 for(const host of ['bücher.test','παράδειγμα.test','مثال.test','उदाहरण.test','例子.test','例え.test','예시.test','😀.test','ｅxample.test']){
  const input='https://'+host;
  const data=context.HostLens.analyze(input);
  const result=context.HostLensOmnibox.describe(input);
  assert.ok(data.nonAsciiCount>0,host);
  assert.ok(result.description.startsWith('⚠ 含非 ASCII 字符'),host);
  const raw=data.originalTokens || data.tokens;
  for(const token of raw.filter(t=>t.nonAscii))assert.ok(result.description.includes('<match>'+token.char+'</match>'),host+' '+token.char);
  // Browser-normalized fullwidth characters are no longer recoverable from Punycode.
  if(host!=='ｅxample.test')assert.ok(context.HostLensOmnibox.describe(new URL(input).href).description.startsWith('⚠ 含非 ASCII 字符'),host+' Punycode');
 }
 assert.ok(!context.HostLensOmnibox.describe('https://Inkd.test').description.startsWith('⚠'));
});
test('uppercase ACE input still warns about decoded non-ASCII characters',()=>{
 const {context}=setup();const host=new URL('https://例子.test').hostname.toUpperCase();
 const result=context.HostLensOmnibox.describe('https://'+host);
 assert.ok(result.description.startsWith('⚠ 含非 ASCII 字符'));
 assert.ok(result.description.includes('<match>例</match>'));
});
