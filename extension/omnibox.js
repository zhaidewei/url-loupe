(() => {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
  const marked = tokens => tokens.map(token => token.nonAscii || token.similar ? '<match>'+escape(token.char)+'</match>' : escape(token.char)).join('');
  function describe(text) {
    if (!text.trim()) return {description:'输入网址或域名，检查字符；<dim>按回车查看完整高亮，不访问目标网站</dim>', suggestions:[]};
    try {
      const data=HostLens.analyze(text);
      const original=data.originalTokens || data.tokens;
      const canonicalCount=data.tokens.filter(t=>t.nonAscii).length;
      const originalCount=original.filter(t=>t.nonAscii).length;
      const tokens=canonicalCount > originalCount ? data.tokens : original;
      const nonAscii=Math.max(canonicalCount,originalCount);
      const similar=tokens.filter(t=>t.similar).length;
      const content=data.originalHost;
      const details=[]; const seen=new Set();
      for(const token of tokens){
        if((!token.nonAscii && !token.similar) || seen.has(token.char))continue;
        seen.add(token.char);
        details.push({content,description:'<match>'+escape(token.char)+'</match> '+escape(token.code)+' <dim>'+escape([token.nonAscii?'非 ASCII':'ASCII',...token.hints].join('；'))+'</dim>'});
        if(details.length===4)break;
      }
      return {
        description:(nonAscii > 0 ? '⚠ 含非 ASCII 字符，请核对 · ' : '')+marked(tokens)+' <dim>· 非 ASCII '+nonAscii+' · 相似字符 '+similar+' · 回车查看，不访问</dim>',
        suggestions:[{content,description:'实际 host：<url>'+escape(data.asciiHost)+'</url> <dim>· 查看高亮详情</dim>'},...details],
        host:content
      };
    } catch {
      return {description:'无法解析此网址。<dim>请输入 HTTP(S) 网址或域名；回车显示帮助，不访问输入地址</dim>',suggestions:[]};
    }
  }
  globalThis.HostLensOmnibox=Object.freeze({describe});
})();
