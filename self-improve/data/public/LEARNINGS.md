# Learnings

## [LRN-20260317-EUC] shell-invocation

**记录时间**: 2026-03-17T14:05:12Z
**优先级**: medium
**状态**: pending
**领域**: minis-skill

### 摘要
Minis 中脚本优先通过 `sh` 显式调用

### 详情
在 Minis/iSH 环境中，skill 脚本不应依赖执行权限或 shebang 行为。更稳妥的调用方式是：`sh /var/minis/skills/self-improve/scripts/minis_auto_log.sh init`。

### 元数据
- 来源: conversation
- 标签: shell, minis, execution

---

## [LRN-20260317-HMO] skill-log-location

**记录时间**: 2026-03-17T14:43:15Z
**优先级**: medium
**状态**: pending
**领域**: minis-skill

### 摘要
self-improve 日志固定存放到 skill data 目录

### 详情
Minis 项目目录判定不稳定，默认不依赖 shell 工作目录。日志固定存放到 `/var/minis/skills/self-improve/data`；项目级与公共区作为显式可选作用域（--project / --public）。

### 元数据
- 来源: conversation
- 作用域: skill

---

## [LRN-20260328-001] superpowers-skill-consolidation

**记录时间**: 2026-03-28T15:00:00+08:00
**优先级**: high
**状态**: pending
**领域**: minis-skill

### 摘要
Superpowers 14个独立 skills 整合为单一入口 + 子文件结构

### 详情
Minis skill 系统只扫描 `/var/minis/skills/<name>/SKILL.md` 一级结构，无法嵌套。
将 14 个 superpowers skills 整合为：
- 主入口：`/var/minis/skills/superpowers/SKILL.md`（description 覆盖所有触发条件）
- 子文件：`brainstorming.md` / `systematic-debugging.md` 等 11 个文件按需 file_read 加载
- 删除3个 Minis 不适用的：dispatching-parallel-agents、using-git-worktrees、using-superpowers

效果：索引 token 从 22 条 description → 1 条，子 skill 内容按需加载。

### 元数据
- 来源: conversation
- 标签: superpowers, skill-system, performance

---
