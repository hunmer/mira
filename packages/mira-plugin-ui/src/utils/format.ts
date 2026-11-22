/**
 * 包内共享格式化工具（唯一实现，组件内禁止重写；参见 claude/report.md 复用守则）。
 */

/**
 * 文件大小格式化：B/KB/MB/GB（B 档整数，其余保留 1 位小数）。
 *
 * @param bytes 字节数；0/undefined/null 返回 fallback（默认 '0 B'）
 * @param fallback 无效字节数时的展示文案（如 MediaDetail 的 '—'、MediaBrowser 的 ''）
 */
export function formatSize(bytes?: number, fallback = '0 B'): string {
  if (!bytes) return fallback;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
