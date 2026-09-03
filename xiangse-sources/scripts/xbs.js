#!/usr/bin/env node
/**
 * xbs.js — XBS (XXTEA-encrypted JSON) <-> JSON conversion for Xiangse/StandarReader.
 *
 * 零依赖：纯 JS 实现 XXTEA（Uint32Array + 位运算），仅用 Node 内置模块（fs/crypto）。
 * 算法与 xxtea 库 / Python 内嵌版逐字节一致（真实 xbs round-trip 已验证）。
 *
 * 用法:
 *   node xbs.js decode <in.xbs> <out.json>
 *   node xbs.js encode <in.json> <out.xbs>
 *   node xbs.js roundtrip <in.json> <prefix>   # encode→decode 比对，打印 xbs sha256
 *   node xbs.js selftest
 *
 * 作为模块: const { jsonToXbsBytes, xbsToJsonBytes } = require('./xbs.js');
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');

// ---- 香色书源固定密钥（16 字节）----
const XBS_KEY_BYTES = new Uint8Array([
  0xe5, 0x87, 0xbc, 0xe8, 0xa4, 0x86, 0xe6, 0xbb,
  0xbf, 0xe9, 0x87, 0x91, 0xe6, 0xba, 0xa1, 0xe5,
]);

// ---- XXTEA 核心（标准实现，uint32 语义）----
const DELTA = 0x9e3779b9;

function mx(sum, y, z, p, e, k) {
  return (
    ((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^
    ((sum ^ y) + (k[(p & 3) ^ e] ^ z))
  );
}

function bytesToWords(b) {
  const n = b.length >> 2;
  const v = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    v[i] = (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  }
  return v;
}

function wordsToBytes(v) {
  const n = v.length;
  const b = new Uint8Array(n << 2);
  for (let i = 0; i < n; i++) {
    const w = v[i] >>> 0;
    const o = i << 2;
    b[o] = w & 0xff;
    b[o + 1] = (w >>> 8) & 0xff;
    b[o + 2] = (w >>> 16) & 0xff;
    b[o + 3] = (w >>> 24) & 0xff;
  }
  return b;
}

function encryptWords(v, k) {
  const n = v.length;
  if (n < 2) throw new Error('data too short for XXTEA');
  let z = v[n - 1] >>> 0;
  let y;
  let sum = 0;
  let e;
  let p;
  let q = 6 + Math.floor(52 / n);
  while (q-- > 0) {
    sum = (sum + DELTA) >>> 0;
    e = (sum >>> 2) & 3;
    for (p = 0; p < n - 1; p++) {
      y = v[p + 1] >>> 0;
      z = (v[p] + mx(sum, y, z, p, e, k)) >>> 0;
      v[p] = z;
    }
    y = v[0] >>> 0;
    z = (v[n - 1] + mx(sum, y, z, n - 1, e, k)) >>> 0;
    v[n - 1] = z;
  }
  return v;
}

function decryptWords(v, k) {
  const n = v.length;
  if (n < 2) throw new Error('data too short for XXTEA');
  let y = v[0] >>> 0;
  let z;
  let sum = Math.imul(6 + Math.floor(52 / n), DELTA) >>> 0;
  let e;
  let p;
  while (sum !== 0) {
    e = (sum >>> 2) & 3;
    for (p = n - 1; p > 0; p--) {
      z = v[p - 1] >>> 0;
      v[p] = (v[p] - mx(sum, y, z, p, e, k)) >>> 0;
      y = v[p];
    }
    z = v[n - 1] >>> 0;
    v[0] = (v[0] - mx(sum, y, z, 0, e, k)) >>> 0;
    y = v[0];
    sum = (sum - DELTA) >>> 0;
  }
  return v;
}

// ---- XBS 格式（与 xbs.py 逐字节一致）----

/** 解密 xbs 字节 → 原始 JSON 字节 */
function xbsToJsonBytes(xbs) {
  const k = bytesToWords(XBS_KEY_BYTES);
  const dec = decryptWords(bytesToWords(xbs), k);
  const out = wordsToBytes(dec);
  const n = out.length - 4;
  const m = (out[n] | (out[n + 1] << 8) | (out[n + 2] << 16) | (out[n + 3] << 24)) >>> 0;
  if (m < n - 3 || m > n) {
    throw new Error('bad length marker m=' + m + ' n=' + n);
  }
  return out.slice(0, m);
}

/** JSON 字节 → xbs 字节（尾部补 4 字节小端原始长度后整体加密） */
function jsonToXbsBytes(json) {
  const n = (json.length + 3) & ~3;
  const padded = new Uint8Array(n + 4);
  padded.set(json);
  padded[n] = json.length & 0xff;
  padded[n + 1] = (json.length >>> 8) & 0xff;
  padded[n + 2] = (json.length >>> 16) & 0xff;
  padded[n + 3] = (json.length >>> 24) & 0xff;
  return wordsToBytes(encryptWords(bytesToWords(padded), bytesToWords(XBS_KEY_BYTES)));
}

// ---- CLI ----
const USAGE = `XBS (XXTEA-encrypted JSON) <-> JSON conversion for Xiangse/StandarReader.

Usage:
  decode <in.xbs> <out.json>
  encode <in.json> <out.xbs>
  roundtrip <in.json> <prefix>   # encode then decode, compare, print sha256
  selftest`;

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd) {
    console.log(USAGE);
    return 1;
  }
  try {
    if (cmd === 'decode') {
      const out = xbsToJsonBytes(new Uint8Array(fs.readFileSync(args[1])));
      fs.writeFileSync(args[2], Buffer.from(out));
    } else if (cmd === 'encode') {
      const payload = Buffer.from(
        JSON.stringify(JSON.parse(fs.readFileSync(args[1], 'utf-8'))),
        'utf-8'
      );
      fs.writeFileSync(args[2], Buffer.from(jsonToXbsBytes(payload)));
    } else if (cmd === 'roundtrip') {
      const src = Buffer.from(
        JSON.stringify(JSON.parse(fs.readFileSync(args[1], 'utf-8'))),
        'utf-8'
      );
      const xbs = jsonToXbsBytes(src);
      const back = xbsToJsonBytes(xbs);
      fs.writeFileSync(args[2] + '.xbs', Buffer.from(xbs));
      fs.writeFileSync(args[2] + '.json', Buffer.from(back));
      if (Buffer.compare(Buffer.from(back), src) !== 0) {
        throw new Error('roundtrip mismatch');
      }
      console.log(crypto.createHash('sha256').update(Buffer.from(xbs)).digest('hex'));
    } else if (cmd === 'selftest') {
      const sample = JSON.stringify({ demo: { sourceName: '测试', weight: '9999' } });
      const payload = Buffer.from(sample, 'utf-8');
      const enc = jsonToXbsBytes(payload);
      const dec = xbsToJsonBytes(enc);
      if (Buffer.compare(Buffer.from(dec), payload) !== 0) throw new Error('selftest roundtrip failed');
      if (Buffer.compare(Buffer.from(enc), payload) === 0) throw new Error('selftest not encrypted');
      console.log('selftest ok');
    } else {
      console.log(USAGE);
      return 1;
    }
  } catch (e) {
    console.error('ERROR: ' + (e && e.message ? e.message : String(e)));
    return 1;
  }
  return 0;
}

module.exports = { encryptWords, decryptWords, xbsToJsonBytes, jsonToXbsBytes, XBS_KEY_BYTES };

if (require.main === module) {
  process.exit(main());
}
