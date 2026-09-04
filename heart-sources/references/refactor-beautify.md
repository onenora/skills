# 书源重构与美化（Refactor & Beautify）

适用：既有可用书源存在重复内联 JS、结构臃肿、发现页散乱。目标「简洁优化」。

1. **审计重复**：全局搜相同 JS 段按出现次数排序，重复 ≥2 处提取；单处小逻辑（状态/时间/清洗）也建议提取保持字段干净。
2. **提取到 publicJavascript**：站点前缀命名（`ixdzsXXX`/`tfbookXXX`），**禁通用名**（`getSign`/`formatTime`）；常量用 `var 前缀_XXX`；每函数单一职责；空值保护 `config.bookUrl||''`、`String(html||'')`；环境防御 `typeof get==='function'`。
3. **内置能力直接用，不二次封装**：`app.md5`、`app.base64`、`App.time`、`App.nlp.chs`、`CryptoJS`。
4. **字段收敛为单行**：`request/response` → `@js: return 前缀XXX(config);`；`respones` → `@js: return 前缀XXX(html);`；字段级 `<js>` 单行调用公共函数。
5. **签名/算法等价自测**：固定输入跑重构前后，输出（MD5/URL/拼接串）逐字符一致才交付；手写 order 数组与 `Object.keys().sort()` 先验证排序一致性。
6. **时间统一**：`App.time(秒, fmt)`；毫秒 `>1e12` 转秒；不用 `toLocaleString`。
7. **正文清洗入公共函数**：去标签 → 实体转义(&nbsp; &amp; &#\d+;) → 行内空白/空行整理 → 行首独立章节标题行 → `App.nlp.chs()`（try/catch）。自测三例：含标题行清理干净 / 纯正文不动 / 文中标题不误删。
8. **发现页板块**：同接口仅参数差的板块合并为参数化筛选；`structure` 用 `@{_类型}` + `${pageIndex}`；`request @js` 读 `config._类型` 当前选中值；筛选项 value 逐项实弹，0 结果项剔除（不留空壳板块）。
9. **兼容红线**：jsonpath 嵌套双展开 `$.a[*].b[*]` 引擎可能不识别 → 改递归 `$..b[*]`（实测可用）；保持接口路径/参数/字段/uuid 不变；source-check 的 WARN/FAIL 如实告知用户而非强改。