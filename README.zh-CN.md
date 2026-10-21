# URL Loupe 网站 v0.3.2

输入网址，即时检查 host 中的非 ASCII 字符、视觉相似字符与公司域名相似候选。所有字符与品牌比对在浏览器本地完成，不访问输入的目标网站。

当前精确匹配表：**6,890 个唯一 host**，由原有 1,898 条（公司域名与人工品牌补充）及 Google CrUX 2026-09 Top 5000 分组提取的 4,998 条合并，重复 6 条。运行时只保存域名字符串，保持完整 host，不折叠子域；来源与许可单独记录。公司品牌库仍为 **671 家公司、1,896 个 host**。来源为 2026-10-20 采集的 Wikidata 社区记录，已过滤来源明确标注的历史声明。没有逐家公司独立验证当前上市状态或域名所有权；不把收录记录作为安全认证。

## 启动

需要 Node.js 22.13+（本次使用 22.23.1）。发布包已包含前端构建结果，可直接双击 macOS 的 `start.command`，或在本目录运行：

```sh
node server.mjs
```

开发或重新构建时，依赖与 lockfile 已固定：

```sh
npm ci
npm run build
npm start
```

浏览器打开 `http://127.0.0.1:4173`。本机现有目录已经安装依赖并构建，可以直接运行 `npm start`。

服务默认只监听本机。`PORT` 可指定端口；若要对外监听，必须配置 `PUBLIC_ORIGIN`，并通过带 HTTPS 的反向代理转发到 Node 服务。`HOST_LENS_DB` 可指定持久数据库文件；不要将数据库放在 `public/`。本交付未部署到公网，也没有创建远程托管资源。

## CLI：供终端与 AI Agent 使用

需要 Node.js 22.13+。发布包中的 cli/url-loupe.mjs 已捆绑引擎与参考数据，运行无需安装 npm 依赖，无需启动网站或联网。源码修改后运行 npm run build 重新生成。

在项目目录中运行：

```sh
node cli/url-loupe.mjs --json 'https://arnazon.test'
node cli/url-loupe.mjs --text 'https://аррӏе.test'
node cli/url-loupe.mjs --stdin < urls.txt
node cli/url-loupe.mjs --fail-on-findings 'https://inkd.in'
node cli/url-loupe.mjs --help
```

默认输出 JSON Lines，每条非空输入对应一行 JSON，适合 Agent 逐条解析。--stdin 与位置参数互斥。普通结果仅写 stdout，参数和运行错误说明写 stderr；无效 URL 会产生结构化错误记录并继续处理后续输入。record 为从 1 开始的非空输入序号。

输出 schemaVersion 当前为 1；成功记录包含 ok、hasFindings、host（ASCII / Unicode / 原始 host）、nonAscii、matches、references、annotations、referenceData。nonAscii.index 按显示 host 的 Unicode 码点从 0 计数。matches 给出品牌候选、差异类型、参考 host 与来源；references 表示参考库记录匹配。safetyVerdict 固定为 not_assessed，scope 为 local_host_analysis_only，不输出安全或恶意判定。

退出码：0 表示处理完成；加 --fail-on-findings 时，发现非 ASCII 或品牌候选返回 1；任一输入无效、参数或执行错误返回 2，优先于 1。没有线索也不证明网站安全。

不回显完整 URL；用户名、密码、路径与参数不进入结果。Agent 应优先通过 --stdin 传入 URL，避免命令行参数留在 shell 历史或进程参数中。当前无信誉联网查询、证书查询或黑名单服务。

## 检查与数据

