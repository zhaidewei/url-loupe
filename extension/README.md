# URL Loupe · URL 放大镜

Chrome Manifest V3 扩展 v0.3.3，本地检查网址 host 中的非 ASCII 字符和视觉相似字符。

## 安装

已安装旧版：覆盖原插件文件夹后，在 `chrome://extensions` 中点击本插件的重新加载按钮。若解压到了新目录，可移除旧版后加载新目录，避免两个版本争用 `host` 关键字。

1. 解压 host-lens.zip。
2. 在 Chrome 地址栏打开 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择含 manifest.json 的 host-lens 文件夹。
5. 将“URL 放大镜”固定到工具栏。已打开的网页需刷新后才有悬停提示。

## 使用

### 地址栏检查

1. 在地址栏输入 `host`，然后按 Tab。
2. 粘贴或输入网址，例如 `https://аpple.test`。
3. 下拉建议会突出显示形似字符，并列出非 ASCII 与相似字符数量。
4. 按回车，在当前标签页打开插件自己的完整高亮检查页。

地址栏建议只支持 Chrome 提供的强调样式；粉色和金框出现在完整结果页。插件不会访问输入网站。检查页仅接收 host，不接收路径、参数或 @ 前的用户名和密码。选择下拉建议中的字符详情，同样打开完整检查页。Ctrl/Cmd 或 Shift 等组合键的标签页行为遵循 Chrome 传入的打开位置。

这只在主动进入 `host` 模式后生效。普通地址栏输入仍由 Chrome 处理。

### 工具栏与网页链接

点击工具栏图标，检查当前页面 host，或输入、粘贴任意网址，即时显示检查结果，无需点击按钮或按回车。清空输入会清空结果；中文等输入法会在选词确认后更新。面板内有三个示例。
在网页中悬停链接约 250 毫秒，或用 Tab 聚焦链接，可查看含标记字符的 host。
按 Esc 或移走鼠标收起提示。链接文本、href、点击和复制行为保持原样。

- 粉色底线：所有非 ASCII 字符，不限语言或字母表，也包括非 ASCII 符号。
- 明确告警：host 含任何非 ASCII 字符，地址栏建议显示“⚠ 含非 ASCII 字符”，完整面板和悬停提示显示告警横幅。
- 金色边框：视觉相似字符；悬停单字符可查看码点与映射。
- 同时满足两项：粉色背景加金框。
- 始终显示浏览器实际使用的 ASCII / Punycode host。
- 若原始输入与规范化 host 不同，同时显示原始 host。

## 检查范围

Unicode 16.0.0 官方 confusables 表提供 6,355 个映射。当前将映射目标含 ASCII 字母或数字的字符列为形似提示。ASCII 另行提供 i/I/l/1/|、o/O/0、s/S/5、z/Z/2、b/6、B/8、g/9 及 rn/m、vv/w 的阅读提示。这些显式规则只用于提示，不声称覆盖所有字体或全部 Unicode 混淆。

普通英文中的 i、l、o 等也会高亮，合法中文域名也会显示非 ASCII 标记。高亮不表示恶意。本版不比较品牌域名，不联网查信誉，不阻止导航，也不追踪跳转链。

Chrome 扩展不能修改浏览器原生地址栏中的字符颜色。高亮出现在工具栏面板及链接悬停面板中。检查仅限 host；不高亮路径、参数或 @ 前的身份信息。浏览器已经规范化过的地址无法恢复原始大小写或原始全角字符，手动粘贴可查看原始输入。

仅在 HTTP(S) 网页顶层运行；不检查浏览器内部页面、Chrome 扩展商店受限页面、PDF 查看器、iframe 内部、封闭 Shadow DOM 中未暴露的链接、普通文本网址或 JavaScript 点击生成的导航。部分网页可能遮挡或移除悬停面板。插件不接管页面点击。

## 权限和隐私

`activeTab` 用于点击插件时读取当前标签页 URL。`omnibox.keyword` 注册 `host` 地址栏入口；后台 service worker 在输入时分析字符，并在回车后打开扩展内检查页，不增加新的权限项。HTTP(S) 全站 content_scripts 用于自动检查悬停链接，因此 Chrome 会显示网站访问权限。没有服务器、遥测、账号、持久化存储或运行时网络请求。分析函数仅返回 host，不输出输入网址中的密码。

## 验证

在本目录运行 `node --test tests/*.test.cjs`。自动化结果和浏览器实测记录见 `VALIDATION.md`。

## 数据来源和许可

- Unicode confusables 16.0.0： https://www.unicode.org/Public/security/16.0.0/confusables.txt
- UTS #39： https://www.unicode.org/reports/tr39/
- punycode.js 2.3.1： https://github.com/mathiasbynens/punycode.js/tree/v2.3.1
- 数据及依赖的许可见 vendor/ 下的许可证。

Unicode 数据和 punycode.js 均随扩展打包，运行时无需下载。

## 商店版本 0.3.3

新增放大镜 PNG 图标、英文与简体中文本地化、面板语言切换及公开隐私政策链接。初始语言跟随 Chrome 界面语言（中文或英文），面板切换只影响当前面板，不持久化。网页链接提示与地址栏建议跟随 Chrome 界面语言。

商店上传包由仓库根目录 scripts/package-extension.mjs 生成，manifest.json 位于 ZIP 根目录；不打包测试、源码文档和网站数据。隐私政策：https://loupe.zhaidewei.com/privacy.html 。目前仅准备上传材料，未提交商店审核。

## 合并参考表 0.3.3

Google CrUX 2026-09 的 Top 5000 origin 分组，提取去重后 4998 个 host，与原有 1898 条合并为 6890 条。运行时 known-hosts.js 只存域名字符串，精确匹配后隐藏普通 ASCII 提示，非 ASCII 不变；不新增针对 CrUX 域名的品牌模糊比较。Google 数据采用 CC BY 4.0，来源、快照与修改说明见 vendor/CRUX-NOTICE.txt 和仓库 data/crux/。
