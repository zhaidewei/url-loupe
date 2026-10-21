const $=id=>document.getElementById(id);
let dataset=null,index=null,current=null,composing=false,loadFailed=false;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
function tag(id,text,kind='neutral'){const el=$(id);el.textContent=text;el.className='tag '+kind;}
let explanationFrame=0,activeAnnotation=null;
const colors={nonascii:'#b13d65',brand:'#a97618',suffix:'#567e9a',reference:'#6c8580'};
function sourceLink(company){const a=node('a','查看参考来源 ↗');a.href=company.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';return a;}
function diffLine(title,part){const line=node('div',undefined,'diff-line');line.append(node('span',title),document.createTextNode(part.before));if(part.change)line.append(node('mark',part.change));line.append(document.createTextNode(part.after));return line;}
function setActive(id){
 activeAnnotation=id;
 for(const el of document.querySelectorAll('[data-annotations]'))el.classList.toggle('active',el.dataset.annotations.split(' ').includes(id));
 for(const el of document.querySelectorAll('.explain-note'))el.classList.toggle('active',el.id==='note-'+id);
 for(const el of document.querySelectorAll('#connections path'))el.classList.toggle('active',el.dataset.annotation===id);
}
function drawConnections(){
 const root=$('explanation'),svg=$('connections');svg.replaceChildren();
 const base=root.getBoundingClientRect();svg.setAttribute('width',base.width);svg.setAttribute('height',base.height);svg.setAttribute('viewBox',`0 0 ${base.width} ${base.height}`);
 for(const [i,card]of [...document.querySelectorAll('.explain-note')].entries()){
  const id=card.dataset.annotation;const anchors=[...document.querySelectorAll('[data-annotations]')].filter(el=>el.dataset.annotations.split(' ').includes(id));
  if(!anchors.length)continue;
  const first=anchors[0].getBoundingClientRect(),last=anchors.at(-1).getBoundingClientRect(),target=card.getBoundingClientRect();
  const x=(first.left+last.right)/2-base.left,y=Math.max(first.bottom,last.bottom)-base.top+5;
  const ty=target.top-base.top+22,tx=target.left-base.left;
  const lane=14+(i%5)*9;
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',`M ${x} ${y-4} v 7 H ${lane} V ${ty} H ${tx}`);
  path.setAttribute('stroke',colors[card.dataset.type]);path.dataset.annotation=id;if(id===activeAnnotation)path.classList.add('active');svg.append(path);
 }
}
function queueConnections(){cancelAnimationFrame(explanationFrame);explanationFrame=requestAnimationFrame(drawConnections);}
new ResizeObserver(queueConnections).observe($('explanation'));
function renderExplanation(data){
 activeAnnotation=null;$('explanation').hidden=false;
 const root=$('characters'),notes=$('brands');root.replaceChildren();notes.replaceChildren();$('connections').replaceChildren();
 const comparison=index?HostLensEngine.compare(data,index):{matches:[],references:[]};
 const model=HostLensEngine.buildExplanation(data,comparison);
 tag('character-state',data.nonAsciiCount?'含非 ASCII':'未发现非 ASCII',data.nonAsciiCount?'danger':'neutral');
 tag('brand-state',!index?(loadFailed?'参考库不可用':'参考库载入中'):(comparison.knownHostMatch||comparison.references.length)?'参考记录一致':comparison.matches.length?'发现相似候选':'未找到品牌候选',comparison.matches.length?'warn':'neutral');
 const line=node('div',undefined,'explained-url');
 const source=$('url').value.trim();const explicit=source.match(/^https?:\/\//i);const url=new URL(explicit?source:'https://'+source);
 const prefix=node('span',url.protocol+'//'+(data.hasCredentials?'[身份信息]@':''),'url-context');
 const rawAuthority=source.match(/^(?:https?:)?\/\/[^/?#]*/i)?.[0];
 const suffix=rawAuthority!==undefined?source.slice(rawAuthority.length):source.slice(source.search(/[/?#]/)===-1?source.length:source.search(/[/?#]/));
 line.append(prefix);
 for(const [i,char]of Array.from(model.displayHost).entries()){
  const applicable=model.annotations.filter(a=>a.start<=i&&i<a.end);
  const risk=applicable.some(a=>a.type==='brand'||a.type==='suffix');const nonascii=char.codePointAt(0)>127;
  const span=node(applicable.length?'button':'span',char,'char'+(nonascii?' nonascii':'')+(risk?' similar':'')+(applicable.some(a=>a.type==='reference')?' reference-segment':''));
  if(applicable.length){span.type='button';span.dataset.annotations=applicable.map(a=>a.id).join(' ');span.setAttribute('aria-label',char+'：'+applicable.map(a=>a.title).join('；'));span.setAttribute('aria-describedby',applicable.map(a=>'note-'+a.id).join(' '));const select=()=>setActive(applicable.at(-1).id);span.addEventListener('pointerenter',select);span.addEventListener('focus',select);span.addEventListener('click',select);}
  line.append(span);
 }
 line.append(node('span',(url.port?':'+url.port:'')+suffix,'url-context'));root.append(line);
 for(const annotation of model.annotations){
  const card=node('article',undefined,'explain-note '+annotation.type);card.id='note-'+annotation.id;card.dataset.annotation=annotation.id;card.dataset.type=annotation.type;card.tabIndex=0;
  card.append(node('h2',annotation.title));
  if(annotation.type==='nonascii')card.append(node('p','含非 ASCII 字符，请核对。'));
  else if(!annotation.diff)card.append(node('p',annotation.text));
  if(annotation.type==='nonascii'){card.setAttribute('role','note');const detail=node('details',undefined,'note-detail');detail.append(node('summary','字符详情'),node('div',annotation.codes.join(' / '),'character-code'));card.append(detail);}
  if(annotation.diff)card.append(diffLine('输入',annotation.diff.input),diffLine('参考',annotation.diff.reference));
  if(annotation.match)card.append(node('div',annotation.match.domain,'match-domain'),sourceLink(annotation.match.company));
  const select=()=>setActive(annotation.id);card.addEventListener('pointerenter',select);card.addEventListener('focus',select);notes.append(card);
 }
 if(!model.annotations.length)notes.append(node('p',comparison.knownHostMatch?'与已保存的完整域名一致；这不代表网站安全。':!index?'参考库尚未就绪，品牌比对暂不可用。':'未发现非 ASCII 字符，也未找到当前参考库中的品牌相似候选。这不代表网站安全。','no-match'));
 if(comparison.matches.length>1){const more=node('details',undefined,'more-candidates');more.append(node('summary','其他相似候选（'+(comparison.matches.length-1)+'）'));for(const match of comparison.matches.slice(1))more.append(node('p',(match.company.nameEn||match.company.name)+' · '+match.domain+' · '+match.reason));notes.append(more);}
 const details=node('details',undefined,'raw-details');details.append(node('summary','查看实际域名与解码信息'),node('p','浏览器实际使用的 ASCII / Punycode host','small'),node('div',data.asciiHost,'mono-box'));
 if(model.displayHost!==data.unicodeHost)details.append(node('p','规范化后的 Unicode host','small'),node('div',data.unicodeHost,'mono-box'));
 if(data.hasCredentials)details.append(node('p','@ 前是身份信息，不属于 host。显示已隐藏具体内容。','small'));
 notes.append(details);queueConnections();
}
function clearResults(){
 current=null;$('explanation').hidden=true;tag('character-state','等待输入');tag('brand-state','等待输入');
 $('characters').replaceChildren(node('p','输入网址，查看片段解释。','explain-empty'));
 $('brands').replaceChildren();$('connections').replaceChildren();
}
function update(){
 $('input-error').textContent='';const value=$('url').value;
 if(!value.trim()){clearResults();return;}
 try{current=HostLens.analyze(value);renderExplanation(current);}
 catch(error){clearResults();$('input-error').textContent=error.message;}
}
$('url').addEventListener('compositionstart',()=>{composing=true;});
$('url').addEventListener('compositionend',()=>{composing=false;update();});
$('url').addEventListener('input',event=>{if(!composing&&!event.isComposing)update();});
$('clear').addEventListener('click',()=>{$('url').value='';update();$('url').focus();});
for(const button of document.querySelectorAll('[data-example]'))button.addEventListener('click',()=>{$('url').value=button.dataset.example;update();});
function companyList(){
 if(!dataset)return;const term=$('company-search').value.trim().toLowerCase();
 const companies=dataset.companies.filter(c=>[c.name,c.nameEn,...c.domains].join(' ').toLowerCase().includes(term));const root=$('company-list');root.replaceChildren();
 for(const company of companies.slice(0,20)){const row=node('div',undefined,'company-row');row.append(node('span',document.documentElement.lang==='en'?(company.nameEn||company.name):company.name),node('code',company.domains.slice(0,2).join(' / ')),sourceLink(company));root.append(row);}
 $('list-count').textContent=`共 ${companies.length} 家匹配，显示前 ${Math.min(20,companies.length)} 家。完整快照可在 /companies.json 查看。`;
}
$('company-search').addEventListener('input',companyList);
(async()=>{
 try{const [response,aliases,hostsResponse]=await Promise.all([fetch('/companies.json'),fetch('/brand-aliases.json'),fetch('/known-hosts.json')]);if(!response.ok||!aliases.ok||!hostsResponse.ok)throw Error('dataset');dataset=await response.json();const extra=await aliases.json();const knownHosts=await hostsResponse.json();index=HostLensEngine.createIndex([...dataset.companies,...extra.brands],knownHosts);
 $('dataset-status').textContent=`${dataset.metadata.companyCount} 家公司参考库已就绪`;$('company-count').textContent=dataset.metadata.companyCount.toLocaleString();$('domain-count').textContent=knownHosts.length.toLocaleString();$('coverage-notes').textContent='采集日期：'+dataset.metadata.retrievedAt.slice(0,10)+'。'+dataset.metadata.coverageNotes+' 未逐家公司独立验证当前上市状态或域名所有权。另有 '+extra.brands.length+' 条人工补充品牌参考。另合并 Google CrUX 2026-09 Top 5000 分组，按完整 host 去重。';companyList();if($('url').value)update();
 }catch{loadFailed=true;$('dataset-status').textContent='参考库载入失败';if(current)renderExplanation(current);}
})();

function revealUtility(){const target=document.getElementById(location.hash.slice(1));if(target instanceof HTMLDetailsElement)target.open=true;}
window.addEventListener('hashchange',revealUtility);revealUtility();

$('language').addEventListener('click',companyList);
