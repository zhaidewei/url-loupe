(() => {
  const tr=value=>globalThis.HostLensI18n?.text(value)??value;
  const hints=t=>t.hints.map(tr);
  const styles=`
    :host{all:initial;color-scheme:light;font:13px/1.6 system-ui,sans-serif;color:#172033}
    *{box-sizing:border-box}.card{font:13px/1.6 system-ui,sans-serif;color:#172033;background:#fff;border:1px solid #dce3e9;border-radius:12px;padding:16px;overflow-wrap:anywhere}
    .host{font:600 23px/1.8 ui-monospace,monospace;direction:ltr;unicode-bidi:isolate;word-break:break-all;margin-bottom:12px}
    .char{border-radius:4px;padding:1px;white-space:pre-wrap}.nonascii{background:#ffe0ec;color:#8b1247;border-bottom:3px solid #d4226a}.similar{outline:1px solid #a87500;background:#fff0ba;color:#563b00}.nonascii.similar{background:#ffe0ec;color:#8b1247;outline:2px solid #b87800}
    .checks{display:grid;gap:8px}.check{display:flex;align-items:center;gap:8px;font-size:12px}.icon{font-weight:700;width:16px;text-align:center}.pass{color:#23634d}.attention{color:#94630c}.neutral{color:#71808b}
    .warning,.explanation{font-size:12px;margin:12px 0 0;color:#8b3348}.explanation{color:#7b622e}
    details{margin-top:14px;border-top:1px solid #edf0f2;padding-top:10px;color:#64748b;font-size:11px}summary{cursor:pointer}summary:focus-visible{outline:2px solid #4383ea;outline-offset:3px}.label{margin-top:10px}.encoded{font:12px/1.6 ui-monospace,monospace;direction:ltr;unicode-bidi:isolate;padding:5px 0;color:#34475a;user-select:all}.details{max-height:150px;overflow:auto}.detail{padding:3px 0}.scope{font-size:11px;margin:10px 0 0}
  `;
  function make(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
  function appendHost(parent,tokens){
    const line=make('div',undefined,'host');
    for(const t of tokens){const span=make('span',t.char,'char'+(t.nonAscii?' nonascii':'')+(t.similar?' similar':''));span.title=[t.code,tr(t.nonAscii?'非 ASCII 字符':'ASCII 字符'),...hints(t)].join('；');span.setAttribute('aria-label',t.char+' '+span.title);line.append(span);}parent.append(line);
  }
  function render(root,data){
    root.replaceChildren(make('style',styles));const card=make('section',undefined,'card');card.setAttribute('aria-label',tr('域名检查结果'));root.append(card);
    appendHost(card,data.originalTokens||data.tokens);
    const checks=make('div',undefined,'checks');checks.setAttribute('role','list');card.append(checks);
    const row=(kind,label)=>{const item=make('div',undefined,'check '+kind);item.setAttribute('role','listitem');const icon=make('span',kind==='pass'?'✓':kind==='attention'?'!':'–','icon');icon.setAttribute('aria-hidden','true');item.append(icon,make('span',tr(label)));checks.append(item);};
    row(data.nonAsciiCount?'attention':'pass',data.nonAsciiCount?'发现非 ASCII 字符':'无非 ASCII 字符');
    row(data.similarCount?'attention':'pass',data.similarCount?'发现形似字符':'无形似字符提示');
    row(data.knownReference?'pass':'neutral',data.knownReference?'已保存的域名匹配':'参考库未收录');
    if(data.nonAsciiCount){const warning=make('p',tr('请核对标记的非 ASCII 字符。'),'warning');warning.setAttribute('role','alert');card.append(warning);}
    else if(data.similarCount)card.append(make('p',tr('标记的字符可能形似其他字符，请核对预期域名。'),'explanation'));
    if(data.hasCredentials)card.append(make('p',tr('网址含 @ 前的身份信息，请核对实际域名。'),'explanation'));
    const detail=make('details');detail.append(make('summary',tr('检查详情')));card.append(detail);
    detail.append(make('div',tr('浏览器实际使用的 ASCII / Punycode host'),'label'),make('div',data.asciiHost,'encoded'));
    if(data.originalTokens)detail.append(make('div',tr('解析后的 Unicode host'),'label'),make('div',data.unicodeHost,'encoded normalized'));
    const list=make('div',undefined,'details');const seen=new Set();for(const t of [...data.tokens,...(data.originalTokens||[])]){if((!t.nonAscii&&!t.similar)||seen.has(t.char))continue;seen.add(t.char);list.append(make('div',`${t.char} · ${t.code} · ${[tr(t.nonAscii?'非 ASCII':'ASCII'),...hints(t)].join('；')}`,'detail'));}detail.append(list);
    detail.append(make('p',tr('检查范围：域名字符与已保存域名匹配；不检查网页内容。'),'scope'));
  }
  globalThis.HostLensView=Object.freeze({render});
})();
