# Learnings

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
- 作用域: skill
- 标签: superpowers, skill-system, performance

---
## [LRN-20260405-N4C] category

**记录时间**: 2026-04-05T18:16:37Z
**优先级**: medium
**状态**: pending
**领域**: docs

### 摘要
元书皮肤有 jsonnet 源时误按编译产物版交付

### 详情
用户纠正后应严格遵循 hamster-skin skill：有 jsonnet 源文件的皮肤默认交付 jsonnet 源+图片资源，不包含生成的 light/dark 键盘 yaml；README 仅保留使用说明，常规由用户在元书 App 内长按运行 main.jsonnet 生成 yaml。

### 建议动作
（待补充）

### 元数据
- 来源: conversation
- 作用域: skill
- 基础路径: /var/minis/skills/self-improve/data
- 关联文件: (可选)
- 标签: (可选)

---
