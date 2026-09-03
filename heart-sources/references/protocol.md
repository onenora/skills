# 用心读书 V2 协议细节（对齐上游 2026-08-17）

权威：官方文档 https://freenovel123.github.io/read-with-heart-docs/（freenovel123/read-with-heart-docs）、工具库 https://github.com/freenovel123/common.js。上方 SKILL.md 已列硬约束，本页只余细节表。

## 1. `config.*` 键总表（编辑器可写）

| 键 | 场景 |
|---|---|
| `config.url` | 当前首屏请求地址 |
| `config.method` / `mode` / `engine` | GET/POST / http\|webview / xpath\|jsonpath\|css |
| `config.header` / `cookies` / `params` | 合并后请求头 / Cookie / 显式参数 |
| `config.keyword` / `pageIndex` | 搜索词 / 页码 |
| `config.bookUrl` / `bookName` / `bookAuthor` | 书籍（章节、正文） |
| `config.chapterUrl` / `chapterName` | 章节（正文） |
| `config.infoUrl` | 详情地址（详情、章节列表） |
| `config.siteIdent` / `host` / `siteName` | 站点标识 / 主地址 / 名称 |
| `config.jsLib` / `openParams` / `verifyCode` | 公共 JS / 开放参数字典 / 验证码 |
| `config.deviceId` | App 设备标识（勿上传非必要第三方） |
| `config.selectList` / `filters` | 仅发现场景筛选当前选中（见 SKILL 硬约束 12） |

系统内置 JS：`console.log(...)` = `App.log(...)`；`unicode.decode()` = `App.unicode.decode()`。规则/公共/request/response JS 中还有全局 `get(key)` / `put(key, value)`（V1 兼容数据 API，V2 仍可用，与 `@get{}`/`@put{}` 同一存储层；官方文档只保证 `@get{}` 与 `app.sp.get`，新写代码优先用 `@get{}`，迁移旧源保留 `typeof get === 'function'` 防御即可）。

**系统 get 参数表**（`@get{}` 全局可用）：`keyword`(搜索)、`preResHeaderN/preRepHeaderN`(前置请求头/响应头)、`resHeader/repHeader`(当前请求/响应头)、`loginRequest/loginResponse/loginCookies`(登录后自动保存)、`verifyHeader/verifyCookies`(过盾后)、`bookUrl/chapterUrl`(上下文地址)、`host`。

## 2. toolsUrl / commentUrl 支持形式

| 形式 | 写法/返回值 | 请求头 |
|---|---|---|
| 直接 URL | `https://x.com/t?id=1` | 场景 header |
| 相对 URL | `/t?id=1` | 场景 header（按 host 补全） |
| 同步 `@js:` | `@js:return config.url + '/tools';` | 场景 header |
| 异步 `@js:` | `@js:const r = await app.get({...}); return r.url;` | 场景 header |
| URL+尾随 Header | `URL,{"header":{"X-Token":"abc"}}` | 尾随覆盖同名 |
| 返回对象 | `return {url, header};` | 对象 header 覆盖同名（推荐） |
| 直接 `@html:` | `@html:<html>…</html>` | 只保证 Cookie |
| `@html:`+尾随 | `@html:<html>…</html>,{"header":{…}}` | Cookie 可写；非 Cookie 头不用于子资源 |
| JS 返回 HTML | `return '@html:…';` 或 `return {html, baseURL};` | 只保证 Cookie |

- 异步必须 `await`；等待上限 30s；失败/空值/无效 URL → “地址无效”。
- 需要完整请求头（Authorization/Referer/UA/Token）时优先返回 URL，不用 HTML。

## 3. 前置请求字段表

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `url` | String | 必填 | 支持 `${}` `@{}` `@get{}` `<js>` 正则 |
| `method` | String | GET | GET/POST |
| `mode` | String | http | 需要 WebView 时 `webview` |
| `header` / `params` | Object | 空 | value 可用规则语法 |
| `request` | String | 空 | `@js:` 改请求配置 |
| `response` | Object | 空 | `engine`(xpath/jsonpath/css) + `put`(key→规则，value 可用 `<js>` 后处理) + `respones`(响应 JS 处理，String，支持 `@js:` 前缀，参数 `html`) |
| `preRequestType` | Number | 0 | 0 常规 / 1 浏览器过盾 / 2 图片验证码 |
| `forbidCookie` / `forbidSSL` / `forbidRedirect` | Boolean | false | — |
| `filterErrorCodes` | Array | 空 | 只过滤 HTTP 状态码 |
| `domains` | String/Array | 空 | 额外 Cookie 收集域名（登录/过盾） |

自动保存：`preUrlN` / `preResHeaderN` / `preRepHeaderN`（N≥1）；过盾 `verifyHeader`+`verifyCookies`；验证码 `config.verifyCode`。读取：`@get{preUrl1}`、`@get{preRepHeader1.contentType}`、`@get{key}`（支持对象子路径、递归）。自定义 key 避免与内置 key 冲突。

