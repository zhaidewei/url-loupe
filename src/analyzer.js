/* Local character hints; no domain reputation or maliciousness verdict. */
export function createAnalyzer() {
  const code=char=>'U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
  const inspectHost=host=>Array.from(host,char=>({char,code:code(char),nonAscii:char.codePointAt(0)>127}));
  function analyze(input, base) {
    const source = String(input).trim();
    let url;
    try { url = base ? new URL(source, base) : new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(source) ? source : 'https://' + source); }
    catch { throw new Error('无法解析网址，请输入完整的 HTTP(S) 网址或域名。'); }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('只检查 HTTP(S) 网址的 host。');
    const asciiHost = url.hostname;
    let unicodeHost;
    try { unicodeHost = asciiHost.startsWith('[') ? asciiHost : globalThis.HostPunycode.toUnicode(asciiHost); }
    catch { throw new Error('域名的 Punycode 编码无效。'); }
    // Keep pre-normalization characters visible (e.g. fullwidth and uppercase I).
    const authority = source.match(/^(?:[a-z][a-z\d+.-]*:)?\/\/([^/?#]*)/i)?.[1]
      ?? (!base && !source.includes('://') ? source.split(/[/?#]/)[0] : null);
    let originalHost = authority?.split('@').pop() ?? unicodeHost;
    if (originalHost.startsWith('[')) originalHost = originalHost.slice(0, originalHost.indexOf(']')+1);
    else originalHost = originalHost.replace(/:\d*$/, '');
    const tokens = inspectHost(unicodeHost);
    const originalTokens = originalHost !== unicodeHost && originalHost !== asciiHost ? inspectHost(originalHost) : null;
    const count=tokens=>tokens.filter(t=>t.nonAscii).length;
    return {asciiHost, unicodeHost, originalHost, tokens, originalTokens,
      nonAsciiCount: Math.max(count(tokens),count(originalTokens||[])),
      ipv6: asciiHost.startsWith('['), hasCredentials: !!(url.username || url.password)};
  }
  return Object.freeze({analyze, inspectHost});
}
