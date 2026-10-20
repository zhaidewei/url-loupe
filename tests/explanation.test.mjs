import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import '../public/vendor/punycode.js';import '../public/vendor/confusables.js';import '../public/analyzer.js';
import {createIndex,compare} from '../src/engine.js';import {buildExplanation} from '../src/explanation.js';
const companies=JSON.parse(fs.readFileSync(new URL('../public/companies.json',import.meta.url))).companies;
const aliases=JSON.parse(fs.readFileSync(new URL('../public/brand-aliases.json',import.meta.url))).brands;
const index=createIndex([...companies,...aliases]);
const explain=input=>{const data=HostLens.analyze(input);return buildExplanation(data,compare(data,index));};
const highlighted=model=>model.annotations.filter(a=>a.type!=='reference').map(a=>Array.from(model.displayHost).slice(a.start,a.end).join(''));
test('ASCII highlight requires an actual candidate and points only to the difference',()=>{
 for(const input of ['Inkd.in','inkd.in']){
  const model=explain(input);assert.equal(model.annotations.length,1);assert.deepEqual(highlighted(model),[input[0]]);assert.equal(model.annotations[0].match.domain,'lnkd.in');
 }
 const ordinary=explain('https://unrelated-io.test');assert.equal(ordinary.annotations.length,0);
});
test('rn explanation is attached to rn and suffix separately; unchanged letters are quiet',()=>{
 const model=explain('https://arnazon.test/shop');assert.deepEqual(highlighted(model),['rn','.test']);
 assert.equal(model.annotations[0].diff.reference.change,'m');
});
test('non-ASCII is always explained and Punycode input is decoded for the main line',()=>{
 for(const input of ['https://例子.test',new URL('https://例子.test').href]){
  const model=explain(input);assert.equal(model.displayHost,'例子.test');assert.equal(model.annotations.filter(a=>a.type==='nonascii').length,1);assert.ok(highlighted(model).includes('例子'));
 }
});
test('known exact domain has an informational annotation, not ASCII suspicion',()=>{
 const model=explain('https://amazon.com');assert.ok(model.annotations.length>0);assert.ok(model.annotations.every(a=>a.type==='reference'));assert.deepEqual(highlighted(model),[]);
});
test('every annotation is a valid Unicode codepoint range',()=>{
 for(const input of ['https://аррӏе.test','https://ｅxample.test','https://😀.test','https://amazon.com.attacker.test']){
  const model=explain(input),length=Array.from(model.displayHost).length;
  for(const a of model.annotations)assert.ok(a.start>=0&&a.end<=length&&a.end>a.start,input);
 }
});