登录 Cookie 自动加入正式/分页/前置/段评/章评；`forbidCookie:true` 关闭。分页请求继承正式请求已选 Header（沿用，不重新选公共 header）。

App 生成模板附加字段：`ruleSearch.requestType`(规则类型，默认 0) 与 `ruleSearch.mark`(备注标记) 保留原值即可，不参与规则求值；`ruleFinder` 为数组、`openParams` 为数组、`cookies` 为对象。

## 4. Native 方法表

| 方法 | 说明 |
|---|---|
| `doc(html, clean)` | v2.6.0+ Document；`select("css")` 返回数组，`first()/last()/text()/attr()` |
| `log/toast/showDialog/handleError` | 调试与交互 |
| `post/get({url, params, header})` | Promise，必须 await；响应 `responseBody/requestHeader/responseHeader/cookie` |
| `socket(path, protocols)` | open/text/binary/close/push/finished |
| `uuid()` | UUID |
| `strToBytes/bytesToStr(bytes, code)` | code utf-8/gbk |
| `string.toGBK/toUTF8` | 编码转换 |
| `sp.put/get/delete(key, value)` | 本地存储；V2 无裸 `getValue` |
| `base64.encode/decode/decodeToBytes` | Base64 |
| `md5/sha1/sha224/sha256/sha384/sha512(data)` | 小写十六进制 |
| `aes.encrypt/decrypt(data, key, iv)` | Base64 输出 |
| `rsa.encrypt(data, pub)/rsa.decrypt(data, pri)` | 非对称 |
| `nlp.cht/chs` | 简繁 |
| `time(unix, 'yyyy-MM-dd HH:mm:ss')` | 时间戳；秒/毫秒，毫秒先 `>1e12 ? v/1000 : v` |

## 5. 富文本标签属性表（书源只输出标签，不写 App 代码）

| 标签 | 属性 | 约束 |
|---|---|---|
| `<img>` | `src`(必) `width` `height` `ident`(点击 URL) `alt` `style` | 自闭合；网络图/SVG 必须显式宽高；`src`/`ident` 可尾随 `,{"header":{...}}`；SVG 不支持内联 `<svg>`，可用 `.svg`/`data:image/svg+xml`/`svg=1` 接口 |
| `<comment>` | `ident`(可选：业务 ID / 完整 URL / URL+header) `count` | 自闭合；count 须 >0 整数；「不指定 ident 只按 paragraphIndex」 |
| `<note>` | `type`(manual/remote 默认) `text`(必) `ident`(remote 必) `id`(manual 必) `label` `autoHeight` | 自闭合；整行独占；受 App `enableNote` 开关控制 |

富文本格式：`---CATALOG---` + 标题 + `---CONTENT---` + 正文（CSS 只写一次到开头，自动缓存；字体用相对单位 em 不用 px；内置字体 `SourceHanSB`/`FZGWKTGBK`，自定义字体须先导入 `bookFont` 且名称一致）。

## 6. openParams 与 loginUrl `@html:`

- 定义字段：`name` / `key` / `value` / `defaultValue` / `type`(input/single/multiple) / `options`。
- 运行时：`config.openParams` = `[String:String]`（多选逗号分隔，JS 内自行 split）；`type`/`options` 结构信息仅本地配置页渲染开放，不是 JS 对象属性。
- 写回：JS `window.ParsingBook.setOpenParamValue(key, v)` / `setOpenParamValues({...})`；HTML 事件 `@setOpenParams('k','v')`。
- `loginUrl` 本地 `@html:` 可用：`@{siteName}` `@{siteIdent}` `@{host}` `@{deviceId}` `@{openParams.x}`；尾随 `,{"domains":[...]}` 收集额外域名 Cookie；是本地页范式时 `window.ParsingBook` bridge 可用。

## 7.5 听书源（`type 2/4`）与真实源验证能力细节

**听书源**（参考源：同站同结构，搜索用 `request @js:` 改 `config.url/params` 区分音书类型）

- `type: 2`（官方 schema：0=未设置/1=网络文本/2=听书）或 `type: 4`（真实书源在用）；`ruleContent.playUrl` 提取音频地址（jsonpath 深度递归 `$..` 可用，如 `$..content`）；相对地址自动按 host 补全；`contents` 可给文本/歌词（可空）。
- playUrl 为空时 App 用正文 URL 与正文 Header（官方规则字段定义）；音频需要请求头时写 `ruleContent.header`。
- 目录 `chapterUrl` 与小说一致（`api/content?tab=听书&item_id={{itemId}}` 只差业务参数）；搜索/详情/目录结构不因 type 变化。

**规则实现细节（官方实现）**

