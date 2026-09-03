# 项目记录

## legado-sources 技能（2026-08-13 优化）

参考 `-sources` 系书源技能结构重写 SKILL.md，把散在 references 里的硬约束提炼进正文：

- **书源格式（JSON 骨架）**：最小完整示例；强调交付物必须数组包装（单对象无法导入）。
- **写源必备约束**：顶层必填七字段、子规则最低要求、登录/发现页默认策略、bookSourceComment 默认不写调试说明。
- **规则语法要点**：URL 后 JSON 选项拼接、JSON.stringify value 必须 String、bookInfoInit 边界、chapterList `-` 反序、nextTocUrl 数组与停止条件、正文图片附头、book/chapter 上下文对象、@put/@get 与 java.put/java.get 边界、生成决策顺序 1-5。
- **Convert and verify**：legado-sim.js 完整命令 + Flow（生成 → sim 端到端 → 交付 → App 实测）。
- **Delivery status**：need_input / fail / blocked / pass，pass 必须 legado-sim + 官方 App 双重实测，模拟器通过但未实测只报 blocked（对齐 fail-closed 原则）。

原有内容保留：scripts（legado-sim.js / analyze_and_clean.py）、references 索引、批量治理与单站点输出路径、Examples、调试协作（search_src/book_src/toc_src/content_src 证据收集）。

## 验证

- legado-sim.js `node --check` 通过；analyze_and_clean.py `py_compile` 通过。
- 依赖：node（legado-sim.js）、python3（analyze_and_clean.py）。
- references/ 内容未改动，仅 SKILL.md 结构重写。

## 极简重写（2026-08-21）

重写为极简小说版：视频/漫画/聚合一律不做；跨 iOS+安卓优先通用函数；段评可选用 jsLib 通用路线（ruleReview 部分 fork 已禁）；发现页可加。
