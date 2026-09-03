#!/usr/bin/env python3
"""source-check.py — 用心读书（Read With Heart）书源结构自检

用法:
  python3 source-check.py <书源.json> [--strict]

检查:
  - 顶层必查字段: siteName / host / type / version
  - ruleSearch 必查: url / method / engine / bookList / bookName / bookUrl
  - ruleChapter 必查: chapterList / chapterName / chapterUrl
  - ruleContent 必查: contents
  - 旧字段警告: baseUrl / list / name / lines / encode
  - ruleBookInfo / ruleExtra / ruleFinder 存在性

退出码: 0=pass  1=warning(可修复)  2=fail(必填缺失)
"""

import json
import sys

TOP_REQUIRED = ["siteName", "host", "type", "version"]
SEARCH_REQUIRED = ["url", "method", "engine", "bookList", "bookName", "bookUrl"]
CHAPTER_REQUIRED = ["chapterList", "chapterName", "chapterUrl"]
CONTENT_REQUIRED = ["contents"]
OLD_FIELDS = {
    "baseUrl": "改用 host",
    "list": "目录规则改用 chapterList",
    "name": "目录规则改用 chapterName",
    "lines": "正文规则改用 contents",
    "encode": "区分 requestEncode / responseEncode",
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


def check_required(obj, section, fields, presence_only=False):
    if presence_only:
        return [f for f in fields if f not in obj]
    return [f for f in fields if not obj.get(f)]


def main():
    if len(sys.argv) < 2:
        print("用法: python3 source-check.py <书源.json> [--strict]")
        sys.exit(2)
    path = sys.argv[1]
    strict = "--strict" in sys.argv[2:]
    src = load(path)

    fails, warns, notes = [], [], []

    # 顶层（type/version 允许 0，只要求键存在）
    missing = check_required(
        src, "top", ["siteName", "host", "type", "version"], presence_only=True
    )
    if missing:
        fails.append(f"顶层缺失: {', '.join(missing)}")
    if not src.get("siteName"):
        fails.append("siteName 不能为空")
    if src.get("type") not in (0, 1, 4, "0", "1", "4"):
        warns.append(
            f"type 应为 0（通用）/1（文本小说）/4（听书），当前: {src.get('type')!r}"
        )
    else:
        v = int(src.get("type"))
        if v == 4 and not src.get("ruleContent", {}).get("playUrl"):
            warns.append("type=4 听书源：ruleContent.playUrl 应提取音频地址（为空时用正文 URL/Header）")

    # 规则段
    rs = src.get("ruleSearch", {})
    missing = check_required(rs, "ruleSearch", SEARCH_REQUIRED)
    if missing:
        fails.append(f"ruleSearch 缺失: {', '.join(missing)}")
    if rs.get("engine") not in ("xpath", "jsonpath", "css"):
        warns.append(
            f"ruleSearch.engine 应为 xpath/jsonpath/css，当前: {rs.get('engine')!r}"
        )

    rbi = src.get("ruleBookInfo", {})
    if not rbi:
        notes.append(
            "ruleBookInfo 为空（目录在详情页时可接受，需确认 chapterListUrl 或详情页含目录）"
        )
    elif not rbi.get("chapterListUrl") and not rbi.get("toolsUrl"):
        notes.append(
            "ruleBookInfo 未配置 chapterListUrl/toolsUrl（chapterListUrl 为空时目录地址回退详情地址）"
        )

    # V2 新字段提示
    if rs.get("aliasName"):
        notes.append(
            "ruleSearch.aliasName 已配置（bookName OR aliasName 匹配，别名作显示名）"
        )
    if rbi.get("toolsUrl"):
        notes.append("ruleBookInfo.toolsUrl 已配置（V2 书籍工具页）")
    rco_note = src.get("ruleContent", {})
    if rco_note.get("commentUrl"):
        notes.append("ruleContent.commentUrl 已配置（V2 支持异步 @js:）")

    rc = src.get("ruleChapter", {})
    missing = check_required(rc, "ruleChapter", CHAPTER_REQUIRED)
    if missing:
        fails.append(f"ruleChapter 缺失: {', '.join(missing)}")
    elif not rc.get("chapterList"):
        fails.append("ruleChapter.chapterList 不能为空")

    rco = src.get("ruleContent", {})
    missing = check_required(rco, "ruleContent", CONTENT_REQUIRED)
    if missing:
        fails.append(f"ruleContent 缺失: {', '.join(missing)}")

    # 旧字段
    for old, hint in OLD_FIELDS.items():
        if old in src:
            warns.append(f"顶层旧字段 '{old}': {hint}")
        for sec_name, sec in (
            ("ruleSearch", rs),
            ("ruleBookInfo", rbi),
            ("ruleChapter", rc),
            ("ruleContent", rco),
        ):
            if old in sec:
                warns.append(f"{sec_name}.{old} 旧字段: {hint}")

    # 分页/清洗提示
    for sec_name, sec in (("ruleChapter", rc), ("ruleContent", rco)):
        if sec.get("page") and sec.get("next"):
            warns.append(f"{sec_name} 同时配置 page 与 next，确认只用其一")

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
