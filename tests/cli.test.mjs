import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../cli/url-loupe.mjs',import.meta.url));
const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{input,encoding:'utf8',timeout:15000});
test('CLI emits structured brand and character findings without full URL secrets',()=>{
 const r=run(['https://secret:password@arnazon.test/private?token=sensitive','https://аррӏе.test']);assert.equal(r.status,0,r.stderr);
 const rows=r.stdout.trim().split('\n').map(JSON.parse);assert.equal(rows.length,2);assert.ok(rows[0].matches.some(m=>m.host==='amazon.com'&&m.kind==='visual'));assert.equal(rows[1].nonAscii.length,5);assert.equal(rows[0].safetyVerdict,'not_assessed');
 for(const secret of ['secret','password','private','sensitive'])assert.ok(!r.stdout.includes(secret));
});
test('CLI batch preserves ordering, continues errors, and uses error exit code',()=>{
 const r=run(['--stdin','--fail-on-findings'],'https://amazon.com\n\njavascript:alert(1)\nhttps://inkd.in\n');assert.equal(r.status,2);
 const rows=r.stdout.trim().split('\n').map(JSON.parse);assert.deepEqual(rows.map(r=>r.record),[1,2,3]);assert.equal(rows[0].hasFindings,false);assert.equal(rows[1].error.code,'INVALID_INPUT');assert.ok(rows[2].matches.some(m=>m.host==='lnkd.in'));
});
test('CLI exit codes distinguish findings, clean execution and usage errors',()=>{
 assert.equal(run(['--fail-on-findings','https://arnazon.test']).status,1);assert.equal(run(['--fail-on-findings','https://amazon.com']).status,0);
 for(const args of [[],['--bad'],['--stdin','amazon.com']])assert.equal(run(args).status,2);
 assert.equal(run(['--stdin'],'\n').status,2);assert.match(run(['--help']).stdout,/JSON Lines/);assert.match(run(['--text','amazon.com']).stdout,/非 ASCII：无/);
});
test('CLI shares merged exact-host references with the browser interfaces',()=>{
 const r=run(['--fail-on-findings','https://www.google.com']);assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout);assert.equal(result.knownHostMatch,true);assert.equal(result.hasFindings,false);assert.equal(result.referenceData.knownHosts,6891);
});
test('schema v2 uses compact references instead of duplicating full company records',()=>{
 const r=run(['arnazon.test']);assert.equal(r.status,0);const result=JSON.parse(r.stdout);assert.equal(result.schemaVersion,2);
 assert.ok(result.annotations.some(a=>a.match?.host==='amazon.com'));
 for(const a of result.annotations){if(a.match){assert.ok(a.match.companyId);assert.equal(a.match.websites,undefined);assert.equal(a.match.company instanceof Object,false);}}
 assert.ok(Buffer.byteLength(r.stdout)<2500,'Single lookalike output should stay compact for agents');
});
