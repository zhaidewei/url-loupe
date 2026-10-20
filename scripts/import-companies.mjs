/** Node 22+; node scripts/import-companies.mjs [--refresh] [--input /path/to/sparql.json] */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const refresh = args.includes('--refresh');
const inputIndex = args.indexOf('--input');
const inputPath = inputIndex >= 0 ? path.resolve(args[inputIndex + 1]) : path.join(root, 'data/wikidata-candidates.json');
const cacheDir = path.join(root, 'data/entities');
await fs.mkdir(cacheDir, { recursive: true });
const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const candidates = new Map();
for (const row of raw.results.bindings) {
  const id = row.company.value.split('/').pop();
  if (!/^Q\d+$/.test(id)) continue;
  const c = candidates.get(id) || { id, name: row.companyLabel.value, sitelinks: Number(row.sitelinks.value) };
  candidates.set(id, c);
}
const ids = [...candidates.keys()];
const batches = Array.from({length: Math.ceil(ids.length / 40)}, (_,i) => ids.slice(i * 40, (i+1) * 40));
const allEntities = {};
const snapshots = [];
async function fetchBatch(ids, index) {
  const filename = `batch-${String(index).padStart(3,'0')}.json`;
  const cachePath = path.join(cacheDir, filename);
  let snapshot;
  if (!refresh) {
    try { snapshot = JSON.parse(await fs.readFile(cachePath, 'utf8')); if (snapshot.ids.join('|') !== ids.join('|')) snapshot = null; } catch {}
  }
  if (!snapshot) {
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.search = new URLSearchParams({action:'wbgetentities', ids:ids.join('|'), props:'info|claims|labels', languages:'zh|en', format:'json'});
    let res;
    for (let attempt=0; attempt<5; attempt++) {
    res = await fetch(url, { headers: {'User-Agent':'HostLensResearch/0.1 (local domain reference prototype)'}, signal:AbortSignal.timeout(60000) });
    if (![429,502,503,504].includes(res.status)) break;
    const retrySeconds = Math.min(60, Number(res.headers.get('retry-after')) || 10 * (attempt + 1));
    console.log(`retry batch ${index}: HTTP ${res.status}; wait ${retrySeconds}s`);
    await res.arrayBuffer();
    await new Promise(resolve => setTimeout(resolve, retrySeconds * 1000));
    }
    if (!res.ok) throw new Error(`Wikidata ${res.status} batch ${index}`);
    const json = await res.json();
    if (!json.entities || json.error) throw new Error(`Invalid Wikidata response batch ${index}`);
    // Preserve only the statements used for admission; keep original claim IDs, ranks, qualifiers and references.
    for (const entity of Object.values(json.entities)) entity.claims = Object.fromEntries(Object.entries(entity.claims || {}).filter(([p]) => ['P414','P856','P576','P31'].includes(p)));
    snapshot = { retrievedAt: new Date().toISOString(), sourceUrl:url.href, ids, entities:json.entities };
    await fs.writeFile(cachePath, JSON.stringify(snapshot));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  Object.assign(allEntities, snapshot.entities);
  snapshots.push({ file:`entities/${filename}`, retrievedAt:snapshot.retrievedAt, sourceUrl:snapshot.sourceUrl });
  console.log(`snapshot ${index + 1}/${batches.length}: ${ids.length} entities`);
}
for (let i=0;i<batches.length;i++) await fetchBatch(batches[i],i);
const now = new Date().toISOString();
// Wikidata year/month precision uses 00 components; evaluate an interval instead of Date.parse.
const timeBound = (v, upper=true) => {
  const m = String(v).match(/^([+-]?\d+)-(\d{2})-(\d{2})T/);
  if (!m) return NaN;
  const year=Number(m[1]); const month=Number(m[2]) || (upper ? 12 : 1);
  const day=Number(m[3]) || (upper ? new Date(Date.UTC(year,month,0)).getUTCDate() : 1);
  return Date.UTC(year,month-1,day,upper?23:0,upper?59:0,upper?59:0);
};
const past = v => timeBound(v) <= Date.now();
const value = claim => claim?.mainsnak?.snaktype === 'value' ? claim.mainsnak.datavalue?.value : undefined;
const viable = claim => claim.rank !== 'deprecated' && !claim.qualifiers?.P582?.some(s => s.snaktype === 'somevalue' || past(s.datavalue?.value?.time)) && !claim.qualifiers?.P580?.some(s => { const t=s.datavalue?.value?.time; return t && timeBound(t,false) > Date.now(); });
const excluded=[];
const companies=[];
for (const c of [...candidates.values()].sort((a,b)=>b.sitelinks-a.sitelinks||a.id.localeCompare(b.id))) {
  const e = allEntities[c.id];
  if (!e || e.missing !== undefined) { excluded.push({id:c.id,reason:'entity_missing'});continue; }
  const claims = e.claims || {};
  if ((claims.P576 || []).some(s=>s.rank!=='deprecated' && past(value(s)?.time))) {excluded.push({id:c.id,reason:'dissolved_P576'});continue;}
  const listingStatements = (claims.P414||[]).filter(s=>viable(s) && value(s)?.id);
  if (!listingStatements.length) {excluded.push({id:c.id,reason:'no_unended_stock_exchange_statement'});continue;}
  const websites=[];
  const seen=new Set();
  for (const s of (claims.P856 || []).filter(viable)) {
    try {
      const originalUrl=value(s); if (typeof originalUrl!=='string') continue;
      const u = new URL(originalUrl);
      if (!['http:','https:'].includes(u.protocol) || u.username || u.password || !u.hostname.includes('.') || u.hostname.endsWith('.')) continue;
      const hostname = u.hostname.toLowerCase().replace(/^www\./,'');
      if (/^(?:\d+\.){3}\d+$/.test(hostname) || hostname.includes(':') || seen.has(hostname)) continue;
      seen.add(hostname);
      websites.push({url:originalUrl,hostname,sourceUrl:`https://www.wikidata.org/wiki/${c.id}#P856`,statementId:s.id,rank:s.rank});
    } catch {}
  }
  if (!websites.length) {excluded.push({id:c.id,reason:'no_unended_http_website'});continue;}
  const snapshot = snapshots.find(s=>new URL(s.sourceUrl).searchParams.get('ids').split('|').includes(c.id));
  companies.push({...c,name:e.labels?.zh?.value || e.labels?.en?.value || c.name,nameEn:e.labels?.en?.value||null,domains:websites.map(w=>w.hostname),websites,sourceUrl:`https://www.wikidata.org/wiki/${c.id}`,sourceRevision:e.lastrevid||null,retrievedAt:snapshot.retrievedAt,listingStatements:listingStatements.map(s=>({exchangeId:value(s).id,statementId:s.id})),verificationStatus:'wikidata_record'});
}
const selected=companies.slice(0,750);
if (selected.length < 500) throw new Error(`Only ${selected.length} eligible companies; minimum 500 required`);
const metadata={title:'知名上市公司官网参考集',version:1,generatedAt:now,retrievedAt:snapshots.map(s=>s.retrievedAt).sort().at(-1),coverageNotes:'全球跨交易所的 Wikidata 高 sitelinks 候选；不保证地域、行业、时效或名单完整性。未独立核验官网；无结束日期不等于当前仍有效。',source:'Wikidata',license:'CC0-1.0',companyCount:selected.length,domainCount:new Set(selected.flatMap(c=>c.domains)).size,candidateCount:candidates.size,eligibleCount:companies.length,selection:'按 Wikidata sitelinks 数量降序；最多 750 家',verificationStatus:'wikidata_record',notice:'参考集源于 Wikidata 社区记录，未逐家独立核验官网或当前上市状态；收录不代表安全认证，未收录不代表可疑。'};
await fs.mkdir(path.join(root,'public'),{recursive:true});
await fs.writeFile(path.join(root,'public/companies.json'),JSON.stringify({metadata,companies:selected}));
await fs.writeFile(path.join(root,'data/import-report.json'),JSON.stringify({generatedAt:now,metadata,snapshots:snapshots.sort((a,b)=>a.file.localeCompare(b.file)),excluded,eligibleNotSelected:companies.slice(750).map(c=>c.id)},null,2));
console.log(JSON.stringify(metadata,null,2));
