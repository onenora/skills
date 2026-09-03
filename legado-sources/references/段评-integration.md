# 段评集成（可选，跨 iOS + 安卓）

段评 = 在正文对应段落末尾注入 SVG 气泡（显示评论数），点击进 WebView 评论页。跨端优先用通用 jsLib 函数；`ruleReview` 是 Legado 3.0 字段，但部分二改/iOS fork 已禁，不依赖它。

## 开关字段

```jsonc
{
  "customButton": true,
  "eventListener": true,
  "jsLib": "function getComments(){...} function showCmt(){...} function svgBubble(){...}"
}
```

## 注入原理（getComments）

1. 正文按 `<p>` 或 `\n` 切成数组（先测 `/<p>/.test(content)`）。
2. `java.ajax` 请求评论汇总接口，拿每段评论数 `{paragraphId: {count}}`。
3. 在对应 index 段落末尾注入 `<img src="data:image/svg+xml;base64,...">`。
4. 段落 index = 切分后下标，挂错段即对不上；正文规则保留 HTML（img 才能渲染）。

```js
function getComments(content, bookId, itemId) {
  var java = this.java;
  var sep = /<p>/.test(content) ? '<p>' : '\n';
  var arr = content.split(sep).map(function(s){ return s.replace(/[\r\n]/g,'').trim(); });
  var data = JSON.parse(java.ajax('.../summary?book=' + bookId + '&item=' + itemId)).data;
  Object.keys(data).forEach(function(i){
    if (arr[i]) arr[i] += svgBubble(data[i].count, bookId, itemId, i);
  });
  return arr.join(sep);
}
```

正文规则调用：`"content": "@js: getComments.call(this, 原正文, book.id, chapter.id)"`。

## 气泡（SVG）

默认气泡用内嵌 SVG/PNG 资产，占位符 `{n}`=评论数、`{t}`=数字颜色、`{c}`=气泡颜色；评论数上限 99。返回值 `data:image/svg+xml;base64,...`，点击元数据只带 `bookId/itemId/para_index/count` 并调段评页面，不把评论 JSON 塞进图片 URL。替换顺序：先选定模板（默认 / 用户 `bbSvg` / 自定义），再替换占位符，最后 Base64，顺序不可颠倒。

## 点击弹出（showCmt）

`eventListener` 捕获气泡点击 → `java.showBrowser(评论页URL, 预取HTML)` 半屏弹窗。URL 带 `book_id=..&item_id=..&para_id=..`。半屏参数：`heightPercentage=0.62`、`widthPercentage=1`、可拖动、点击外部关闭。旧版/未知二改保留 `startBrowser(url, title, html)` 回退。WebView 页必须先做 `typeof run === 'function'` 能力检测，无桥时回退或提示，不抛异常。

## 评论页数据归一化

本地评论页不应绑定某一条上游 JSON 形状，统一字段：

| 字段 | 兼容来源 |
| --- | --- |
| `id` | comment_id/reply_id/post_id/topic_id/id |
| `name` | user_name/nickname/name/screen_name |
| `avatar` | user_avatar/avatar_url/avatar_avatar_thumb |
| `text` | content.text/content/rich_text/description/abstract |
| `images` | image_data_list/image_list/images，递归取 origin_url/image_url/url_list |
| `emojiAssets` | emoji/sticker/expression/image 子树名和图片 URL |
| `quote` | para_src_content/source_content/quote_content（段评顶部原文引用） |
| `meta` | 时间/楼层/IP 地区/点赞数 |
| `sub` | 内嵌 reply_list/sub_reply 与声明 reply_count/reply_cnt |

- 回复按钮只在 `replies>0` 且存在评论 ID 时出现；接口返回空立即删按钮和容器并归零，不显示“查看 N 条回复”。
- 展开/收起为双状态控件，实测至少“展开→收起→再展开”三次；半屏排序用页内分段按钮，避免原生下拉被判定为外部点击关页。
- 排序默认/最新/最热；明暗色同时支持系统自动与手动；图标文字颜色从当前主题计算，亮色主文字约 `#4C4C4C`，暗色约 `#D4D4D4`。
- 跨端伪按钮的 ✅ 标识：直接用 `JSON.parse(source.getVariable()||"{}").showPara===true` 读源变量布尔，不能用 `GET("showPara")===true`（`GET` 的 `d[k]||""` 会把布尔 false 吞成空串，永远 false）。

## 常见坑

| 坑 | 解 |
| --- | --- |
| 写了 ruleReview 段评没反应 | 该版已禁，改 customButton+jsLib 通用路线 |
| 段评挂错段落 | paragraphId 对不上正文切分 index |
| 气泡不显示 | content 未保留 HTML（img 丢失）或 Base64 顺序颠倒 |
| `new Map()` 报错 | Rhino 不支持，普通键值用 `{}`，Java API 强制时用 `Packages.java.util.HashMap` |
| 正文被外部请求阻塞 | 正文不让步：不把网络请求放在正文关键路径；气泡社区走手动同步缓存 |
