// 用心书源通用模拟验证引擎（jsonpath 类书源）
// 用法: node heart-verify.js <书源.json> [--keyword 关键词] [--silent]
// 范围：engine=jsonpath 的搜索/详情/目录/正文/发现链路；xpath 源请用 App Web API 或页面样本验证
// 机制：注入 publicJavascript → new Function 执行 request/response JS（return 捕获）→ 简易 jsonpath 解析规则字段
'use strict';
const crypto = require('crypto');
const fs = require('fs');

// ---------- App 环境桩（按书源实际用到的能力扩展） ----------
const app = {
  md5: s => crypto.createHash('md5').update(String(s)).digest('hex'),
  sha1: s => crypto.createHash('sha1').update(String(s)).digest('hex'),
  sha256: s => crypto.createHash('sha256').update(String(s)).digest('hex'),
  base64: {
    encode: s => Buffer.from(String(s)).toString('base64'),
    decode: s => Buffer.from(String(s), 'base64').toString('utf8')
  },
  time: (ts, fmt) => {
    const d = new Date(Number(ts) * 1000);
    const p = n => String(n).padStart(2, '0');
    const f = fmt || 'yyyy-MM-dd HH:mm:ss';
    return f.replace('yyyy', d.getFullYear()).replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate()))
      .replace('HH', p(d.getHours())).replace('mm', p(d.getMinutes())).replace('ss', p(d.getSeconds())).replace('SSS', p(d.getMilliseconds()));
  },
  nlp: { chs: s => String(s), cht: s => String(s) },
  uuid: () => '00000000-0000-4000-8000-000000000000',
  log: () => {},
  sp: { get: k => store[k], put: (k, v) => { store[k] = v; }, delete: k => { delete store[k]; } }
};
global.App = app; global.app = app;
const store = {};
const get = k => store[k] !== undefined ? store[k] : '';
const put = (k, v) => { store[k] = v; return v; };

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const srcPath = argv[0];
const kwIdx = argv.indexOf('--keyword');
const KEYWORD = kwIdx > -1 ? argv[kwIdx + 1] : '测试';
const SILENT = argv.includes('--silent');
if (!srcPath || !fs.existsSync(srcPath)) {
  console.error('用法: node heart-verify.js <书源.json> [--keyword 关键词]');
  process.exit(2);
}

const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
if ((src.ruleSearch || {}).engine !== 'jsonpath') {
  console.log('[SKIP] 仅支持 engine=jsonpath 的书源（当前: ' + ((src.ruleSearch || {}).engine || '未配置') + '）');
  process.exit(0);
}

// ---------- publicJavascript 注入 ----------
const exportBlock = '\nreturn (function(){var o={};' +
  "for(var k in {TFBOOK_COMMON:1})o[k]=eval(k);" +
  'for(var k in this){};' +
  'var names=[' +
  "'tfbookBuild','tfbookChaptersUrl','tfbookTime','tfbookStatus','tfbookCleanContent'" +
  '];for(var i=0;i<names.length;i++){try{o[names[i]]=eval(names[i]);}catch(e){}}' +
  'return o;})();';
let pub = {};
try {
  const loader = new Function('get', 'put', 'app', src.publicJavascript || '');
  loader(get, put, app);
  // 导出公共函数：扫描 publicJavascript 中的 function/var 声明
  const names = [...(src.publicJavascript || '').matchAll(/(?:function|var)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
  for (const n of [...new Set(names)]) {
    try { pub[n] = eval(n); } catch (e) {}
  }
  // 若 eval 取不到（模块作用域），退回动态导出
  if (Object.keys(pub).length === 0) {
    pub = new Function('get', 'put', 'app', (src.publicJavascript || '') + exportBlock)(get, put, app) || {};
  }
} catch (e) {
  console.log('[WARN] publicJavascript 注入失败:', e.message);
}
const PUB_NAMES = Object.keys(pub);
const pubVals = PUB_NAMES.map(n => pub[n]);

// ---------- 规则 JS 执行（return 捕获） ----------
function runJs(js, scope) {
  const keys = ['get', 'put', 'app', 'config', 'html', 'value', ...PUB_NAMES];
  const vals = [get, put, app, scope.config, scope.html, scope.value, ...pubVals];
  const wrapped = String(js || '').replace(/^@js:\s*/, '').replace(/(^|\s)return\s+/g, '$1_out=');
  const fn = new Function(...keys, 'var _out;' + wrapped + ';return _out;');
  return fn(...vals);
}

// ---------- 简易 jsonpath（$.a.b[*] / $..key[*] / $.data[*]） ----------
function jp(obj, path) {
  if (path.startsWith('$..')) {
    const key = path.slice(3).replace(/\[\*\]$/, '');
    const out = [];
    (function walk(o) {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === 'object') {
        if (key && Array.isArray(o[key])) o[key].forEach(x => out.push(x));
        Object.keys(o).forEach(k => walk(o[k]));
      }
    })(obj);
    return out;
  }
  const parts = path.replace(/^\$\.?/, '').split(/\.|\[\*\]|\.\./).filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return null;
    cur = cur[p];
  }
  return cur;
}

