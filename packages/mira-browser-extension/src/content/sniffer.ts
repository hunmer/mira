import type { SniffedResource, ResourceKind } from '@/shared/types';
import { dbg } from '@/shared/debug';

const MIN_IMAGE_SIZE = 32; // 小于此尺寸过滤(图标/占位图)
const DATA_URL_RE = /^data:/i;

/** url → 稳定 id(简单 hash) */
export function urlToId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return 'r' + Math.abs(hash).toString(36);
}

export function isMediaInitiator(type: string): boolean {
  return type === 'img' || type === 'video' || type === 'audio';
}

/** 判断 mime 是否为指定 kind */
function inferKindFromMime(mime: string): ResourceKind | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

/**
 * 从 DOM 提取资源(纯逻辑,基于 document 全局)
 */
export function extractFromDOM(kinds: ResourceKind[]): SniffedResource[] {
  const result: SniffedResource[] = [];
  const now = Date.now();
  const want = (k: ResourceKind) => kinds.includes(k);

  // img
  if (want('image')) {
    document.querySelectorAll('img').forEach(img => {
      const src = img.currentSrc || img.src;
      if (!src || DATA_URL_RE.test(src)) return;
      const nw = (img as any).naturalWidth ?? img.width;
      const nh = (img as any).naturalHeight ?? img.height;
      if (nw && nh && nw < MIN_IMAGE_SIZE && nh < MIN_IMAGE_SIZE) return;
      // srcset 变体
      let variants: string[] | undefined;
      if (img.srcset) {
        variants = img.srcset.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
      }
      result.push({
        id: urlToId(src), url: src, kind: 'image', source: 'dom',
        width: nw || undefined, height: nh || undefined,
        variants, occurrences: 1, sniffedAt: now,
      });
    });

    // background-image
    document.querySelectorAll<HTMLElement>('[style*="background"], .bg-cover, .bg-contain').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      const match = /url\(["']?(.*?)["']?\)/.exec(bg);
      if (match && !DATA_URL_RE.test(match[1])) {
        result.push({
          id: urlToId(match[1]), url: match[1], kind: 'image', source: 'dom',
          occurrences: 1, sniffedAt: now,
        });
      }
    });
  }

  // video
  if (want('video')) {
    document.querySelectorAll('video').forEach(v => {
      const src = (v as HTMLVideoElement).currentSrc || v.src;
      if (!src || DATA_URL_RE.test(src)) return;
      result.push({
        id: urlToId(src), url: src, kind: 'video', source: 'dom',
        duration: isFinite(v.duration) ? v.duration : undefined,
        poster: v.poster || undefined,
        width: v.videoWidth || undefined, height: v.videoHeight || undefined,
        occurrences: 1, sniffedAt: now,
      });
    });
  }

  // audio
  if (want('audio')) {
    document.querySelectorAll('audio').forEach(a => {
      const src = (a as HTMLAudioElement).currentSrc || a.src;
      if (!src || DATA_URL_RE.test(src)) return;
      result.push({
        id: urlToId(src), url: src, kind: 'audio', source: 'dom',
        duration: isFinite(a.duration) ? a.duration : undefined,
        occurrences: 1, sniffedAt: now,
      });
    });
  }

  return dedupeByUrl(result);
}

/** 按 url 去重(同一次扫描内) */
export function dedupeByUrl(resources: SniffedResource[]): SniffedResource[] {
  const map = new Map<string, SniffedResource>();
  for (const r of resources) {
    const existing = map.get(r.id);
    if (existing) existing.occurrences++;
    else map.set(r.id, { ...r });
  }
  return [...map.values()];
}

/** 合并新旧资源(跨次扫描,累加 occurrences) */
export function mergeResources(
  existing: SniffedResource[],
  incoming: SniffedResource[],
): SniffedResource[] {
  const map = new Map(existing.map(r => [r.id, { ...r }]));
  for (const r of incoming) {
    const cur = map.get(r.id);
    if (cur) cur.occurrences += r.occurrences;
    else map.set(r.id, { ...r });
  }
  return [...map.values()];
}

export interface Sniffer {
  start(kinds: ResourceKind[]): void;
  stop(): void;
  getResources(): SniffedResource[];
}

/**
 * 创建嗅探器(DOM 扫描 + PerformanceObserver + MutationObserver)
 */
export function createSniffer(onUpdate: (resources: SniffedResource[]) => void): Sniffer {
  let resources: SniffedResource[] = [];
  let kinds: ResourceKind[] = ['image', 'audio', 'video'];
  let perfObs: PerformanceObserver | null = null;
  let mutObs: MutationObserver | null = null;
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  let reportTimer: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    perfObs?.disconnect();
    mutObs?.disconnect();
    if (scanTimer) clearTimeout(scanTimer);
    if (reportTimer) clearTimeout(reportTimer);
    perfObs = mutObs = null;
    scanTimer = reportTimer = null;
  }

  function scan() {
    const fresh = extractFromDOM(kinds);
    dbg.log('sniffer', 'scan', { kinds, freshCount: fresh.length });
    resources = mergeResources(resources, fresh);
    scheduleReport();
  }

  function scheduleReport() {
    if (reportTimer) return;
    reportTimer = setTimeout(() => {
      reportTimer = null;
      dbg.log('sniffer', 'report', { totalCount: resources.length });
      onUpdate([...resources]);
    }, 500);
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 300);
  }

  return {
    start(k) {
      cleanup();
      kinds = k;
      resources = [];
      dbg.info('sniffer', 'start', { kinds, hasBody: !!document.body, imgCount: document.querySelectorAll('img').length });
      scan();
      // PerformanceObserver:抓懒加载/动态资源
      try {
        perfObs = new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            // initiatorType 仅存在于 PerformanceResourceTiming
            const initiatorType = (e as PerformanceResourceTiming).initiatorType;
            if (!isMediaInitiator(initiatorType)) continue;
            const kind = initiatorType === 'img' ? 'image' : (initiatorType as ResourceKind);
            if (!kinds.includes(kind)) continue;
            if (DATA_URL_RE.test(e.name)) continue;
            const r: SniffedResource = {
              id: urlToId(e.name), url: e.name, kind, source: 'perf',
              occurrences: 1, sniffedAt: Date.now(),
            };
            resources = mergeResources(resources, [r]);
            dbg.log('sniffer', 'perf found', { kind, url: e.name });
            scheduleReport();
          }
        });
        perfObs.observe({ entryTypes: ['resource'] });
      } catch (e) { dbg.warn('sniffer', 'PerformanceObserver unavailable', e); /* PerformanceObserver 不可用 */ }

      // MutationObserver:新节点触发增量扫描
      mutObs = new MutationObserver(() => scheduleScan());
      if (document.body) mutObs.observe(document.body, { childList: true, subtree: true });
      else dbg.warn('sniffer', 'no document.body to observe');
    },
    stop() {
      dbg.info('sniffer', 'stop');
      cleanup();
    },
    getResources() {
      return [...resources];
    },
  };
}
