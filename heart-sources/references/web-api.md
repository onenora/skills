# Web 写源开放接口速查（对齐官方 2026-08）

入口：App 设置 → 开发者选项 → 启用 Web API。地址 `http://localhost:8080/api/`；全部 **POST**、`application/json`、UTF-8、无认证；参数值统一 **String**；响应 `code` 为字符串 `"200"`/`"600"`。

## 管理接口

| 接口 | 参数 | 说明 |
|---|---|---|
| `POST /api/site/list` | `keyword`/`groupId`/`order`(0-7) | 源列表；order 0 默认、1-2 名称、3-4 更新时间、5-6 创建时间、7 网址 |
| `POST /api/site/group` | — | 源分组列表 |
| `POST /api/site/info` | `id`/`password` | 源详情（加密源需密码）；返回 `siteJson` |
| `POST /api/site/save` | `siteJson`(完整 V2)/`id`/`index`/`groupId`/`status`/`finderStatus`/`remarks` | 创建/更新；siteJson 含 `aliasName` 无需白名单过滤 |
| `POST /api/site/delete` | `id` | 删除 |
| `POST /api/site/export` | `id` | 导出（AES 加密规则串） |

## 调试接口

| 接口 | 参数 | 说明 |
|---|---|---|
| `POST /api/site/search` | `keyword`/`siteJson` | 搜索调试 |
| `POST /api/site/bookinfo` | `bookJson`/`siteJson` | 详情调试 |
| `POST /api/site/chapter` | `bookJson`/`siteJson` | 章节列表调试 |
| `POST /api/site/content` | `catalogJson`/`siteJson` | 正文调试 |
| `POST /api/site/finder` | `siteJson`/`categoryUUID`/`selectList`/`pageIndex` | 发现调试 |
| `POST /api/site/cancelRequest` | `type`(0搜索 1目录 2正文 3发现) | 取消调试请求 |
| `POST /api/debug/clear` | `type`(1搜索 2章节 3正文 5发现)/`siteIdent` | 清调试日志 |

## 响应格式

```json
{ "code": "200", "message": "成功", "data": {} }
```

- 调试接口（search/bookinfo/chapter/content/finder）`data` 统一 `ResponsesModel{resultData, list, jsLog, gets}`；历史字段 `books/chapters/content/log/time` 已废弃。
- `site/list` 实际字段 `id/version/time/siteName/groupId/siteIdent/url/isPassword/status/finderStatus`；一切以 App 实际返回为准。

## 调试链路示例

1. `site/search` → `data.list[0].bookUrl` → 组 `bookJson{bookUrl,name}`。
2. `site/chapter` → `data.list[0].url` → 组 `catalogJson{url,name}`。
3. `site/content` → `data.resultData`。

## 安全

默认 CORS `*`；可在设置收紧 `cors.allowOrigins`。仅本地/内网开放，生产用 HTTPS。

## 工具

- 电脑端写源：[books-web-source](https://gitee.com/jon/books-web-source)
- XPath/规则转换：[jelly](https://freenovel123.github.io/jelly/)、[jijianconvert](https://jijianconvert.netlify.app/)