# URL Loupe · URL 放大镜

Chrome Manifest V3 扩展 0.4.0，与网页共用字符分析和品牌比对核心，支持英文与简体中文。

## 安装与升级

解压 `url-loupe-chrome-0.4.0.zip`，在 `chrome://extensions` 开启开发者模式，加载根目录含 manifest.json 的插件文件夹。商店上传材料目录不包含根 manifest，不能作为插件目录加载。

升级已有解压版时，替换原文件夹内容后点击重新加载；如更换目录，请移除旧插件以免多个版本同时运行。需要 Chrome 127+。旧版曾注入悬停浮层的网页应刷新一次。

## 使用与展示

- 右键链接、选中的网址或 HTTP(S) 页面，选择“使用 URL Loupe 检查”，直接打开原生工具栏弹窗，原网页保留。
- 点击工具栏图标检查当前网址，或在面板输入／粘贴网址，即时检查。省略协议的 `example.com/path` 默认按 HTTPS 解析。输入法组合期间不更新结果。
- 在地址栏输入 `host` 后按 Tab，再输入网址；回车打开独立检查页，不自动访问目标。
- 所有非 ASCII 域名字符标粉色。只有存在品牌候选时，才用金色标出实际差异，如 `rn` 与 `m`，并给出对应说明与参考来源。普通未知英文域名不再逐字高亮。
- 悬停、聚焦或点击已标记字符，可突出其对应解释。点击“检查详情”查看实际 ASCII/Punycode；点击“打开原网址”才在新标签页访问完整目标，保留路径、参数和片段，去除内嵌账号密码。

只有主动操作才检查，不注入网页内容脚本，不提供自动悬停浮层，不接管普通点击。Chrome 原生地址栏的颜色不能修改。

## 参考数据与边界

随包保留 6890 个完整 host 的精确匹配表，含 Google CrUX 2026-09 Top 5000 origin 分组提取的 4998 个 host；品牌比对覆盖 671 家公司及人工补充品牌。CrUX 域名仅用于精确匹配，不新增针对全部 CrUX 域名的模糊比较。

原始非 ASCII 字符始终提示，已收录域名不构成安全认证，未收录也不构成恶意判定。品牌比较使用启发式视觉骨架、拼写与注册域边界，可能误报或漏报。不查询线上信誉、证书或跳转链。只分析 HTTP(S) 的 host；路径、参数与身份信息不参与字符告警。mailto:、tel:、javascript:、file: 等协议不支持。

## 权限与隐私

仅申请 `activeTab` 和 `contextMenus`；无 content_scripts、host_permissions、遥测、账号、广告或持久化浏览记录。网址、品牌参考和 Unicode 数据均在本地处理；完整目标只在内存中传递，不写进检查页地址。刷新检查页或重启浏览器可能丢失“打开原网址”的完整目标，可重新检查。

隐私政策：https://loupe.zhaidewei.com/privacy.html

## 开发与分发

在仓库根目录运行 `npm run build` 和 `npm run test:extension`。`src/analyzer.js` 是共享字符源码，`src/extension-analysis.js` 是插件品牌适配；extension/analyzer.js 由构建生成，不手工维护副本。

运行 `node scripts/package-extension.mjs` 生成 manifest 位于根目录的上传 ZIP，store/ 保存商店文案与图片。尚未代用户提交商店。

## 来源与许可

Unicode confusables 16.0.0、punycode.js 2.3.1、tldts 与 CrUX 的许可均随包位于 vendor/；CrUX 数据采用 CC BY 4.0，其他数据和代码各自保留原许可。来源、快照和转换记录见仓库 data/。运行时不下载或执行远程代码。
