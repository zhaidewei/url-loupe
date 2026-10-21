(() => {
  // src/analyzer.js
  function createAnalyzer() {
    const code = (char) => "U+" + char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    const inspectHost = (host) => Array.from(host, (char) => ({ char, code: code(char), nonAscii: char.codePointAt(0) > 127 }));
    function analyze(input, base) {
      const source = String(input).trim();
      let url;
      try {
        url = base ? new URL(source, base) : new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(source) ? source : "https://" + source);
      } catch {
        throw new Error("\u65E0\u6CD5\u89E3\u6790\u7F51\u5740\uFF0C\u8BF7\u8F93\u5165\u5B8C\u6574\u7684 HTTP(S) \u7F51\u5740\u6216\u57DF\u540D\u3002");
      }
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error("\u53EA\u68C0\u67E5 HTTP(S) \u7F51\u5740\u7684 host\u3002");
      const asciiHost = url.hostname;
      let unicodeHost;
      try {
        unicodeHost = asciiHost.startsWith("[") ? asciiHost : globalThis.HostPunycode.toUnicode(asciiHost);
      } catch {
        throw new Error("\u57DF\u540D\u7684 Punycode \u7F16\u7801\u65E0\u6548\u3002");
      }
      const authority = source.match(/^(?:[a-z][a-z\d+.-]*:)?\/\/([^/?#]*)/i)?.[1] ?? (!base && !source.includes("://") ? source.split(/[/?#]/)[0] : null);
      let originalHost = authority?.split("@").pop() ?? unicodeHost;
      if (originalHost.startsWith("[")) originalHost = originalHost.slice(0, originalHost.indexOf("]") + 1);
      else originalHost = originalHost.replace(/:\d*$/, "");
      const tokens = inspectHost(unicodeHost);
      const originalTokens = originalHost !== unicodeHost && originalHost !== asciiHost ? inspectHost(originalHost) : null;
      const count = (tokens2) => tokens2.filter((t) => t.nonAscii).length;
      return {
        asciiHost,
        unicodeHost,
        originalHost,
        tokens,
        originalTokens,
        nonAsciiCount: Math.max(count(tokens), count(originalTokens || [])),
        ipv6: asciiHost.startsWith("["),
        hasCredentials: !!(url.username || url.password)
      };
    }
    return Object.freeze({ analyze, inspectHost });
  }

  // src/browser-analyzer.js
  globalThis.HostLens = createAnalyzer();
})();
