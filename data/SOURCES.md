# 公司官网参考数据来源

此参考集用于 Host Lens 的域名相似度提示。公司和网址来自 Wikidata 社区记录，未逐家独立核验官网、域名所有权、网站当前内容或实时上市状态。收录不代表安全认证；未收录不代表可疑。

## 采集和选择

- 候选查询：`candidates.sparql`；原始结果保存在 `wikidata-candidates.json`。查询 Wikidata 的 P414（证券交易所）和 P856（官网），按 sitelinks 降序选择最多 1000 名、且 sitelinks > 20 的候选，再要求存在官网。实际候选数可能小于 1000。
- 声明校验：通过 Wikidata 官方 `wbgetentities` API 获取候选实体的 P414、P856、P576（解散日期）、P31（类型），保留原声明 ID、等级、限定词及引用。可复查快照在 `entities/batch-*.json`；每批记录采集时间、原始请求 URL 和实体修订号。
- 排除：有非弃用且已经发生的 P576 解散日期；没有仍可用的 P414 声明；没有仍可用 HTTP(S) P856 声明。P414 与 P856 的弃用声明、已过 P582 结束时间、未来 P580 开始时间均剔除。
- 网址仅解析 HTTP(S) hostname，不访问网址，不跟随跳转；移除 `www.` 前缀、转为小写后按公司去重；保留原始网址和来源声明。排除带凭据、IP 字面量、无点 hostname 及解析失败的网址。
- 最终按 sitelinks 降序取最多 750 家，以 QID 区分公司；不同公司可能共用域名。精确数量、采集时间和剔除原因见 `import-report.json` 与 `../public/companies.json`。

## 证据边界

P856 官方定义包括“当前或曾经的官网”；历史网址可能被保留。缺少结束时间不证明网址当前有效，缺少退市记录也不证明公司仍上市。实体原始记录可能迟报退市、收购、解散、官网迁移，或包含地域站点、品牌站点、旧域名及错误声明。这里的规则仅过滤来源已明确标注的历史声明。

sitelinks 是跨语言百科条目数量的代理指标，不是市值、交易量、全球品牌排名或投资建议。候选查询使用 Wikidata 查询服务，实体快照使用 Wikidata API；两者索引时间可能不同。参考集没有保证国家、行业或交易所覆盖完整，也未使用交易所名册逐项交叉验证。

## 复现

需 Node.js 22+，不需安装依赖。在项目目录运行：

```sh
node scripts/import-companies.mjs
```

此命令默认复用已保存的候选及实体快照，可离线重建。重新获取实体声明可加 `--refresh`，会更新本地快照；可用 `--input /absolute/path/candidates.json` 指定另一份同格式 SPARQL 结果。请求串行并尊重 HTTP 限流重试，不访问公司官网。

重新取得候选（联网、会覆盖候选快照）：

```sh
curl --max-time 90 --fail --get 'https://query.wikidata.org/sparql' --data-urlencode 'query@data/candidates.sparql' --data-urlencode 'format=json' -H 'Accept: application/sparql-results+json' -H 'User-Agent: HostLensResearch/0.1' -o data/wikidata-candidates.json
node scripts/import-companies.mjs --refresh
```

## 原始来源与授权

- [Wikidata P414：证券交易所](https://www.wikidata.org/wiki/Property:P414)
- [Wikidata P856：官网及历史官网](https://www.wikidata.org/wiki/Property:P856)
- [Wikidata P582：结束时间](https://www.wikidata.org/wiki/Property:P582)
- [Wikidata P576：解散日期](https://www.wikidata.org/wiki/Property:P576)
- [Wikidata API](https://www.wikidata.org/w/api.php)
- [Wikidata 数据授权（结构化数据 CC0）](https://www.wikidata.org/wiki/Wikidata:Licensing)

每家公司还保留 `sourceUrl`、QID、采集时间，网址保留具体 P856 来源和声明 ID。`verificationStatus: wikidata_record` 表示社区来源记录，界面应始终保留这一来源边界。
