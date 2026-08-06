import type { Theme } from '@/shared/types';

/**
 * 主题应用:把 Theme 解析为实际的 light/dark。
 * 'auto' → 跟随 prefers-color-scheme。
 */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  const prefersLight =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

/**
 * 把解析后的主题写到 <html data-theme>。可在 Vue 挂载前调用以避免闪烁。
 */
export function applyTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', resolved);
}

/**
 * 监听系统主题变化(仅 theme==='auto' 时生效),系统变化时回调新解析值。
 * 返回取消监听函数。
 */
export function watchSystemTheme(cb: (resolved: 'light' | 'dark') => void): () => void {
  if (typeof matchMedia === 'undefined') return () => {};
  const mq = matchMedia('(prefers-color-scheme: light)');
  const handler = () => cb(mq.matches ? 'light' : 'dark');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
