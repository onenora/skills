# 项目记录

## heart-sources 技能（2026-08 重写为「AI 全自动写源」）

目标：AI 自动生成用心读书书源。对齐上游 `freenovel123/read-with-heart-docs`（2026-08）+ `common.js`。

- **SKILL.md 单主文件**：骨架 + 字段合同 + V2 硬约束（表达式/流水线/Header 二选一/Cookie 优先级/地址传递/前置请求 `respones`/toolsUrl·commentUrl/URL 补全/富文本标签/Native/openParams/page·next/发现）+ 验证 + 交付状态。
- **移除**：references/kb、schema/rules/workflows（并入）、index/site-template/url-patterns/xpath-patterns、`minis://` 与 `/var/minis/`。
- **保留**：protocol.md、web-api.md、site-template.full.json、practice/gbk-demo-source.json、source-check.py、evals、refactor-beautify.md（重构清单）、convert-from-legado.md（阅读→RWH 映射）。

## 真实书源验证（2026-08-21，5 源 + App 空模板）

- 5 个在用书源 PASS，空模板 FAIL（need_input）。
- 无接口过时：V2 字段结构与官方 2026-08 文档一致。
- 修 source-check：`type:0`/`version:0` 合法值误报缺失。
- 补真实源能力：`{{}}`+`<js>`+`##` 组合、字段 XPath 函数式、JSONPath `$..`/`[-1]`、CryptoJS 内置、段评相对路径拼 host、多正文源/代理。

## 听书源（type 2/4）

`type` 取值 0=未设置/1=文本/2=听书（官方 schema）/4=听书（真实源，两者接受）。type 2/4 时 `ruleContent.playUrl` 校验；结构不因 type 变化。

## 规则能力与 schema（对齐官方实现）

- `@tools{}` 工具函数表；`${}` V2 表达式求值（算术/拼接）；字段求值顺序 基础→@get→${}→@{}→@tools→{{}}→<js>→##；`{{}}` 按内容前缀选 jsonpath/xpath；JSONPath 支持切片/过滤。
- Native：bcrypt/setTimeout/socket 三参/`get·post` 支持 timeout 秒/OS code 0·401·402·408/sp.put 支持对象并按 siteIdent 隔离/公共 JS 加载顺序（CryptoJS 恒可用）/JS 超时 30s。
- schema：必填最小集（search=url+bookList、chapter=chapterList、content=contents、至少一规则段），其余字段为建议；废弃 imageUrl/章节旧名 url；header/cookies 必须对象。

## 脱敏

测试书源仅调试不入库（tests/ 已删）；实践样本改名 gbk-demo-source.json 并脱敏（站名/域名/author/remarks）。

## 验证

- source-check.py `py_compile` 通过；site-template.full.json、practice/gbk-demo-source.json PASS；4 组边界用例（官方最小集/type 非法/无规则段/header 数组）符合预期。
- 依赖：python3。