const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/** 从资源 URL 生成文件名；URL 无扩展名时用响应 MIME 补全。 */
export function resourceFilename(url: string, mimeType?: string): string {
  const raw = url.split('/').pop()?.split('?')[0];
  if (!raw) return 'resource';

  let filename: string;
  try { filename = decodeURIComponent(raw); } catch { filename = raw; }
  if (/\.[a-z0-9]{1,10}$/i.test(filename)) return filename;

  const mime = mimeType?.split(';', 1)[0].trim().toLowerCase();
  const extension = mime ? MIME_EXTENSIONS[mime] : undefined;
  return extension ? `${filename}.${extension}` : filename;
}
