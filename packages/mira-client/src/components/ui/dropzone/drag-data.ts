/**
 * 拖拽数据工具（自 mira-plugin-ui library/drag-data 精简，两处维护）。
 * Dropzone 只需要 dragover 期的存在性判断；完整 drop 解析见 plugin-ui 源版本。
 */

/**
 * dragover 期间判断是否允许落点(只能看 types,读不到数据)。
 * 含 Files 或 text/uri-list / text/html / text/plain 任一即视为可接受。
 */
export function canAcceptDrop(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const types = Array.from(dt.types);
  return (
    types.includes('Files') ||
    types.includes('text/uri-list') ||
    types.includes('text/html') ||
    types.includes('text/plain')
  );
}

/**
 * 推断链接资源类型(用于按链接上传时的 kind)。
 */
export function urlKind(url: string): 'image' | 'audio' | 'video' {
  const u = url.split('?')[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)(\.|$)/.test(u) || u.startsWith('data:image/')) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\.|$)/.test(u)) return 'audio';
  if (/\.(mp4|webm|mov|avi|mkv|m4v)(\.|$)/.test(u)) return 'video';
  return 'image';
}
