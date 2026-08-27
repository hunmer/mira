/**
 * 拖拽数据提取工具(自 mira-browser-extension shared/drag-data 迁移,静默版)。
 *
 * 浏览器拖拽来源有两类:
 *  1. 本地文件 —— dataTransfer.files / items(kind==='file')
 *  2. 链接 / 富文本 —— dataTransfer.getData('text/uri-list') 或 text/html / text/plain
 *
 * 链接拖拽时 dataTransfer.files 为空,只有 MIME 文本数据,故需单独从 uri-list / 文本里解析 url。
 */

export interface ParsedDrop {
  /** 本地文件(若有) */
  files: File[];
  /** 解析出的链接(若有) */
  urls: string[];
  /** 是否有可处理内容(文件或链接) */
  hasContent: boolean;
}

/**
 * 从 URI-list 文本里提取 url(一行一个,# 开头是注释)。
 * 兼容 Safari 把多条 uri 直接塞进 'text/uri-list' 的情况。
 */
function parseUriList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('#'));
}

/**
 * 从 text/html 里抠 <img src> / <a href>(富文本拖拽的兜底)。
 * dataTransfer 的 text/html 通常是单个 <img> 或 <a> 片段。
 */
function extractUrlsFromHtml(html: string): string[] {
  const imageUrls = new Set<string>();
  // Pinterest 等站点可能只写 data-src/data-original，或用 srcset 提供多张候选图。
  const imgRe = /<img\b[^>]*?(?:src|data-src|data-original|data-lazy-src|data-image-url)=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) imageUrls.add(m[1]);
  const srcsetRe = /<img\b[^>]*?srcset=["']([^"']+)["'][^>]*>/gi;
  while ((m = srcsetRe.exec(html))) {
    const candidates = m[1].split(',').map(candidate => candidate.trim().split(/\s+/)[0]).filter(Boolean);
    if (candidates.length) imageUrls.add(candidates[candidates.length - 1]);
  }
  // 图片被 <a> 包裹时，href 通常是图片所在页面，不是待上传资源。
  if (imageUrls.size) return [...imageUrls];

  const linkUrls = new Set<string>();
  const aRe = /<a[^>]+href=["']([^"']+)["']/gi;
  while ((m = aRe.exec(html))) linkUrls.add(m[1]);
  return [...linkUrls];
}

/** 判断字符串是否像 url(http/https/相对协议) */
function looksLikeUrl(s: string): boolean {
  if (!s) return false;
  const t = s.trim();
  return /^https?:\/\//i.test(t) || /^\/\//.test(t) || /^data:image\//i.test(t);
}

/**
 * 把一个 DataTransfer / DragEvent 解析成 { files, urls }。
 *
 * 注意:URI 数据只能在 drop 时读取(dragover 期间 getData 通常返回空字符串,出于安全),
 * 所以 url 解析以 drop 为主;canAcceptDrop 只用 types 做存在性判断。
 */
export function parseDrop(e: DragEvent): ParsedDrop {
  const dt = e.dataTransfer;
  if (!dt) return { files: [], urls: [], hasContent: false };

  const files = Array.from(dt.files ?? []);

  // 链接:含图片的富文本优先,避免把图片外层页面 href 当成资源;
  // 无图片时再回退到标准 URI-list / 裸文本。
  const urls = new Set<string>();
  const html = dt.getData('text/html');
  const htmlUrls = html ? extractUrlsFromHtml(html) : [];
  const htmlHasImage = /<img\b/i.test(html);
  if (html && htmlHasImage) {
    for (const u of htmlUrls) urls.add(u);
  }
  if (!htmlHasImage) {
    const uriList = dt.getData('text/uri-list') || dt.getData('text/x-moz-url') || dt.getData('text/url');
    if (uriList) {
      for (const u of parseUriList(uriList)) urls.add(u);
    }
    const text = dt.getData('text/plain');
    if (text) {
      // 多行文本逐行判断,只收像 url 的行
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (looksLikeUrl(t)) urls.add(t);
      }
    }
    // 没有标准 URI / 纯文本时，才回退到 HTML 中的链接。
    if (!urls.size) for (const u of htmlUrls) urls.add(u);
  }
  // Pinterest 专用拖拽数据:application/x-pinterest-closeup-image(JSON previewImageUrl)
  let pinterestUrl: string | undefined;
  for (const type of Array.from(dt.types)) {
    if (!type.toLowerCase().includes('pinterest')) continue;
    try {
      const payload = JSON.parse(dt.getData(type));
      if (typeof payload?.previewImageUrl === 'string') pinterestUrl = payload.previewImageUrl;
    } catch { /* 非 JSON 或读取失败时忽略 */ }
  }
  if (pinterestUrl) { urls.clear(); urls.add(pinterestUrl); }

  // data:image base64 可能出现在 text/uri-list 或 text/plain,上面已收
  // 过滤掉非 http(s) / data 协议(javascript: 等不安全)
  const safeUrls = [...urls].filter(u => /^https?:\/\//i.test(u) || /^data:image\//i.test(u));

  return { files, urls: safeUrls, hasContent: files.length > 0 || safeUrls.length > 0 };
}

/**
 * dragover 期间判断是否允许落点(只能看 types,读不到数据)。
 * 含 Files 或 text/uri-list / text/html / text/plain 任一即视为可接受。
 */
export function canAcceptDrop(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const types = Array.from(dt.types).map(t => t.toLowerCase());
  return types.includes('files') || types.some(t =>
    t === 'text/plain' || t.includes('html') || t.includes('uri') || t.includes('url') || t.includes('nativeimage') || t.includes('pinterest'),
  );
}

/**
 * 树内节点拖拽排序的自定义 MIME。
 * 与文件/链接拖拽区分:dragover 期间凭 types 识别,drop 时可读 id。
 */
export const NODE_DND_TYPE = 'application/x-mira-library-node';

/** 判断当前拖拽是否为树内节点排序(与文件/链接上传拖拽互斥分流) */
export function isNodeDrag(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types).includes(NODE_DND_TYPE);
}

/**
 * 推断链接资源类型(用于按链接上传时的 kind)。
 * 仅看扩展名 / data: 前缀,不准也无妨 —— 后端按实际 blob.type 处理。
 */
export function urlKind(url: string): 'image' | 'audio' | 'video' {
  const u = url.split('?')[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)(\.|$)/.test(u) || u.startsWith('data:image/')) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\.|$)/.test(u)) return 'audio';
  if (/\.(mp4|webm|mov|avi|mkv|m4v)(\.|$)/.test(u)) return 'video';
  // 默认按图片处理(网页拖图最常见)
  return 'image';
}
