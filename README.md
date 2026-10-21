# URL Loupe

A closer look at every URL. Inspect non-ASCII hostname characters and brand lookalikes locally, without visiting the target website.

[中文说明](README.zh-CN.md) · [License](LICENSE)


[Recording demo](https://loupe.zhaidewei.com/demo): normal and simulated lookalike links for right-click inspection. Ordinary clicks stay on the demo page.

## Three interfaces

- **Website**: instant character and brand comparison, fragment-to-explanation links, English by default with a Chinese toggle.
- **CLI**: offline JSON Lines output for scripts and AI agents; bundled references, no runtime dependencies.
- **Chrome extension**: character inspection through the right-click menu (links, selected URLs and pages), popup and `host` + Tab. The extension is an earlier character-only version; website brand matching has not yet been ported. It supports English and Simplified Chinese, with a popup language toggle.

## Run locally

Node.js 22.13 or newer is required.

```sh
node server.mjs
# Open http://127.0.0.1:4173

node cli/url-loupe.mjs --json 'https://arnazon.test'
node cli/url-loupe.mjs --stdin < urls.txt
node cli/url-loupe.mjs --help
```

The website itself is static: serve the **public/** directory using any static host. It makes no report or blacklist API requests. The included Node server is a local preview tool with legacy moderation code; do not expose that backend as a production service without reviewing it.

Requires Chrome 127+. Right-click inspection opens the toolbar popup without leaving the page. Load **extension/** as an unpacked extension from Chrome's developer-mode extension page. It uses only contextMenus and activeTab for user-initiated inspection, with no content scripts or broad host permissions. It cannot recolor or intercept ordinary address-bar input.

## CLI contract

One JSON object per input, with schemaVersion: 1. Results include ASCII/Unicode hosts, non-ASCII code points, brand candidates and reference sources. Full input URLs, credentials, paths and query strings are not echoed. Prefer --stdin for sensitive input to avoid shell history and process arguments.

Exit codes: **0** completed; **1** findings when --fail-on-findings is enabled; **2** invalid input, usage or execution error. Invalid batch records produce structured errors and processing continues. JSON field names are English; explanatory strings currently follow the Chinese engine. No result certifies safety.

## References and limits

671 companies and 1,896 reference hosts from a Wikidata snapshot dated 2026-10-20, plus manually sourced LinkedIn and ChatGPT aliases. Google CrUX September 2026 adds 4,998 unique hosts extracted from the Top 5,000 origin buckets. The domain-only union contains **6,890 exact hostnames**. CrUX data is retrieved through checksum-bound independent export mirrors, attributed to Google under CC BY 4.0, and is not an official Google-hosted download. Sources and filtering rules: [data/SOURCES.md](data/SOURCES.md). Current listing status and domain ownership have not been independently verified for every record.

Non-ASCII does not imply maliciousness. Matching a known hostname does not prove page safety. Brand detection uses heuristic Unicode skeletons and spelling comparisons and can produce false positives and omissions. No reputation lookup, target navigation, TLS certificate check or redirect tracing is performed. User reporting is deferred until a reviewed GitHub contribution flow is ready.

## Develop

```sh
npm ci
npm run build
npm test
node --test extension/tests/*.test.cjs
```

Builds generate public/engine.js and cli/url-loupe.mjs. Browser integration tests additionally require Playwright and an isolated Chromium installation; configure PLAYWRIGHT_MODULE and PLAYWRIGHT_BROWSERS_PATH before running node tests/browser.mjs.

## License

Original code: MIT. Third-party code and Unicode data retain their licenses in public/vendor/ and extension/vendor/. Wikidata structured data is CC0. Brand names are used only to identify reference candidates.

## Deployment

Cloudflare Workers Static Assets configuration is in wrangler.toml. Only public/ is deployed; the local Node/SQLite backend and extension are not uploaded. The configured custom domain is https://loupe.zhaidewei.com.

Deploy from this repository with Wrangler 4.127.0 after building and testing. Authenticate locally; do not put API tokens in tracked files. The custom domain requires access to the zhaidewei.com Cloudflare zone. DNS and TLS are managed by Cloudflare.

```sh
npm run build
npm test
npx wrangler@4.127.0 deploy
```

## Chrome Web Store package

The extension is version 0.3.8. Run `node scripts/package-extension.mjs` to build the upload ZIP with manifest.json at its root. Store copy and submission notes are in [store/](store/). Public privacy policy: https://loupe.zhaidewei.com/privacy.html. The developer dashboard submission has not been performed.
