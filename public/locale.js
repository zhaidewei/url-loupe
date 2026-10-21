// Only English and Chinese. Preserve source strings so language changes are reversible.
(() => {
let language='en';try{language=localStorage.getItem('url-loupe-language')==='zh'?'zh':'en';}catch{}
const phrases={
'与已保存的完整域名一致；这不代表网站安全。':'Matches a saved hostname. This does not establish website safety.',
'无法解析网址，请输入完整的 HTTP(S) 网址或域名。':'Cannot parse this URL. Enter an HTTP(S) URL or domain.',
'只检查 HTTP(S) 网址的 host。':'Only HTTP(S) hosts are supported.',
'域名的 Punycode 编码无效。':'Invalid Punycode hostname.',
'在本地检查网址中的非 ASCII 字符、视觉相似字符和品牌仿冒线索。':'Inspect URL characters and brand lookalikes locally.',
'网址即时检查':'Instant URL inspection','输入网址，立即解释':'Enter a URL to inspect it','输入或粘贴网址':'Enter or paste a URL','清空网址':'Clear URL',
'网址片段与解释':'URL fragments and explanations','正在载入参考库…':'Loading references…','参考库载入失败':'Failed to load references',
'查看来源与公司名单':'Sources and companies','搜索公司或域名':'Search companies or domains','搜索公司名称或域名':'Search companies or domains',
'参考库':'References','家公司':'companies','个域名':'domains','关于':'About','本地检查 · 不访问目标网站':'Local analysis · No target-site requests',
'检查非 ASCII 字符与品牌域名差异，提供核对线索，不作网站安全认证。':'Inspect non-ASCII characters and brand differences. Results are hints, not a safety certification.',
'分析在本地完成，不会访问目标网站。':'Analysis runs locally without visiting the target website.',
'Wikidata 官网属性':'Wikidata website property','交易所属性':'Exchange property','CC0 数据许可':'CC0 data license',
'查看参考来源 ↗':'Reference source ↗','含非 ASCII 字符，请核对。':'Non-ASCII characters found. Check them carefully.','字符详情':'Character details',
'未发现非 ASCII 字符，也未找到当前参考库中的品牌相似候选。这不代表网站安全。':'No non-ASCII characters or brand lookalikes found in this dataset. This does not establish safety.',
'参考库尚未就绪，品牌比对暂不可用。':'References are not ready; brand comparison is unavailable.',
'查看实际域名与解码信息':'ASCII host and decoding details','浏览器实际使用的 ASCII / Punycode host':'Actual ASCII / Punycode host','规范化后的 Unicode host':'Normalized Unicode host',
'@ 前是身份信息，不属于 host。显示已隐藏具体内容。':'Credentials before @ are not part of the host and have been hidden.',
'[身份信息]@':'[credentials]@','等待输入':'Waiting for input','输入网址，查看片段解释。':'Enter a URL to see its fragments explained.',
'含非 ASCII':'Contains non-ASCII','未发现非 ASCII':'No non-ASCII found','参考库不可用':'References unavailable','参考库载入中':'Loading references',
'参考记录一致':'Matches a reference','发现相似候选':'Lookalikes found','未找到品牌候选':'No brand candidates',
'输入':'Input','参考':'Reference',
'非 ASCII 字符：':'Non-ASCII characters: ',
'这些字符来自扩展字符集；合法国际化域名也会使用。请核对它们是否与预期名称一致。':'These characters also occur in legitimate internationalized domains. Check that they match the expected name.',
'熟悉的名字出现在子域中':'A familiar name appears in a subdomain','真正的注册域名是 ':'The actual registrable domain is ',
'，不是 ':' rather than ','可能仿冒 ':'Possible lookalike of ','名称可能缺少字符':'The name may be missing characters',
'域名后缀也不同':'The domain suffix also differs','输入使用 .':'Input uses .','；此候选记录使用 .':'; this reference uses .',
'。后缀差异本身不证明仿冒。':'. A different suffix alone does not prove impersonation.',
'与参考库中的记录一致':'Matches a reference record','参考对象：':'Reference: ','。这不代表网页内容安全。':'. This does not establish content safety.',
'名称相同，但实际域名后缀不同':'Same name, different domain suffix',
'参考视觉形式相同，可能通过相似字符或字符组合仿冒':'Matching visual skeleton; similar characters or combinations may imitate this name',
'参考域名出现在子域中，实际注册域名属于另一地址':'The reference appears in a subdomain; the actual registrable domain differs',
'名称相差一个字符，仅供人工核对':'One-character spelling difference; check manually',
'未逐家公司独立验证当前上市状态或域名所有权。':'Current listing status and domain ownership have not been independently verified for each company.',
'请粘贴网址或域名。':'Enter a URL or domain.','仅检查 http / https 网址。':'Only HTTP(S) URLs are supported.'
};
function english(value){
 if(phrases[value])return phrases[value];
 if(/^\d+ 家公司参考库已就绪$/.test(value))return value.match(/\d+/)[0]+' company references ready';
 if(value.startsWith('共 ')&&value.includes(' 家匹配'))return value.replace(/^共 (\d+) 家匹配，显示前 (\d+) 家。完整快照可在 \/companies.json 查看。$/,'$1 matches, showing the first $2. Full snapshot: /companies.json');
 if(value.startsWith('其他相似候选（'))return value.replace('其他相似候选（','Other candidates (').replace('）',')');
 if(value.startsWith('采集日期：'))return 'Snapshot: '+value.slice(5,15)+'. Wikidata community records; current listing status and domain ownership are not independently verified. Manually sourced brand aliases: '+(value.match(/另有 (\d+) 条/)?.[1]||'0')+'. Merged with the Google CrUX September 2026 Top 5000 origin buckets; deduplicated by exact hostname.';
 if(value.startsWith('非 ASCII 字符：'))return 'Non-ASCII characters: '+value.slice('非 ASCII 字符：'.length);
 if(value.startsWith('可能仿冒 '))return 'Possible lookalike of '+value.slice('可能仿冒 '.length);
 const actual=value.match(/^真正的注册域名是 (.+)，不是 (.+)。$/);if(actual)return 'The actual registrable domain is '+actual[1]+' rather than '+actual[2]+'.';
 const suffix=value.match(/^输入使用 \.(.+)；此候选记录使用 \.(.+)。后缀差异本身不证明仿冒。$/);if(suffix)return 'Input uses .'+suffix[1]+'; this reference uses .'+suffix[2]+'. A different suffix alone does not prove impersonation.';
 const reference=value.match(/^参考对象：(.+)。这不代表网页内容安全。$/);if(reference)return 'Reference: '+reference[1]+'. This does not establish content safety.';
 const parts=value.split(' · ');if(parts.length===3&&phrases[parts[2]])return parts[0]+' · '+parts[1]+' · '+phrases[parts[2]];
 // Unknown strings and data are preserved verbatim; never translate arbitrary substrings.
 return value;
}
const originals=new WeakMap(),attributes=new WeakMap();
function apply(){
 document.documentElement.lang=language==='en'?'en':'zh-CN';
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let text;
 while((text=walker.nextNode())){if(text.parentElement.closest('script,style,#language,svg,#characters,.mono-box,.character-code,.match-domain,.company-row code'))continue;if(text.parentElement.closest('.diff-line')&&text.parentElement.tagName!=='SPAN')continue;const original=originals.get(text)??text.nodeValue;originals.set(text,original);const desired=language==='en'?english(original):original;if(text.nodeValue!==desired)text.nodeValue=desired;}
 for(const el of document.querySelectorAll('[placeholder],[aria-label],meta[name="description"]')){
  let saved=attributes.get(el);if(!saved){saved={};for(const key of ['placeholder','aria-label','content'])if(el.hasAttribute(key))saved[key]=el.getAttribute(key);attributes.set(el,saved);}
  for(const [key,value]of Object.entries(saved)){const desired=language==='en'?english(value):value;if(el.getAttribute(key)!==desired)el.setAttribute(key,desired);}
 }
 const button=document.getElementById('language');if(button.textContent!==(language==='en'?'中文':'English'))button.textContent=language==='en'?'中文':'English';
}
let scheduled=false;const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;apply();});}});
document.getElementById('language').addEventListener('click',()=>{language=language==='en'?'zh':'en';try{localStorage.setItem('url-loupe-language',language);}catch{}apply();});
apply();observer.observe(document.body,{childList:true,subtree:true,characterData:true});
})();
