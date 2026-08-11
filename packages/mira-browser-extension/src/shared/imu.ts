/**
 * Image Max URL(maxurl.user.js)封装:在前端把缩略图 URL 升级为高清原图。
 *
 * MV3 扩展 CSP 禁止 eval/new Function,无法在 service worker / content script 里
 * 直接 require/eval maxurl。这里改走「页面 MAIN world 注入」:
 *  1. maxurl.user.js 声明为 web_accessible_resource;
 *  2. content script 往页面注入一个 <script>,它加载 maxurl 并在加载完成后
 *     监听 window message,收到升级请求就调 bigimage_recursive,把结果数组回传;
 *  3. content script(this)通过 postMessage 与页面桥接(跨 world,只能传可序列化数据)。
 *
 * 参考 mira_eagle_extension/index.ts 的 upgradeImageUrlCandidates(过滤/排序逻辑)。
 */

import { dbg } from './debug';
import { DEFAULT_IMAGE_URL_RULES, type ImageUrlRule } from './types';

export interface ImuResult {
  url: string;
  is_original?: boolean;
  bad?: boolean;
  fake?: boolean;
  video?: boolean;
}

export interface ImuOptions {
  /** 单次升级超时(ms),超时返回 [url] */
  timeout?: number;
  rules?: ImageUrlRule[];
}

const BRIDGE_FLAG = '__mira_imu_bridge__';
const REQ_TAG = '__mira_imu_req__';
const RES_TAG = '__mira_imu_res__';

