# 阅读（Legado）书源 → 用心读书（RWH）转换

输入：Legado 书源 JSON（`bookSourceUrl/bookSourceName/searchUrl/ruleSearch/ruleBookInfo/ruleToc/ruleContent/ruleExplore/jsLib`）。输出 RWH V2 对象。

## 顶层映射

| Legado | RWH |
|---|---|
| `bookSourceName` | `siteName` |
| `bookSourceUrl`（域名根） | `host`（保留协议） |
| `header` | `header`（保留 UA/Referer/Cookie 常量） |
| `loginUrl` / `loginCheckJs` | `loginUrl`（支持规则语法） |
| `enabledCookieJar` | `forbidCookie: false`（默认） |
| `cookies` | `cookies`（勿写私人值） |
| `jsLib` | `publicJavascript`（java.* 需改写，见 JS 改写） |
| `bookSourceGroup`/`bookSourceComment`/`bookUrlPattern` | `remarks` |

## 规则段映射

| Legado | RWH |
|---|---|
| `searchUrl`：`{{key}}`→`@{keyword}`、`{{page}}`→`${pageIndex}`、POST 参数/header 原样 | `ruleSearch.url` + `params` |
| `ruleSearch.bookList/name/bookUrl/bookAuthor` + `ruleExtra.*` | `ruleSearch` 同名；`coverUrl/intro/classify/status/lastChapterName` → `ruleExtra.*` |
| `ruleBookInfo.tocUrl` | `ruleBookInfo.chapterListUrl`（为空回退详情地址） |
| `ruleBookInfo` 其余字段 | `ruleBookInfo` 同名（bookName/bookAuthor/ruleExtra.*） |
| `ruleBookInfo.init/bookInfoInit`（AllInOne 正则或 JS） | `ruleBookInfo.request @js:` 或改写保留 |
| `ruleToc.chapterList/chapterName/chapterUrl` | `ruleChapter` 同名（章节旧名 `url` 等效，优先 `chapterUrl`） |
| `ruleToc.nextTocUrl` | `ruleChapter.next` |
| `chapterList` 首位 `-` 反序 | RWH 无反序标记 → `response @js:` 内 reverse |
| `ruleContent.content` | `ruleContent.contents` |
| `ruleContent.replaceRegex`（`##a#b` 循环替换） | `ruleContent.cleaner` 或 `##a##b`（全局替换） |
| `ruleContent.nextContentUrl` | `ruleContent.next` |
| `ruleContent.webJs` | `ruleContent.request/response @js:` |
| `ruleExplore` | `ruleFinder`：bookList/name/bookAuthor/coverUrl/bookUrl 同名；`{{page}}`→`${pageIndex}`；无筛选取 `list: []` |

## 选择器转换（CSS/Jsoup → XPath）

| Legado | RWH |
|---|---|
| class/jid 型 `class.item` | `//*[contains(@class,'item')]`（xpath）或直接 `css` 引擎 |
| `id.x` | `//*[@id='x']` 或 css `#x` |
| `tag.a`、`tag.a@href`、`img@src` | `//a`、`//a/@href`、`//img/@src` |
| `@text`/`@textNodes` | `text()` |
| `@css:`/`@xpath:`/`@json:`/`$.`/`//` 前缀 | RWH 一律按段 `engine` 执行（xpath/jsonpath/css），不必写前缀 |
| `##a#b`（循环） | `##a##b`（全局）或 `cleaner`；`##a` 过滤语义相同 |

## JS 改写

- `java.ajax/java.get/post` → `await app.get/post({url,params,header})`（Promise 必须 await）。
- `java.put/get`、规则 `@put/@get` → `@get{}`/`@put{}` 数据层；JS 内裸 `put()/get()` V1 兼容可用。
- `java.select/@Jsoup` 解析 → `app.doc(html)` + `document.select`，或直接交给字段引擎。
- `book.xxx/chapter.xxx` 上下文 → `config.bookUrl/bookName/chapterName/chapterUrl` 等。
- 编码：`requestEncode/responseEncode`（gbk 站保留）。
- `java.t2s` → `App.nlp.chs`；`java.md5` → `app.md5`；Base64/时间 → `app.base64`/`App.time`。

## 转换后必检

- `source-check.py` PASS（必填最小集；废弃字段：`baseUrl`→`host`、`lines`→`contents`、`encode`、`list`→`chapterList`、`name`→`chapterName`、`imageUrl`→`coverUrl`）。
- `{{key}}`/`{{page}}` 占位符已替换为 `@{keyword}`/`${pageIndex}`；`header/cookies` 为对象。
- 正文为音频流（听书）：`type` 设 `4`（真实源）或 `2`（schema），`ruleContent.playUrl` 取音频地址。
- 富文本可选增强：正文含图片/段评/批注时输出 `<img>`/`<comment>`/`<note>` 标签。