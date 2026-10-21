/* Local character hints; no domain reputation or maliciousness verdict. */
(() => {
  const asciiGroups = [
    ['iIl1|', 'i / I / l / 1 / |'], ['oO0', 'o / O / 0'],
    ['sS5', 's / S / 5'], ['zZ2', 'z / Z / 2'],
    ['b6', 'b / 6'], ['B8', 'B / 8'], ['g9', 'g / 9']
  ];
  const code = c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  function inspectHost(host) {
    const chars = Array.from(host);
    return chars.map((char, index) => {
      const nonAscii = char.codePointAt(0) > 127;
      const mapped = globalThis.HOST_CONFUSABLES[char];
      const hints = [];
      if (mapped && mapped !== char && /[a-zA-Z0-9]/.test(mapped)) hints.push('Unicode 映射 → ' + mapped);
      const group = asciiGroups.find(([set]) => set.includes(char));
      if (group) hints.push('形似组：' + group[1]);
      if (char === 'm') hints.push('形似组合：rn');
      if (char === 'w') hints.push('形似组合：vv');
      if ((char === 'r' && chars[index + 1] === 'n') || (char === 'n' && chars[index - 1] === 'r')) hints.push('组合 rn 形似 m');
      if (char === 'v' && (chars[index-1] === 'v' || chars[index+1] === 'v')) hints.push('组合 vv 形似 w');
      return {char, code: code(char), nonAscii, similar: hints.length > 0, hints};
    });
  }
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
    const key=asciiHost.toLowerCase().replace(/\.$/,'');
    const knownReference=Object.hasOwn(globalThis.HOST_LENS_KNOWN_HOSTS||{},key)?globalThis.HOST_LENS_KNOWN_HOSTS[key]:null;
    // Only an exact saved host suppresses generic ASCII hints. Original non-ASCII stays visible.
    if(knownReference)for(const token of [...tokens,...(originalTokens||[])])if(!token.nonAscii){token.similar=false;token.hints=[];}
    const all = [...tokens, ...(originalTokens || [])];
    return {asciiHost, unicodeHost, originalHost, tokens, originalTokens, knownReference,
      nonAsciiCount: all.filter(t=>t.nonAscii).length,
      similarCount: all.filter(t=>t.similar).length,
      ipv6: asciiHost.startsWith('['), hasCredentials: !!(url.username || url.password)};
  }
  globalThis.HostLens = Object.freeze({analyze, inspectHost});
})();
