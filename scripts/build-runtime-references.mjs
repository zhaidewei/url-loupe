import fs from 'node:fs';
const base=new URL('../',import.meta.url);
const dataset=JSON.parse(fs.readFileSync(new URL('public/companies.json',base)));
const aliases=JSON.parse(fs.readFileSync(new URL('public/brand-aliases.json',base)));
const companies=[...dataset.companies,...aliases.brands].map(({id,name,nameEn,domains,sitelinks,sourceUrl})=>({id,name,nameEn,domains,sitelinks,sourceUrl}));
const metadata={companyCount:dataset.metadata.companyCount,domainCount:dataset.metadata.domainCount,retrievedAt:dataset.metadata.retrievedAt};
fs.writeFileSync(new URL('data/runtime-references.json',base),JSON.stringify({metadata,companies})+'\n');
