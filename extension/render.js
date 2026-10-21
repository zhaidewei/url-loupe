(() => {
  const tr=value=>globalThis.HostLensI18n?.text(value)??value;
  const hints=t=>t.hints.map(tr);
  const styles = `
    :host{all:initial;color-scheme:light;font:14px/1.6 system-ui,sans-serif;color:#172033}
    *{box-sizing:border-box} .card{font:14px/1.6 system-ui,sans-serif;color:#172033;background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:16px;box-shadow:0 12px 40px #0f172a28;overflow-wrap:anywhere}
    h2{font-size:15px;margin:0 0 8px}p{margin:8px 0;font-size:12px;color:#536176}
    .host{font:600 23px/1.9 ui-monospace,monospace;direction:ltr;unicode-bidi:isolate;word-break:break-all}
    .char{border-radius:4px;padding:1px;white-space:pre-wrap}.nonascii{background:#ffe0ec;color:#8b1247;border-bottom:3px solid #d4226a}
    .similar{outline:1px solid #a87500;background:#fff0ba;color:#563b00}.nonascii.similar{background:#ffe0ec;color:#8b1247;outline:2px solid #b87800}
    .encoded{font:12px/1.6 ui-monospace,monospace;direction:ltr;unicode-bidi:isolate;background:#f1f5f9;padding:8px;border-radius:6px;user-select:all}
    .label{font-size:11px;color:#536176;margin-top:10px}.legend{font-size:12px;margin-bottom:12px}
    .warning{background:#fff1f2;border:1px solid #e29aa9;border-radius:8px;padding:10px;margin:10px 0;color:#901e3a;font-weight:600;font-size:13px}
    .details{max-height:150px;overflow:auto;font-size:12px}.detail{border-top:1px solid #e2e8f0;padding:4px 0}
  `;
  function appendHost(parent, tokens) {
    const line = document.createElement('div'); line.className = 'host';
    for (const t of tokens) {
      const span = document.createElement('span');
      span.className = 'char'+(t.nonAscii ? ' nonascii':'')+(t.similar ? ' similar':'');
      span.textContent = t.char;
      span.title = [t.code, tr(t.nonAscii ? '非 ASCII 字符' : 'ASCII 字符'), ...hints(t)].join('；');
      span.setAttribute('aria-label', t.char+' '+span.title);
      line.append(span);
    }
    parent.append(line);
  }
  function render(root, data) {
    root.replaceChildren();
    const style = document.createElement('style'); style.textContent = styles; root.append(style);
    const card = document.createElement('section'); card.className='card'; root.append(card);
    const add = (tag, text, cls) => { const e=document.createElement(tag); e.textContent=tr(text); if(cls)e.className=cls; card.append(e); return e; };
    add('h2','Host Lens · 域名字符检查');
    add('div','粉色＝非 ASCII　金框＝视觉相似字符','legend');
    if(data.knownReference)add('p','与已保存的完整域名一致，已隐藏普通 ASCII 字符提示；这不代表网站安全。');
    if (data.nonAsciiCount > 0) {
      const warning=add('div','⚠ host 含非 ASCII 字符，请逐字核对域名。此提示覆盖所有非 ASCII 字符，不代表网站恶意。','warning');
      warning.setAttribute('role','alert');
    }
    add('div','解析后的 Unicode host','label'); appendHost(card, data.tokens);
    add('div','浏览器实际使用的 ASCII / Punycode host','label'); add('div',data.asciiHost,'encoded');
    if (data.originalTokens) { add('div','输入中的原始 host（浏览器规范化前）','label'); appendHost(card,data.originalTokens); }
    if (data.hasCredentials) add('p','网址含有 @ 前的身份信息；实际 host 以此面板解析结果为准。');
    if (data.ipv6) add('p','这是 IPv6 地址，字符提示仅供阅读。');
    const seen = new Set(); const details=document.createElement('div'); details.className='details'; card.append(details);
    for(const t of [...data.tokens,...(data.originalTokens||[])]) {
      if ((!t.nonAscii && !t.similar) || seen.has(t.char)) continue;
      seen.add(t.char); const row=document.createElement('div'); row.className='detail';
      row.textContent=`${t.char} · ${t.code} · ${[tr(t.nonAscii?'非 ASCII':'ASCII'),...hints(t)].join('；')}`; details.append(row);
    }
    add('p','字符提示不代表恶意判定。普通英文域名和中文域名也可能出现高亮。');
  }
  globalThis.HostLensView = Object.freeze({render});
})();
