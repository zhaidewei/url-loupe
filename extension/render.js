(() => {
 const tr=value=>HostLensI18n.text(value);
 const styles=`
 :host{all:initial;color-scheme:light;font:13px/1.6 system-ui,sans-serif;color:#172c46}*{box-sizing:border-box}
 .card{background:#fff;border:1px solid #dce3e9;border-radius:12px;padding:16px;overflow-wrap:anywhere}
 .host{font:600 23px/1.8 ui-monospace,monospace;direction:ltr;unicode-bidi:isolate;margin:0 0 14px;word-break:break-all}
 .char{font:inherit;color:inherit;padding:1px;border:0;border-radius:3px;background:transparent}.char[data-notes]{cursor:pointer}.char:focus-visible{outline:2px solid #4383ea;outline-offset:3px}
 .nonascii{background:#ffe0ec;color:#8b1247;border-bottom:2px solid #d4226a}.similar{background:#fff0ba;color:#563b00;box-shadow:inset 0 -2px #c89523}.nonascii.similar{background:#ffe0ec;color:#8b1247}
 .checks{display:grid;gap:7px}.check{display:flex;gap:8px;align-items:center;font-size:12px}.icon{font-weight:700;width:16px;text-align:center}.pass{color:#23634d}.attention{color:#94630c}.neutral{color:#71808b}
 .note{border-left:2px solid #d7b467;padding-left:10px;margin-top:15px}.note.nonascii-note{border-color:#d8799c}.note.active{background:#f6f8fa}.note h2{font-size:12px;font-weight:600;margin:0 0 5px}.note p{font-size:11px;color:#64748b;margin:4px 0}.note a{font-size:10px;color:#5a758a}.reference-domain{font:11px ui-monospace,monospace;color:#5a758a;margin:7px 0 3px}.char.active{text-decoration:underline;text-underline-offset:4px}
 .diff{font:12px/1.7 ui-monospace,monospace;direction:ltr}.diff span{display:inline-block;width:64px;font:10px system-ui;color:#71808b}.diff mark{background:#fff0ba;color:#563b00;border-radius:2px;padding:1px 2px}
 details{margin-top:14px;border-top:1px solid #edf0f2;padding-top:10px;color:#64748b;font-size:11px}summary{cursor:pointer}summary:focus-visible{outline:2px solid #4383ea}.label{margin-top:10px}.encoded{font:12px/1.6 ui-monospace,monospace;direction:ltr;unicode-bidi:isolate;padding:5px 0;color:#34475a;user-select:all}.scope,.credentials{font-size:11px;color:#71808b;margin:10px 0 0}
 `;
 function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
 function render(root,data){
  root.replaceChildren(node('style',styles));
  const {comparison,explanation,displayTokens}=data;
  const card=node('section',undefined,'card');card.setAttribute('aria-label',tr('域名检查结果'));root.append(card);
  const select=id=>{
   for(const el of card.querySelectorAll('[data-notes]'))el.classList.toggle('active',el.dataset.notes.split(' ').includes(id));
   for(const el of card.querySelectorAll('.note'))el.classList.toggle('active',el.id==='note-'+id);
  };
  const host=node('div',undefined,'host');
  for(const token of displayTokens){
   const ids=token.annotations.map(a=>a.id);
   const char=node(ids.length?'button':'span',token.char,'char'+(token.nonAscii?' nonascii':'')+(token.similar?' similar':''));
   char.title=token.code;
   if(ids.length){char.type='button';char.dataset.notes=ids.join(' ');char.setAttribute('aria-describedby',ids.map(id=>'note-'+id).join(' '));for(const event of ['pointerenter','focus','click'])char.addEventListener(event,()=>select(ids.at(-1)));}
   host.append(char);
  }
  card.append(host);
  const checks=node('div',undefined,'checks');checks.setAttribute('role','list');card.append(checks);
  const row=(kind,label)=>{const item=node('div',undefined,'check '+kind);item.setAttribute('role','listitem');const icon=node('span',kind==='pass'?'✓':kind==='attention'?'!':'–','icon');icon.setAttribute('aria-hidden','true');item.append(icon,node('span',tr(label)));checks.append(item);};
  row(data.nonAsciiCount?'attention':'pass',data.nonAsciiCount?'发现非 ASCII 字符':'无非 ASCII 字符');
  row(comparison.matches.length?'attention':'pass',comparison.matches.length?'发现品牌相似候选':'未发现品牌相似候选');
  row(comparison.knownHostMatch||comparison.references.length?'pass':'neutral',comparison.knownHostMatch?'已保存的域名匹配':comparison.references.length?'与参考域名一致':'参考库未收录');
  for(const annotation of explanation.annotations.filter(a=>a.type!=='reference')){
   const note=node('article',undefined,'note'+(annotation.type==='nonascii'?' nonascii-note warning':''));note.id='note-'+annotation.id;note.tabIndex=0;
   if(annotation.type==='nonascii')note.setAttribute('role','alert');
   note.append(node('h2',tr(annotation.title)));
   if(annotation.diff){
    for(const [label,part]of [['输入',annotation.diff.input],['参考',annotation.diff.reference]]){const line=node('div',undefined,'diff');line.append(node('span',tr(label)),document.createTextNode(part.before),node('mark',part.change),document.createTextNode(part.after));note.append(line);}
   }else if(annotation.type==='nonascii'){
    const detail=node('details');detail.append(node('summary',tr('字符详情')),node('p',annotation.codes.join(' / ')));note.append(detail);
   }else note.append(node('p',tr(annotation.text)));
   if(annotation.match){note.append(node('div',annotation.match.domain,'reference-domain'));const link=node('a',tr('查看参考来源')+' ↗');link.href=annotation.match.company.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';note.append(link);}
   for(const event of ['pointerenter','focus'])note.addEventListener(event,()=>select(annotation.id));card.append(note);
  }
  if(data.hasCredentials)card.append(node('p',tr('网址含 @ 前的身份信息，请核对实际域名。'),'credentials'));
  const detail=node('details');detail.append(node('summary',tr('检查详情')));card.append(detail);
  detail.append(node('div',tr('浏览器实际使用的 ASCII / Punycode host'),'label'),node('div',data.asciiHost,'encoded'));
  if(explanation.displayHost!==data.unicodeHost)detail.append(node('div',tr('解析后的 Unicode host'),'label'),node('div',data.unicodeHost,'encoded normalized'));
  detail.append(node('p',tr('检查范围：域名字符、已知域名与品牌差异；不检查网页内容。'),'scope'));
 }
 globalThis.HostLensView=Object.freeze({render});
})();
