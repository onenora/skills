# 项目记录

## xiangse-sources 技能

- `SKILL.md`：Codex/pi/Claude 通用 frontmatter；书源骨架（四核心 action）、硬约束（weight 字符串 / bookWorld 字典禁 categories 数组 / requestFilters 字符串 / 禁 Legado 字段 / responseFormatType 禁 text）、requestInfo（替换式 / `%@result` / `@js:`）、XPath 双斜杠、分页与 moreKeys、解密边界、转换命令、交付状态。
- `scripts/xbs.js`：XXTEA XBS ↔ JSON CLI（decode/encode/roundtrip/selftest），**零依赖纯 JS**（Node 内置 fs/crypto）。同时导出模块 API：`jsonToXbsBytes` / `xbsToJsonBytes` / `encryptWords` / `decryptWords`。
- `README.md`：3 行说明。

依赖：无（Node 内置模块即可）。

## 黑岩书源验证（heiyan-m-v1）

用该 skill 对 http://www.heiyan.org/（黑岩阅读）执行写源验证。站点直连超时，改用 Wayback Machine 快照（2020-2021 真实页面）验证，四步链 fixture 模拟通过。

产出：`heiyan/heiyan-m-v1.xbs`（对应 `heiyan-m-v1.json`），sha256 `a25967a509e405ecee5a91558120e2f65f7f7cfc525d9ac8ca57e0a529452952`。

技术要点：host 用手机版 m.heiyan.org（章节链接绝对路径，规避相对链接补全）；搜索 POST `/wap.php?action=search`（wd+objectType=2）；详情/目录用 og meta 与 `.book_info`/`.book_last`；正文 `.page-content`；目录分页由真实「下一页」链接驱动。

验证边界（如实记录）：①搜索结果页无存档，列表结构按同模板书库页推断；②2017 正文快照含广告注入，现站需实测；③官方 App 未实测 → 交付状态 `blocked`（非 pass）。

## 致谢

本技能为独立新实现，部分思路参考 [cloudmantou/xiangseSkill](https://github.com/cloudmantou/xiangseSkill)，非原 skill 复刻。
