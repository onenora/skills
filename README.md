# MinisSkills

A personal but shareable collection of Minis skills, organized to stay close to the official OpenMinis `MinisSkills` repository style while preserving local workflows and domain-specific utilities.

## Repository layout

```text
skills/
├── README.md
└── <skill-name>/
    ├── SKILL.md
    ├── scripts/      # optional executable helpers
    ├── references/   # optional reference docs
    ├── assets/       # optional static assets
    ├── evals/        # optional test cases
    └── data/         # optional runtime/public knowledge files for special skills
```

## Conventions

- Directory names use lowercase kebab-case, matching the `name` in frontmatter.
- Every skill includes `SKILL.md` with YAML frontmatter (`name` + `description`).
- Scripts go in `scripts/`, docs go in `references/`, static files go in `assets/`, and test prompts go in `evals/`.
- Repository content should not contain secrets, private tokens, cookies, personal credentials, or private-only links that break in public use.
- Book-source skills (`*booksource` / `*-sources`) stay environment-agnostic: no Minis/iSH-specific claims in frontmatter, verification commands are runnable anywhere (Python 3 / Node).

## Current skills

- heart-sources      # 用心读书(Read With Heart)书源开发
- legado-sources     # Legado/阅读书源生成与清洗
- self-improve       # 错误记录与自我改进闭环
- skill-creator      # 创建与维护 skill 规范
- web-search         # 网页搜索与正文提取（Jina/Defuddle，零注册）
- xiangse-sources # 香色阅读(StandarReader)书源生成与验证

## Skill writing standard used in this repository

Common book-source skills follow this body structure (see `xiangse-sources` / `legado-sources` / `heart-sources`):

1. `# <Skill Title>` + one-line purpose (fail-closed principle)
2. `## 书源格式（JSON 骨架）`
3. `## 写源必备约束` (field types, crash/critical rules, rule syntax)
4. `## Convert and verify` (runnable CLI commands)
5. `## Delivery status` (`need_input` / `fail` / `blocked` / `pass`)

Other skills keep the generic layout: `When to use` → `Workflow` → `Scripts` → `References` → `Output` → `Notes`. Not every skill needs every section, but new edits should stay close to one of these two patterns.
