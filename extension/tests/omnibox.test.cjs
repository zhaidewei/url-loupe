const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.join(__dirname,'..');
function setup(){
 const calls=[];const listeners={};const event=name=>({addListener:fn=>listeners[name]=fn});
 const context=vm.createContext({URL,console,crypto:require('node:crypto').webcrypto,chrome:{
  runtime:{getURL:file=>'chrome-extension://test/'+file,onInstalled:event('installed'),onMessage:event('message')},
  contextMenus:{removeAll:fn=>{calls.push(['removeAll']);fn();},create:(value,fn)=>{calls.push(['menu',value]);fn();},onClicked:event('clicked')},
  action:{openPopup:async options=>calls.push(['popup',options])},
  tabs:{onRemoved:event('removed'),update:async value=>calls.push(['update',value]),create:async value=>calls.push(['create',value])},
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
 for(const [,args]of calls){assert.equal(args.url.split('&review=')[0],'chrome-extension://test/popup.html#host=Inkd.test');assert.ok(!args.url.includes('secret'));}
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
test('install/update creates one magnifier menu for links, selections and pages',()=>{
 const {listeners,calls}=setup();listeners.installed();listeners.installed();
 assert.deepEqual(calls.map(c=>c[0]),['removeAll','menu','removeAll','menu']);
 const menu=calls[1][1];assert.equal(menu.id,'url-loupe-inspect');assert.ok(menu.title.includes('URL Loupe'));assert.ok(!menu.title.includes('🔍'));
 assert.deepEqual(Array.from(menu.contexts),['link','selection','page']);
 assert.deepEqual(Array.from(menu.documentUrlPatterns),['http://*/*','https://*/*']);
});
test('right-click opens toolbar popup and hands off target without creating tabs',async()=>{
 const {context,calls,listeners}=setup();const targets=[];
 for(const info of [
  {linkUrl:'https://user:secret@Inkd.test/private',selectionText:'https://lnkd.in',pageUrl:'https://page.test'},
  {selectionText:'https://例子.test/path',pageUrl:'https://page.test'},
  {pageUrl:'https://chatgpt.com/path'},
  {}
 ]){await context.inspectContext({menuItemId:'url-loupe-inspect',...info},{id:7,windowId:2,url:'https://fallback.test/path'});
 let reply;listeners.message({type:'context-review',tabId:7},{url:'chrome-extension://test/popup.html'},r=>reply=r);targets.push(reply.target);}
 assert.deepEqual(targets,['https://user:secret@Inkd.test/private','https://例子.test/path','https://chatgpt.com/path','https://fallback.test/path']);
 assert.ok(calls.every(([kind,args])=>kind==='popup' && args.windowId===2));
});
test('right-click invalid selection and unsafe schemes never open target or fall back to page',async()=>{
 const {context,calls,listeners}=setup();const targets=[];
 for(const info of [{selectionText:'not a URL'},{linkUrl:'javascript:alert(1)'},{selectionText:''}])
  {await context.inspectContext({menuItemId:'url-loupe-inspect',pageUrl:'https://chatgpt.com',...info},{id:7});let r;listeners.message({type:'context-review',tabId:7},{url:'chrome-extension://test/popup.html'},v=>r=v);targets.push(r.target);}
 await context.inspectContext({menuItemId:'other',pageUrl:'https://chatgpt.com'},{});
 assert.equal(calls.length,3);assert.ok(calls.every(([kind])=>kind==='popup'));assert.deepEqual(targets,['not a URL','javascript:alert(1)','']);
});
test('full URL handoff stays in memory, is extension-only and consumed once',async()=>{
 const {context,listeners,calls}=setup();const target='https://example.test/a?x=1#section';
 await context.openHostReview(target,'newForegroundTab');
 const token=new URL(calls[0][1].url).hash.split('&review=')[1];assert.ok(token);
 assert.ok(!calls[0][1].url.includes('x=1'));
 let result;const reply=value=>result=value;
 listeners.message({type:'review-target',token},{url:'https://evil.test'},reply);assert.equal(result,undefined);
 listeners.message({type:'review-target',token},{url:'chrome-extension://test/popup.html#host=example.test'},reply);assert.equal(result.target,target);
 listeners.message({type:'review-target',token},{url:'chrome-extension://test/popup.html'},reply);assert.equal(result.target,null);
});
test('toolbar handoff is isolated by tab, one-shot, removed on close and expires',async()=>{
 const {context,listeners}=setup();
 const take=tabId=>{let value;listeners.message({type:'context-review',tabId},{url:'chrome-extension://test/popup.html'},r=>value=r.target);return value;};
 await context.inspectContext({menuItemId:'url-loupe-inspect',linkUrl:'https://one.test'},{id:1});
 await context.inspectContext({menuItemId:'url-loupe-inspect',linkUrl:'https://two.test'},{id:2});
 assert.equal(take(1),'https://one.test');assert.equal(take(1),null);
 listeners.removed(2);assert.equal(take(2),null);
 await context.inspectContext({menuItemId:'url-loupe-inspect',linkUrl:'https://expired.test'},{id:3});
 vm.runInContext('Date.now=()=>Number.MAX_SAFE_INTEGER',context);assert.equal(take(3),null);
});
