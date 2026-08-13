/**
 * 同步过滤器
 *
 * 把原来散落在三处（LibraryWatcher chokidar ignored、LibraryWatcher.shouldIgnore、
 * FsRouter scanDiskFiles）的硬编码忽略规则，统一成一份默认规则，并叠加用户在表单里
 * 配置的「黑名单 / 白名单」（gitignore 语义）。
 *
 * 语义（与 .gitignore 一致）：
 *   1. 先算默认排除 + 用户黑名单 → 命中即视为「排除」
 *   2. 再看白名单 → 命中则「强制包含」（覆盖第 1 步的排除）
 *   3. 没命中黑名单的文件 → 直接包含
 *
 * 黑名单里支持以 `!` 开头的「反向规则」：直接把该项挪到白名单，符合 gitignore 直觉。
 *
 * 模式语法（.gitignore 风格的子集）：
 *   - `*`      匹配单层任意字符（不含 `/`）
 *   - `**`     匹配多层任意字符（含 `/`）
 *   - `?`      匹配单个字符（不含 `/`）
 *   - `foo/`   目录前缀：匹配 foo 目录及其下所有内容
 *   - 普通字面量按原样匹配
 *   - 以 `#` 开头的行视为注释，空行忽略
 */

/** 默认排除规则（从原 3 处硬编码合并而来） */
export const DEFAULT_IGNORE_PATTERNS: readonly string[] = [
  'thumbs',
  'thumbs/**',
  '**/thumbs/**',
  '**/.*', // 任意点文件 / 点目录
  '.trash',
  '.trash/**',
  '**/.trash/**',
  '**/*.db',
  '**/*.db-journal',
  '**/*.db-wal',
  '**/*.db-shm',
  '**/*.tmp',
  '**/*.temp',
];

/** 固定排除规则：用户白名单也不能覆盖 */
export const FIXED_IGNORE_PATTERNS: readonly string[] = [
  '**/library_data.previous.db',
];

/** 库配置里 customFields 可能放同步过滤相关字段 */
export interface SyncFilterConfig {
  /** 用户黑名单（多行文本，每行一个 glob） */
  syncBlacklist?: string;
  /** 用户白名单（多行文本，每行一个 glob，强制包含） */
  syncWhitelist?: string;
}

export type ShouldSyncFn = (relPath: string) => boolean;

/**
 * 把 glob 模式编译成一条正则。支持 `*` / `**` / `?`，对其它特殊字符做字面转义。
 * `**` 匹配任意层级（含 `/`），`*` 与 `?` 不跨 `/`。
 */
export function globToRegExp(pattern: string): RegExp {
  // 统一 Windows 反斜杠
  const p = pattern.replace(/\\/g, '/');
  // 检测是否为目录前缀（以 / 结尾，如 "foo/"）：
  //   匹配 foo 自身，以及 foo/ 下的任意层级内容
  const isDirPrefix = /\/+$/.test(p);
  const body = p.replace(/\/+$/, '');

  let re = '^';
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === '*') {
      if (body[i + 1] === '*') {
        // ** ：跨任意层级
        // 处理 "**/" 与 "/**" 的可选斜杠，避免多余的斜杠导致不匹配
        if (body[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else if ('.+^${}()|[]'.includes(c)) {
      re += '\\' + c;
      i += 1;
    } else if (c === '/') {
      re += '/';
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  if (isDirPrefix) {
    // foo/ → 匹配 "foo" 或 "foo/..."
    re += '($|/.*)';
  } else {
    re += '$';
  }
  return new RegExp(re);
}

/**
 * 解析多行 textarea 文本：去掉空行与 `#` 注释，提取以 `!` 开头的反向规则。
 * @returns { include: 普通规则, reinclude: 以 ! 开头的反向规则（去掉 ! 后的正文） }
 */
export function parsePatternLines(raw: string | undefined | null): {
  include: string[];
  reinclude: string[];
} {
  const include: string[] = [];
  const reinclude: string[] = [];
  if (!raw) return { include, reinclude };

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('!')) {
      const body = trimmed.slice(1).trim();
      if (body) reinclude.push(body);
    } else {
      include.push(trimmed);
    }
  }
  return { include, reinclude };
}

/**
 * 构造一个同步判定函数。
 *
 * @param customFields 库配置里的同步过滤字段
 * @param extraIgnore  额外的黑名单规则（例如某些调用点临时需要追加排除）
 */
export function createSyncFilter(
  customFields: SyncFilterConfig | undefined | null = {},
  extraIgnore: string[] = [],
): ShouldSyncFn {
  const { include: userBlack, reinclude: blackReinclude } = parsePatternLines(
    customFields?.syncBlacklist,
  );
  const { include: userWhite } = parsePatternLines(customFields?.syncWhitelist);

  const blacklistPatterns = [...DEFAULT_IGNORE_PATTERNS, ...extraIgnore, ...userBlack];
  const whitelistPatterns = [...userWhite, ...blackReinclude];

  const fixedIgnoreRe = FIXED_IGNORE_PATTERNS.map(globToRegExp);
  const blacklistRe = blacklistPatterns.map(globToRegExp);
  const whitelistRe = whitelistPatterns.map(globToRegExp);

  // 归一化相对路径：统一成正斜杠，去掉开头的 ./
  const norm = (rel: string) => rel.replace(/\\/g, '/').replace(/^\.\//, '');

  return function shouldSync(relPath: string): boolean {
    if (!relPath) return true; // 库根目录本身
    const rel = norm(relPath);
    if (fixedIgnoreRe.some((re) => re.test(rel))) return false;

    const excluded = blacklistRe.some((re) => re.test(rel));
    if (!excluded) return true;
    return whitelistRe.some((re) => re.test(rel));
  };
}

/** 单条 glob 匹配（暴露出来便于外部 / 测试使用） */
export function matchGlob(relPath: string, pattern: string): boolean {
  if (!pattern) return false;
  const rel = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
  return globToRegExp(pattern).test(rel);
}

/**
 * 返回用于 fast-glob / chokidar 的「黑名单 glob 数组」（默认 + 用户黑名单）。
 * 注意：fast-glob 的 ignore 只能表达「排除」，无法表达白名单的「强制包含」。
 * 因此调用方在拿到 glob 结果后，还需用 createSyncFilter() 返回的 shouldSync
 * 做一次白名单覆盖判定。
 */
export function getIgnoreGlobs(customFields: SyncFilterConfig | undefined | null = {}): string[] {
  const { include: userBlack } = parsePatternLines(customFields?.syncBlacklist);
  return [...FIXED_IGNORE_PATTERNS, ...DEFAULT_IGNORE_PATTERNS, ...userBlack];
}
