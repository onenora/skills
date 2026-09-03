# 项目记录

## heart-sources 技能（2026-08 重写为「AI 全自动写源」）

目标：全靠 AI 自动生成用心读书书源。乔齐官方上游 2026-08（freenovel123/read-with-heart-docs + common.js）。

- **SKILL.md 单主文件**：骨架 + 字段合同 + 12 条 V2 硬约束（表达式 `${}/@{}`、`<js>` vs `@js:`、`@all`、字段流水线、Header 二选一非合并、Cookie 优先级、地址传递、前置请求 `respones`/preRequestType、toolsUrl/commentUrl、URL host 补全/图片附头/domains、富文本 `<img>/<comment>/<note>`、Native 函数、openParams、page vs next、发现 selectList）+ 生成决策 + 验证 + 交付状态。
- **移除**：references/kb（并入 protocol.md）、schema/rules/workflows（并入主文件）、index/site-template/url-patterns/xpath-patterns/practice-README、`minis://` 与 `/var/minis/` 平台依赖。
- **保留**：references/protocol.md、references/web-api.md、site-template.full.json、practice/gbk-demo-source.json、scripts/source-check.py、evals/evals.json。

## 真实书源验证结果（2026-08-21，5 源 + App 空模板）

- 5 个在用书源（签名 API / XPath 过盾 / 本地解析 / 代理正文+段评 / AES 解密 API）source-check 全 PASS；空模板 FAIL（正确，need_input）。
- **无接口过时**：书源 JSON V2 字段结构与官方 2026-08 文档一致（requestType/mark/aliasName/toolsUrl/commentUrl/chapterTime/openParams 均在用）。
- **修 source-check BUG**：`type:0`/`version:0` 为合法值但被真值判断误报缺失 → 顶层改按键存在判断。
- **补 6 项真实源能力**（protocol §7.5 / SKILL 约束 8、9）：`{{}}`+`<js>`+`##` 同字段组合；字段 XPath 函数式写法（XPath 2.0 子集）；JSONPath 递归 `$..`/负索引 `[-1]`/`.data.*` 展开；CryptoJS 运行时内置；段评真实链路（相对 ident/src 拼 host、openParams+review=1）；多正文源/代理模式（request JS 改 url + openParams token 注入 Bearer）。

## 听书源支持（type 4）

App 支持听书源，技能扩为「文本（type:1）+ 听书（type:4）」：`type` 接受 0/1/4；`type=4` 时 `ruleContent.playUrl` 校验必填（音频地址递归 jsonpath、相对地址按 host 补全、playUrl 空则用正文 URL/Header）；目录/详情/搜索结构不因 type 变化。写法参考其他作者同站同结构书源（接口未实测）。

## 脱敏

- 测试书源仅用于调试、不入库（tests/ 已删除，.gitignore 已清理）。
- 实践样本由真实站改名 `gbk-demo-source.json` 并脱敏（站名/域名/author/remarks）；个人域与设备 ID 不入库。

## 验证

- source-check.py `py_compile` 通过；`site-template.full.json`、`practice/gbk-demo-source.json` 均 PASS。
- 依赖：python3。