/** Pinterest 缩略图规则兜底: maxurl 可能因 HEAD/尺寸校验过滤掉 originals 候选。 */
export function pinterestOriginalUrl(url: string, rules: ImageUrlRule[] = DEFAULT_IMAGE_URL_RULES): string | null {
  try {
    const parsed = new URL(url);
    for (const rule of rules) {
      try {
        if (!new RegExp(rule.host, 'i').test(parsed.hostname)) continue;
        const path = new RegExp(rule.path, 'i');
        if (path.test(parsed.pathname)) {
          parsed.pathname = parsed.pathname.replace(path, rule.replacement);
          parsed.search = '';
          return parsed.toString();
        }
      } catch {
        dbg.warn('imu', 'invalid URL rule skipped', { name: rule.name });
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function fallbackImageCandidates(url: string, rules: ImageUrlRule[] = DEFAULT_IMAGE_URL_RULES): string[] {
  const pinterestOriginal = pinterestOriginalUrl(url, rules);
  return pinterestOriginal ? [pinterestOriginal, url] : [url];
}

/** 页面 MAIN world 注入脚本源码(字符串,由 <script> 执行) */
const BRIDGE_SOURCE = `
(function(){
  if (window[${JSON.stringify(BRIDGE_FLAG)}]) return;
  window[${JSON.stringify(BRIDGE_FLAG)}] = true;
  var ready = false;
  var q = []; // ready 之前的请求队列
  function flush() {
    ready = true;
    while (q.length) handle(q.shift());
  }
  function imuReady() {
    return typeof window.$$IMU_EXPORT$$ === 'function';
  }
  function waitImu() {
    var tries = 0;
    (function poll() {
      if (imuReady()) return flush();
      if (++tries > 200) return; // ~10s
      setTimeout(poll, 50);
    })();
  }
  function handle(req) {
    try {
      window.$$IMU_EXPORT$$(req.url, {
        fill_object: true,
        iterations: req.iterations || 200,
        use_cache: true,
        exclude_videos: true,
        filter: function(u){ return /^https?:\\/\\//.test(u); },
        cb: function(result){
          window.postMessage({ tag: ${JSON.stringify(RES_TAG)}, id: req.id, result: result }, '*');
        }
      });
    } catch(e) {
      window.postMessage({ tag: ${JSON.stringify(RES_TAG)}, id: req.id, error: String(e) }, '*');
    }
  }
  window.addEventListener('message', function(ev){
    if (ev.source !== window) return;
    var d = ev.data;
    if (!d || d.tag !== ${JSON.stringify(REQ_TAG)}) return;
    if (!ready) { q.push(d); return; }
    handle(d);
  });
  waitImu();
})();
`;

let bridgeInjected = false;
let reqId = 0;

function injectBridge(): void {
  if (bridgeInjected || typeof document === 'undefined') {
    return;
  }
  dbg.log('imu', 'injecting MAIN-world bridge + maxurl script');
  // 注入桥接脚本(MAIN world):它再加载 maxurl
  const bridge = document.createElement('script');
  bridge.textContent = BRIDGE_SOURCE;
  // 加载 maxurl(web_accessible_resource,MAIN world 执行 → 暴露 $$IMU_EXPORT$$)
  const imu = document.createElement('script');
  imu.src = chrome.runtime.getURL('maxurl.user.js');
  imu.onerror = () => dbg.warn('imu', 'maxurl.user.js script load failed (CSP?)', { src: imu.src });
  (document.head || document.documentElement).appendChild(bridge);
  (document.head || document.documentElement).appendChild(imu);
  bridgeInjected = true;
}

function ensureListener(): void {
  if (listenerBound || typeof window === 'undefined') return;
  window.addEventListener('message', onMessage);
  listenerBound = true;
}

const pending = new Map<number, (res: ImuResult[] | null) => void>();
let listenerBound = false;

function onMessage(ev: MessageEvent) {
  if (ev.source !== window) return;
  const d = ev.data;
  if (!d || d.tag !== RES_TAG) return;
  const resolve = pending.get(d.id);
  if (!resolve) return;
  pending.delete(d.id);
  if (d.error) dbg.warn('imu', 'MAIN-world maxurl error', { id: d.id, error: d.error });
  resolve(d.error ? null : (d.result as ImuResult[]));
}

/**
 * 用 IMU 把缩略图 URL 升级为原图候选列表。
 * 返回已排序的候选(is_original 优先,去 bad/fake/video,去重),原 url 永远在末尾作保底。
 * IMU 不可用 / 超时 / 出错 → 返回 [url]。
 *
 * 注意:必须在 content script 环境(有 document + chrome.runtime.getURL)调用,
 * 不能在 service worker 调用。
 */
export async function upgradeImageUrl(url: string, opts: ImuOptions = {}): Promise<string[]> {
  const rules = opts.rules ?? DEFAULT_IMAGE_URL_RULES;
  const pinterestOriginal = pinterestOriginalUrl(url, rules);
  if (pinterestOriginal) {
    dbg.log('imu', 'Pinterest fast path', { original: url, best: pinterestOriginal });
    return [pinterestOriginal, url];
  }
  // 非 content script 环境(如测试 / service worker)直接返回原 url
  if (typeof document === 'undefined' || typeof chrome?.runtime?.getURL !== 'function') {
    dbg.warn('imu', 'upgradeImageUrl: not in content-script env, skip', { hasDoc: typeof document !== 'undefined' });
    return [url];
  }
  injectBridge();
  ensureListener();

  const timeout = opts.timeout ?? 3000;
  const id = ++reqId;
  const result = await new Promise<ImuResult[] | null>(resolve => {
    const to = setTimeout(() => { pending.delete(id); dbg.warn('imu', 'upgradeImageUrl timeout', { id, url }); resolve(null); }, timeout);
    pending.set(id, res => { clearTimeout(to); resolve(res); });
    window.postMessage({ tag: REQ_TAG, id, url, iterations: 200 }, '*');
  });

  if (!result || !result.length) {
    const fallback = fallbackImageCandidates(url, rules);
    dbg.warn('imu', 'no result, using fallback', { url, best: fallback[0] });
    return fallback;
  }
  const seen = new Set<string>();
  const ordered: { url: string; original: boolean }[] = [];
  for (const r of result) {
    if (!r || !r.url || r.bad || r.fake || r.video) continue;
    if (r.url === url || seen.has(r.url)) continue;
    seen.add(r.url);
    ordered.push({ url: r.url, original: !!r.is_original });
  }
  ordered.sort((a, b) => Number(b.original) - Number(a.original));
  const out = [...ordered.map(o => o.url)];
  const pinterestFallback = pinterestOriginalUrl(url, rules);
  if (pinterestFallback && !out.includes(pinterestFallback)) out.unshift(pinterestFallback);
  if (!out.includes(url)) out.push(url);
  dbg.log('imu', 'result', { original: url, best: out[0], count: out.length, fallback: !!pinterestFallback });
  return out;
}
