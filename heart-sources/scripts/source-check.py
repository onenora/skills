#!/usr/bin/env python3
"""source-check.py — 用心读书（Read With Heart）书源结构自检

用法:
  python3 source-check.py <书源.json> [--strict]

检查（对齐官方 schema）:
  - 顶层必查: siteName / host（type/version 允许 0）
  - type: 0=未设置 / 1=网络文本 / 2=听书(官方 schema) / 4=听书(真实书源)
  - 官方必填最小集: ruleSearch=url+bookList; ruleChapter=chapterList; ruleContent=contents
  - 至少存在一个规则段
  - 建议字段(不强制): bookName/bookUrl/chapterName/chapterUrl 等
  - 旧字段警告: baseUrl/list/name/url(章节旧名)/lines/encode/imageUrl
  - header/cookies 必须为对象
  - type=2/4 时 ruleContent.playUrl 提示

退出码: 0=pass  1=warning(可修复)  2=fail(必填缺失)
"""

import json
import sys

TOP_PRESENCE = ["siteName", "host", "type", "version"]
OLD_FIELDS = {
    "baseUrl": "改用 host",
    "list": "目录规则改用 chapterList",
    "name": "目录规则改用 chapterName",
    "lines": "正文规则改用 contents",
    "encode": "区分 requestEncode / responseEncode",
    "imageUrl": "正文/详情封面改用 coverUrl",
}


def load(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        if len(data) == 0:
            print("[FAIL] 空数组")
            sys.exit(2)
        return data[0]
    return data


def present(obj, fields):
    return [f for f in fields if f not in obj]


def missing(obj, fields):
    return [f for f in fields if not obj.get(f)]


def main():
    if len(sys.argv) < 2:
        print("用法: python3 source-check.py <书源.json> [--strict]")
        sys.exit(2)
    path = sys.argv[1]
    strict = "--strict" in sys.argv[2:]
    src = load(path)

    fails, warns, notes = [], [], []

    # 顶层（type/version 允许 0/1/2/4，只要求键存在）
    gone = present(src, TOP_PRESENCE)
    if gone:
        fails.append(f"顶层缺失: {', '.join(gone)}")
    if not src.get("siteName"):
        fails.append("siteName 不能为空")
    t = src.get("type")
    if t is not None and int(t) not in (0, 1, 2, 4):
        warns.append(
            f"type 应为 0（未设置）/1（文本）/2（听书·官方 schema）/4（听书·真实源），"
            f"当前: {t!r}"
        )
    if isinstance(src.get("header"), list) or (src.get("header") not in (None,) and not isinstance(src.get("header"), dict)):
        fails.append("顶层 header 必须是对象 {key: value}")
    if isinstance(src.get("cookies"), list) or (src.get("cookies") not in (None,) and not isinstance(src.get("cookies"), dict)):
        fails.append("顶层 cookies 必须是对象 {key: value}")

    # 至少一个规则段
    has_any = any(
        src.get(k) not in (None,) for k in ("ruleSearch", "ruleChapter", "ruleContent", "ruleBookInfo", "ruleFinder")
    )
    if not has_any:
        fails.append("书源必须包含至少一个规则段 (ruleSearch/ruleChapter/ruleContent/ruleBookInfo/ruleFinder)")

    # ruleSearch：官方必填 url+bookList；bookName/bookUrl 为建议
    rs = src.get("ruleSearch", {})
    miss = missing(rs, ["url", "bookList"])
    if miss:
        fails.append(f"ruleSearch 必填缺失: {', '.join(miss)}")
    for rec in ("bookName", "bookUrl"):
        if rs and not rs.get(rec):
            warns.append(f"ruleSearch.{rec} 建议配置（官方不强制）")
    if rs.get("engine") not in (None, "", "xpath", "jsonpath", "css"):
        warns.append(f"ruleSearch.engine 应为 xpath/jsonpath/css，当前: {rs.get('engine')!r}")

    rbi = src.get("ruleBookInfo", {})
    if not rbi:
        notes.append("ruleBookInfo 为空（目录在详情页时可接受）")
    elif not rbi.get("chapterListUrl") and not rbi.get("toolsUrl"):
        notes.append("ruleBookInfo 未配置 chapterListUrl/toolsUrl（为空时目录地址回退详情地址）")

    if rs.get("aliasName"):
        notes.append("ruleSearch.aliasName 已配置（bookName OR aliasName 匹配，别名作显示名）")
    if rbi.get("toolsUrl"):
        notes.append("ruleBookInfo.toolsUrl 已配置（V2 书籍工具页）")
    if src.get("ruleContent", {}).get("commentUrl"):
        notes.append("ruleContent.commentUrl 已配置（V2 支持异步 @js:）")

    # ruleChapter：官方必填 chapterList；chapterName/chapterUrl 为建议
    rc = src.get("ruleChapter", {})
    miss = missing(rc, ["chapterList"])
    if miss:
        fails.append(f"ruleChapter 必填缺失: {', '.join(miss)}")
    for rec in ("chapterName", "chapterUrl"):
        if rc and not rc.get(rec):
            warns.append(f"ruleChapter.{rec} 建议配置（官方不强制；旧名 url 等效）")

    # ruleContent：官方必填 contents
    rco = src.get("ruleContent", {})
    miss = missing(rco, ["contents"])
    if miss:
        fails.append(f"ruleContent 必填缺失: {', '.join(miss)}")

    # 听书 playUrl
    if t is not None and int(t) in (2, 4) and not rco.get("playUrl"):
        warns.append("听书源 (type 2/4)：ruleContent.playUrl 应提取音频地址（为空时用正文 URL/Header）")

    # 旧字段
    for old, hint in OLD_FIELDS.items():
        if old in src:
            warns.append(f"顶层旧字段 '{old}': {hint}")
        for sec_name, sec in (("ruleSearch", rs), ("ruleBookInfo", rbi), ("ruleChapter", rc), ("ruleContent", rco)):
            if old in sec:
                warns.append(f"{sec_name}.{old} 旧字段: {hint}")
    if rc.get("url") and not rc.get("chapterUrl"):
        warns.append("ruleChapter.url 是章节地址旧名，建议改用 chapterUrl")

    # 分页互斥
    for sec_name, sec in (("ruleChapter", rc), ("ruleContent", rco)):
        if sec.get("page") and sec.get("next"):
            warns.append(f"{sec_name} 同时配置 page 与 next，官方要求二选一")

    print(f"书源: {src.get('siteName') or '(未命名)'}")
    print(f"host: {src.get('host') or '(缺失)'}")
    print(f"version: {src.get('version')}")
    for n in notes:
        print(f"[NOTE] {n}")
    for w in warns:
        print(f"[WARN] {w}")
    for f in fails:
        print(f"[FAIL] {f}")

    if fails:
        print("\n结果: FAIL")
        sys.exit(2)
    if warns and strict:
        print("\n结果: PASS (strict 模式含警告)")
        sys.exit(1)
    print("\n结果: PASS")
    sys.exit(0)


if __name__ == "__main__":
    main()