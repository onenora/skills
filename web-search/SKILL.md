---
name: web-search
description: >
  网页搜索与正文提取合一技能：通过 Jina Reader / Defuddle 等免费代理服务抓取搜索结果与网页正文，
  无需 API Key、无需注册登录、纯 curl。支持 Google、Bing、Brave、DuckDuckGo、百度、Sogou 等引擎，
  按搜索意图选择优先链路并自动降级。当用户提到「网页搜索」「搜索一下」「帮我搜」「网上查一下」、
  「提取正文」「读取网页」「抓取文章内容」或需要从互联网获取实时信息时触发。
compatibility: curl (no API key, no registration required)
---

# web-search

纯 curl 实现，零注册、零 API Key、零登录。搜索与正文提取共用同一套「URL 前缀代理」手法。

## 抓取手法

**代理前缀**：把目标 URL 直接拼在服务前缀后面，`curl` 拉取即得干净 Markdown：

```bash
curl -s "https://r.jina.ai/https://www.google.com/search?q={encoded_query}"   # 搜索
curl -s "https://r.jina.ai/https://example.com/article"                        # 正文
curl -sL "https://defuddle.md/https://example.com/article"                     # 正文（首选）
```

- 查询词编码：`python3 -c "import urllib.parse; print(urllib.parse.quote('查询词'))"`
- URL 一律加引号，防 `&`/`?` 被 shell 解析；缺协议时先补 `https://`

---

## 搜索引擎

| 引擎 | 抓取方式 | URL 模板 | 优势 |
|------|----------|----------|------|
| Google | Jina | `https://r.jina.ai/https://www.google.com/search?q={query}` | 最全面 |
| Bing | Jina | `https://r.jina.ai/https://www.bing.com/search?q={query}` | 中文友好 |
| Brave | Jina | `https://r.jina.ai/https://search.brave.com/search?q={query}` | 隐私优先 |
| DuckDuckGo | Jina | `https://r.jina.ai/https://html.duckduckgo.com/html/?q={query}` | 轻量备用 |
| 百度 | Jina | `https://r.jina.ai/https://www.baidu.com/s?wd={query}` | 中文索引强 |
| Sogou | Jina | `https://r.jina.ai/https://www.sogou.com/web?query={query}` | 中文补充 |

强制中文结果时加 `-H "Accept-Language: zh-CN"`。

---

## 意图优先链

| 意图 | 优先链 |
|------|--------|
| 中文搜索 / 本地资讯（`zh_deep`） | 百度(J) → Bing(J) → Google(J) |
| 找官网 / 查原文（`web`） | Google(J) → Bing(J) → Brave(J) → DuckDuckGo(J) |
| 隐私优先（`privacy`） | Brave(J) → DuckDuckGo(J) → Bing(J) |
| 通用（`general`） | Google(J) → Bing(J) → Brave(J) |

`J` = Jina Reader

---

## 执行流程

1. 推断搜索意图，选择优先链
2. 对第一个引擎执行抓取：`curl -s "https://r.jina.ai/{搜索URL}"`
3. 检查成功标准（见下）
4. 失败 / 遇阻则切换下一个引擎
5. 返回第一个成功结果；可选附加第二源作对比
6. **深度阅读原文**：对重要链接触发正文提取（见下节）

## 正文提取

对搜索结果页里的重要链接，抓取干净正文（Markdown，无广告/导航）：

1. 首选 `curl -sL "https://defuddle.md/{目标URL}"`
2. Defuddle 失败 / 空返回时降级 `curl -s "https://r.jina.ai/{目标URL}"`

输出即干净 Markdown：用户要读就用来回答，要存就落盘。

---

## 成功标准

以下至少满足两条：
- 页面标题或 URL 明确指向结果页
- 提取文本非空且包含有意义内容
- 有结构化答案、结果列表、引用或相关问题
- 内容明显不是搜索首页

## Fallback 规则

遇到以下情况立即切换：captcha、验证、异常流量、robot、blocked、请稍候、访问受限、结果为空、内容明显无关。

## Notes

- 全程仅用 curl，无任何注册/登录/API Key；Jina 与 Defuddle 均为免费代理服务
- 不依赖单一引擎，fallback 是设计的一部分
- 正文提取与搜索同手法（前缀代理），无需独立技能