// ---------- 字段规则解析（jsonpath / 裸键 / <js> 后处理） ----------
function field(node, rule) {
  if (typeof rule !== 'string' || rule === '') return '';
  const bare = rule.replace(/<js>[\s\S]*<\/js>/, '').trim();
  let v;
  if (bare.startsWith('.')) return '';
  if (bare.startsWith('$')) v = jp(node, bare);
  else v = node ? node[bare] : '';
  const jsIdx = rule.lastIndexOf('<js>');
  if (jsIdx > -1) {
    const js = rule.slice(jsIdx + 4, rule.lastIndexOf('</js>'));
    const value = v instanceof Array ? (v[0] !== undefined ? v[0] : '') : v;
    return runJs(js, { config: {}, html: '', value });
  }
  return v instanceof Array ? (v.length === 1 ? v[0] : v) : v;
}

const UA = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' };
let pass = 0, fail = 0;
const C = (name, ok, detail) => { if (!SILENT) console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + ' | ' + detail); ok ? pass++ : fail++; };

(async () => {
  const cfg = (js, conf) => runJs(js, { config: conf || {}, html: '', value: '' });

  // ===== 1. ruleSearch =====
  if (src.ruleSearch) {
    const conf = { keyword: KEYWORD };
    if (src.ruleSearch.request) cfg(src.ruleSearch.request, conf);
    else if (src.ruleSearch.url) conf.url = src.ruleSearch.url.replace(/\$\{keyword\}/g, encodeURIComponent(KEYWORD));
    const r = await (await fetch(conf.url, { headers: UA })).json();
    const list = jp(r, src.ruleSearch.bookList) || [];
    C('搜索', r != null && list.length > 0, list.length + ' 本 | ' + (field(list[0], src.ruleSearch.bookName) || '').slice(0, 16));
    if (list.length === 0) process.exit(0);
    const bookUrl = field(list[0], src.ruleSearch.bookUrl);
    C('bookUrl', !!bookUrl, String(bookUrl).slice(0, 66));

    // ===== 2. ruleBookInfo =====
    if (src.ruleBookInfo) {
      const conf2 = { infoUrl: bookUrl, url: bookUrl };
      if (src.ruleBookInfo.request) cfg(src.ruleBookInfo.request, conf2);
      const r2 = await (await fetch(conf2.url, { headers: UA })).json();
      const bn = field(r2, src.ruleBookInfo.bookName || '');
      C('详情', !!bn, bn + ' / ' + (field(r2, src.ruleBookInfo.bookAuthor || '') || ''));
      const clu = conf2.chapterListUrl || field(r2, src.ruleBookInfo.chapterListUrl || '');
      const chapUrl = clu || src.ruleBookInfo.bookUrl || bookUrl;

      // ===== 3. ruleChapter =====
      const conf3 = { bookUrl: chapUrl, url: chapUrl };
      if (src.ruleChapter.request) cfg(src.ruleChapter.request, conf3);
      const r3 = await (await fetch(conf3.url, { headers: UA })).json();
      const chs = jp(r3, src.ruleChapter.chapterList) || [];
      C('目录', chs.length > 0, chs.length + ' 章 | ' + (field(chs[0], src.ruleChapter.chapterName || '') || '').slice(0, 20));
      const cid = field(chs[0], src.ruleChapter.chapterUrl || '');

      // ===== 4. ruleContent =====
      if (src.ruleContent && cid) {
        const conf4 = { bookUrl: chapUrl, chapterUrl: cid };
        if (src.ruleContent.request) cfg(src.ruleContent.request, conf4);
        else conf4.url = String(cid).startsWith('http') ? cid : new URL(cid, src.host).href;
        const r4 = await (await fetch(conf4.url, { headers: UA })).json();
        const raw = field(r4, src.ruleContent.contents);
        C('正文', raw && String(raw).length > 50, String(raw).length + ' 字 | ' + String(raw).slice(0, 30).replace(/\s+/g, ' '));
      }
    }
  }

  // ===== 5. ruleFinder =====
  if (src.ruleFinder && src.ruleFinder.length) {
    for (const f of src.ruleFinder) {
      const conf = {};
      if (f.request) cfg(f.request, conf);
      else if (f.structure) conf.url = f.structure.replace(/\$\{pageIndex\}/g, '1');
      const r = await (await fetch(conf.url, { headers: UA })).json();
      const items = jp(r, f.bookList || '') || [];
      C('发现「' + (f.name || f.uuid) + '」', items.length > 0, items.length + ' 本 | ' + (field(items[0], f.bookName || '') || '').slice(0, 14));
      // 第一筛选器的第二个选项探测
      if (items.length > 0 && f.list && f.list.length && f.list[0].list) {
        try {
          const opts = JSON.parse(f.list[0].list);
          if (opts.length > 2 && f.request && /config\._/.test(f.request)) {
            const type = f.list[0].type;
            const conf2 = {}; conf2['_' + type] = opts[1].value;
            cfg(f.request, conf2);
            const r2 = await (await fetch(conf2.url, { headers: UA })).json();
            C('  筛选「' + opts[1].name + '」', true, (jp(r2, f.bookList) || []).length + ' 本');
          }
        } catch (e) {}
      }
    }
  }

  console.log('\n===== ' + pass + '/' + (pass + fail) + ' PASS (' + src.siteName + ' v' + src.version + ') =====');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });