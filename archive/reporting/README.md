# 历史举报审核原型

当前网站与插件不使用这组代码。默认 `npm start` 只提供静态文件，不创建数据库。

保留此原型用于复查过去的举报／审核流程；已有 `runtime/reports.sqlite*` 未移动或删除。

- 隔离测试：`npm run test:archive`
- 读取历史审核队列：`node archive/reporting/review.mjs list`
- 如确需启动原型：`node archive/reporting/server.mjs`。默认仅监听本机；启动前确认端口空闲。

原型不属于 Cloudflare 网站或 Chrome 上传包。不要用手工复制单个 SQLite 主文件代替 WAL 数据库备份。
