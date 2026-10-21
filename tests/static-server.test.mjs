import http from 'node:http';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
test('static preview matches public routes, serves SVG MIME and exposes no reporting API',async()=>{
 const {server}=await createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  for(const route of ['/','/demo','/demo.html','/privacy'])assert.equal((await fetch(origin+route)).status,200,route);
  const svg=await fetch(origin+'/demo-icon.svg');assert.equal(svg.headers.get('content-type'),'image/svg+xml');
  const head=await fetch(origin+'/demo',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  for(const route of ['/api/reports','/api/blacklist','/runtime/reports.sqlite'])assert.equal((await fetch(origin+route)).status,404);
  assert.equal((await fetch(origin+'/api/reports',{method:'POST',body:'{}'})).status,404);
  assert.equal((await fetch(origin+'/',{method:'POST'})).status,405);
  const badHost=await new Promise((resolve,reject)=>{const req=http.request(origin+'/',{headers:{Host:'evil.test'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(badHost,403);
  assert.ok((await fetch(origin+'/')).headers.get('content-security-policy').includes("script-src 'self'"));
 }finally{await new Promise(r=>server.close(r));}
});