- 主界面只保留输入、网址片段和连线解释；参考库、关于默认折叠；参考库仅显示公司与域名数量，保留来源与公司名单。空输入时不显示结果区，未命中名单时不展示重复的状态条。
- 输入／粘贴后立即检查，无“检查”按钮；输入法选词确认后更新。
- 完整网址作为主视图。粉色标记所有非 ASCII 字符；金色仅标记命中品牌候选后的具体差异，不再无条件标记普通 i/o/m。路径和参数不参与 host 字符检查。
- 片段通过折线连接解释卡片；悬停、点击或键盘聚焦任意一侧，网址片段、连线和解释同步突出。窄屏也保留对应关系。
- 例如 inkd.in 只解释开头 i 与 lnkd.in 的 l；arnazon.test 分别解释 rn/m 与后缀差异。Punycode 详情折叠显示。
- 同时显示 Unicode 与实际 ASCII/Punycode。原始输入在规范化后发生变化时另行显示。
- 品牌候选使用 Unicode 16.0.0 confusables 映射、NFD、大小写折叠，以及额外的 `i/l/1/|` 视觉组。这是自定义启发式比较，不宣称完整实现最新 UTS #39。
- `m` 与 `rn` 可命中同一参考视觉形式；例如 `arnazon.test` 提示 Amazon，并高亮 `rn` 与 `m` 的差异。
- 利用 Public Suffix List 确定注册域名，支持 `co.uk` 和私有托管后缀；官网的正常子域不会仅因名称相似被当作仿冒。
- 拼写相差一个字符时给出较弱提示；最多展示三个公司候选。算法可能误报、漏报，不据此直接入黑。
- 在 671 家公司参考库之外，`public/brand-aliases.json` 另补充 LinkedIn 的 lnkd.in 品牌参考及来源。参考库与品牌别名尚不完整；例如公司官网、产品品牌和旗下网站不总是一一对应。
- 名单精确匹配完整 host，不扩大到整个平台或所有子域。

在页面“参考库”可搜索公司并打开来源记录。完整数据在 `public/companies.json`；来源、筛选规则和离线重建见 [data/SOURCES.md](data/SOURCES.md)。原始快照随源码交付，运行网站不需要联网读取 Wikidata。

## 静态部署与举报计划

网站运行仅需托管 public/ 中的静态文件，页面不调用举报或黑名单 API；可部署到 zhaidewei.com 的子域名根目录。域名、DNS 与托管尚未配置。

举报入口已移除。待项目在 GitHub 开源后，再通过 Issues 接收线索、PR 修改静态名单，并由维护者人工审核。举报 UI 暂未接入 GitHub。

已有 server.mjs、store.mjs 与 review 脚本保留用于本地历史审核能力，其测试独立保留，当前网页不再使用。

## 数据文件与发布

默认数据库位于 `runtime/reports.sqlite`。SQLite 使用 WAL 模式；正式备份应使用 SQLite 在线备份接口或先停服务，避免只复制主文件造成遗漏。本版使用 Node 的内置 SQLite 模块，在当前 Node 22 中仍有实验性提示。

源码压缩包不包含 `node_modules/` 或 `runtime/`，包含已构建前端、lockfile、参考数据和来源快照。测试不会在运行数据库中留下示例举报。

## 验证

```sh
npm test
```

17 项自动测试覆盖字符／品牌比对、参考库结构、PSL、举报持久化、批准／驳回／撤销、审核日志和请求校验。浏览器测试需额外准备隔离的 Playwright/Chromium，通过 `PLAYWRIGHT_MODULE` 和 `PLAYWRIGHT_BROWSERS_PATH` 指定已有工具，再运行 `node tests/browser.mjs`。

本次桌面与手机宽度测试、输入即时更新、品牌差异、非 ASCII 脚本、来源搜索、无举报入口或 API 请求均通过；没有访问目标测试域名，也无浏览器脚本错误。详见 [VALIDATION.md](VALIDATION.md)。

## 第三方数据与代码

Wikidata 结构化数据采用 CC0；Unicode 数据、punycode.js、tldts 和 tldts-core 许可保存在 `public/vendor/`。依赖版本见 package-lock.json。公司名称仅用于指示可能相似的参考对象。

## 子域名部署

线上地址：https://loupe.zhaidewei.com 。通过 Cloudflare Workers Static Assets 托管 public/；仅部署静态文件，不部署本地 Node/SQLite 服务。配置见 wrangler.toml，Cloudflare 管理该子域名的 DNS 与 TLS。重新部署时先构建和测试，再运行 npx wrangler@4.127.0 deploy；凭据由本地登录或 secret CLI 在使用点提供，不写入仓库。

## Chrome 商店材料

extension/ 当前商店准备版为 0.3.2，新增英文／简体中文与面板语言切换，仍仅做字符检查。打包运行 `node scripts/package-extension.mjs`。商店介绍、权限与隐私填写说明及图片在 store/，公开隐私政策为 https://loupe.zhaidewei.com/privacy.html 。插件 ZIP 已在隔离 Chrome 中加载验证；尚未上传或提交商店审核。
