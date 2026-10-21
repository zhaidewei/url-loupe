import {createRequire} from 'node:module';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createApp} from '../server.mjs';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {server}=await createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;let browser;
try{
 browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
 await page.goto(origin);await page.waitForFunction(()=>document.documentElement.lang==='en');assert.equal(await page.locator('.loupe-logo').count(),1);await page.waitForFunction(()=>document.getElementById('dataset-status').textContent.includes('ready'));await page.locator('#url').fill('https://www.google.com');await page.waitForFunction(()=>document.querySelector('#brands').textContent.includes('Matches a saved hostname'));assert.equal(await page.locator('#characters .similar').count(),0);await page.locator('#url').fill('https://arnazon.test');await page.waitForFunction(()=>document.querySelector('#brands')?.textContent.includes('Possible lookalike'));assert.equal(/[\u3400-\u9fff]/.test(await page.locator('#brands').textContent()),false);await page.locator('#url').fill('https://example.test/关于?x=参考');await page.waitForFunction(()=>document.getElementById('characters').textContent.includes('/关于?x=参考'));assert.ok((await page.locator('#characters').textContent()).includes('/关于?x=参考'));await page.locator('#url').fill('https://关于.test');await page.waitForFunction(()=>document.querySelector('#brands h2')?.textContent==='Non-ASCII characters: 关于');await page.locator('#url').fill('https://inkd.in');await page.waitForFunction(()=>document.querySelector('#brands')?.textContent.includes('Possible lookalike'));await page.screenshot({path:path.join(root,'..','url-loupe.png')});await page.locator('#clear').click();await page.locator('#language').click();await page.waitForFunction(()=>document.getElementById('dataset-status').textContent.includes('已就绪'));
 assert.equal(await page.locator('#report').count(),0);
 assert.equal(await page.locator('#coverage').getAttribute('open'),null);
 assert.equal(await page.locator('#explanation').isVisible(),false);
 const count=Number((await page.locator('#company-count').textContent()).replaceAll(',',''));assert.ok(count>=500&&count<=1000);
 await page.locator('#url').fill('https://arnazon.test');await page.locator('#brands').getByText('amazon.com',{exact:true}).first().waitFor();assert.ok((await page.locator('#brands').textContent()).includes('rn'));assert.ok(await page.locator('#brands mark').filter({hasText:'rn'}).count()>0);
 await page.screenshot({path:path.join(root,'..','host-lens-web-desktop.png'),fullPage:true});
 await page.locator('#url').fill('https://аррӏе.test');assert.equal(await page.locator('#characters .nonascii').count(),5);assert.equal(await page.locator('.explain-note.nonascii').count(),1);assert.ok((await page.locator('#brands').textContent()).includes('apple.com'));
 for(const host of ['例子.test','bücher.test','παράδειγμα.test','مثال.test','उदाहरण.test','예시.test','😀.test','ｅxample.test']){await page.locator('#url').fill('https://'+host);assert.ok(await page.locator('#characters .nonascii').count()>0,host);}
 await page.locator('#url').fill('https://amazon.com/中文?x=а');assert.equal(await page.locator('#characters .nonascii').count(),0);assert.equal(await page.locator('#brand-state').textContent(),'参考记录一致');
 await page.locator('#url').fill('https://amazon.com.attacker.test');assert.notEqual(await page.locator('#brand-state').textContent(),'参考记录一致');assert.ok((await page.locator('#brands').textContent()).includes('子域'));
 await page.locator('#url').fill('javascript:alert(1)');assert.ok(await page.locator('#input-error').textContent());await page.locator('#clear').click();assert.equal(await page.locator('#url').inputValue(),'');assert.equal(await page.locator('#input-error').textContent(),'');
 await page.locator('#url').fill('https://inkd.in/enHTuknJ');
 assert.equal(await page.locator('#characters .similar').count(),1);
 assert.equal(await page.locator('#characters .similar').textContent(),'i');
 assert.equal(await page.locator('#brands .match-domain').textContent(),'lnkd.in');
 await page.locator('#characters .similar').hover();
 assert.equal(await page.locator('.explain-note.active').count(),1);
 await page.locator('#characters .similar').focus();
 assert.equal(await page.locator('.explain-note.active').count(),1);
 await page.waitForFunction(()=>document.querySelector('#connections path.active'));
 assert.ok((await page.locator('#connections path.active').getAttribute('d')).includes('M '));
 await page.screenshot({path:path.join(root,'..','host-lens-web-explainshell.png')});
 assert.equal(requests.filter(r=>r.method==='POST').length,0);assert.ok(requests.every(r=>r.url.startsWith(origin)),JSON.stringify(requests));
 await page.locator('#coverage > summary').click();await page.locator('#coverage details > summary').click();await page.locator('#company-search').fill('Apple');assert.ok((await page.locator('#company-list').textContent()).includes('apple.com'));
 assert.equal(requests.some(r=>r.url.includes('/api/')),false);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,cls:e.className,w:e.getBoundingClientRect().width})))));await page.screenshot({path:path.join(root,'..','host-lens-web-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile; real reference dataset; instant non-ASCII and brand checks; source lookup; no target-site requests; no reporting UI or API requests; no page errors.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
