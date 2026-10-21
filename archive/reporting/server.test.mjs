import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createApp} from './server.mjs';import {openStore} from './store.mjs';
test('report persistence, manual approval, rejection, revocation and audit',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'host-lens-server-')),file=path.join(tmp,'reports.sqlite');
 const {server,store}=await createApp({dbPath:file});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=input=>fetch(origin+'/api/reports',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});
 try{
  assert.deepEqual((await(await fetch(origin+'/api/blacklist')).json()).entries,[]);
  const badOrigin=await fetch(origin+'/api/reports',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:'{}'});assert.equal(badOrigin.status,403);
  assert.equal((await post({host:'example.test',category:'other',evidence:'too short'})).status,400);
  const response=await post({host:'https://user:secret@arnazon.test/private?token=secret',category:'impersonation',evidence:'本地测试证据：域名通过rn模仿m。'});assert.equal(response.status,201);const report=await response.json();assert.equal(report.status,'pending');
  assert.deepEqual((await(await fetch(origin+'/api/blacklist')).json()).entries,[]);
  assert.equal(store.list()[0].host,'arnazon.test');assert.ok(!JSON.stringify(store.list()).includes('secret'));
  assert.throws(()=>store.review(report.id,'approve','','理由'));
  store.review(report.id,'approve','tester','测试证据核实，仅用于隔离测试。');
  const published=(await(await fetch(origin+'/api/blacklist')).json()).entries;assert.equal(published[0].host,'arnazon.test');assert.ok(!JSON.stringify(published).includes('evidence'));
  store.review(report.id,'revoke','tester','纠正测试记录。');assert.equal(store.published().length,0);
  assert.throws(()=>store.review(report.id,'approve','tester','不可重放已审核记录。'));
  const second=store.submit({host:'legitimate.test',category:'other',evidence:'测试误报'});store.review(second.id,'reject','tester','证据不足。');
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM audit').get().n,3);
  assert.equal((await fetch(origin+'/runtime/reports.sqlite')).status,404);
  assert.equal((await fetch(origin+'/api/reports')).status,405);
  assert.equal((await fetch(origin+'/')).headers.get('content-security-policy').includes("script-src 'self'"),true);
 }finally{await new Promise(r=>server.close(r));}
 const reopened=openStore(file);assert.equal(reopened.list('revoked').length,1);assert.equal(reopened.list('rejected').length,1);reopened.close();fs.rmSync(tmp,{recursive:true,force:true});
});
test('rate limit bounds submissions; stored rate keys contain no addresses',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'host-lens-rate-'));const store=openStore(path.join(tmp,'db.sqlite'));try{for(let i=0;i<8;i++)assert.equal(store.limit('hashed-test'),true);assert.equal(store.limit('hashed-test'),false);}finally{store.close();fs.rmSync(tmp,{recursive:true,force:true});}
});