- **`@tools{fn(...)}` 工具函数**：`timestamp()` / `timestampMs()` / `formatTime(fmt)` / `urlEncode(s)` / `urlDecode(s)` / `base64Encode(s)` / `base64Decode(s)` / `md5(s)` / `sha256(s)` / `uuid()` / `random(min, max)`。在普通字段规则中直接书写；调用失败保留原文。
- **`${}` V2 表达式求值**：`${pageIndex + 1}`、`${pageIndex * 20}`、`${host + "/api"}`；`${}` 空值保留原文，`@{}` 空值置空。
- **字段求值顺序**（官方 executor）：基础规则/`@all` → 变量替换 `@get{} → ${} → @{} → @tools{}` → `{{}}` 提取 → `<js>` → `##正则`；`{{}}` 按内容前缀 `{`/`[` 自动选 jsonpath，否则 xpath。
- **JSONPath 能力**（jsonpath-plus 引擎）：递归 `$..x`、对象值展开 `.*`、切片 `[0:3]`、过滤 `[?(...)]`。
- **公共 JS 加载顺序**：prototype.js → crypto.min.js → common.js → publicJavascript（CryptoJS 因此恒可用）；V2 JS 超时 30s（V1 120s）。
- **app.sp.put 值类型**：String/Number/Object/Array/Date/Data；禁 null/undefined/Function；putData 按 siteIdent 隔离、UserDefaults 持久化，JS 写入后可用 `@get{}` 读。
- **app.get/post 底层**：`OS.get/post(params, cb)` 回调 code 0=成功/401=缺参/402=网络/408=超时；请求参数支持 `timeout`（秒）。
- **schema 校验要点**：type=0/1/2（4 为真实源听书）；必填最小集 search=url+bookList / chapter=chapterList / content=contents，至少一个规则段；header/cookies 必须对象；未知字段提示；废弃字段 baseUrl/list/name/章节 url/url/lines/encode/imageUrl。
- **听书 type 值差异**：官方 schema=2，真实源=4，以 App 实际为准（source-check 两者都接受）。

**运行 >1 年的样本实证**

- **`{{}}` 规则与字段组合**：字段值可以是 `固定前缀 + {{当前引擎规则}} + <js>`，如实测 `https:{{.//div[@class='book-img-box']/a/img/@src}}<js>return fixCover(value);</js>`（xpath）、`/reader/{{$.itemId}}`（jsonpath）、`//h3/a/@href##\\/\\/www\\.example\\.com\\/`（正则过滤后交给 host 自动补全）。确定替换 `@{}`、`${}`、`{{}}`、`<js>`、`##正则` 可按序写在同一条字段规则里。
- **字段 XPath 支持函数式写法（XPath 2.0 子集）**：实测 `substring(substring-before(substring-after(./a[@class='chapter-name']/@title, '首发时间：'), ' 章节字数'), 1, 16)` 作 chapterTime。规则中可直接用 `substring/before/after/concat/string-length` 等函数。
- **JSONPath 特性**：实测递归 `$..content`、对象值展开 `$.data.data.*`、负索引 `$..chapterListWithVolume[0][-1].firstPassTime` 均可用。
- **CryptoJS 运行时内置**：实测 `CryptoJS.enc.Base64/Hex.parse`、`CryptoJS.AES.decrypt(...)`（CBC/Pkcs7）在规则 JS 直接可用（无需导入）；与 `app.md5` 并存。common.js 仓库的 crypto.min.js 是可选的导入版。
- **段评注入真实链路**：服务端正文直接下发 `<comment ident="/p?para=...">`、`<img src="/chapter_review/svg?...">` 等**相对路径**标签时，书源负责解析 item_id 并拼 host 前缀（在 content `<js>` 后处理中 replace）；段评开关用 openParams（single）+ 请求 URL 追加 `review=1` 参数控制，`config.openParams` 读值。
- **多正文源 / 官方+第三方代理模式**：`ruleContent.request @js:` 改 `config.url` 到代理主机（如 base64url 拼接）、并从 `config.openParams.token` 注入 `authorization: Bearer` 头；规则结构不变，换源只影响业务 URL。
- **封面/URL 归一化公共函数**：发现页/列表页 URL 折叠斜杠、补默认年月、封面缩略图转高清，统一放 publicJavascript 由 `request @js:` 调用（`config['url'] = fixXxx(config['url'])`）。

## 7. Web API（自动化调试）

入口：App 设置 → 开发者选项 → 启用 Web API，`http://localhost:8080/api/`，全部 POST、`application/json`、UTF-8、无认证；**参数值统一 String**；响应 `code` 为字符串 `"200"`/`"600"`。

调试：`site/search`(keyword+siteJson) → `site/bookinfo`(bookJson+siteJson) → `site/chapter`(bookJson+siteJson) → `site/content`(catalogJson+siteJson)；`site/finder`(siteJson+categoryUUID+selectList+pageIndex)；取消 `site/cancelRequest`(type 0搜索1目录2正文3发现)；`debug/clear`(type 1/2/3/5)。

调试响应 `data` 统一 `ResponsesModel{resultData, list, jsLog, gets}`（历史 `books/chapters/content/log/time` 已废弃）。管理：`site/list`(keyword/groupId/order 0-7) `site/group` `site/info`(id/password) `site/save`(siteJson 完整 V2 含 aliasName/id/index/groupId/status/finderStatus/remarks) `site/delete`(id) `site/export`(id→AES 串)。完整速查见 `references/web-api.md`。