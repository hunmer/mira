/**
 * offscreen Canvas 图像处理 —— 纯逻辑 + Canvas 实现
 */

/**
 * 计算拼接画布尺寸(纯逻辑,可测)
 */
export function computeStitchSize(
  frames: string[],
  viewportHeight: number,
): { width: number; height: number } {
  // 宽度取首帧(可视区域宽度);高度 = 视口高度 × 帧数
  // 简化:全部按 viewportHeight,最后一帧若不足会被裁剪逻辑处理
  return { width: 0, height: frames.length * viewportHeight };
}

/**
 * 计算裁剪目标矩形(乘以 devicePixelRatio,纯逻辑,可测)
 */
export function scaleRect(rect: {
  x: number;
  y: number;
  w: number;
  h: number;
  dpr: number;
}): { sx: number; sy: number; sw: number; sh: number } {
  const { x, y, w, h, dpr } = rect;
  return { sx: x * dpr, sy: y * dpr, sw: w * dpr, sh: h * dpr };
}

/**
 * 拼接多帧 dataURL(整页截图)
 */
export async function stitch(
  frames: string[],
  viewportHeight: number,
): Promise<string> {
  if (frames.length === 0) throw new Error('no frames');
  // 加载首帧确定宽度
  const first = await loadImage(frames[0]);
  const width = first.naturalWidth;
  // 用首帧实际高度作单位(处理 dpr)
  const frameHeight = first.naturalHeight;
  const canvas = new OffscreenCanvas(width, frameHeight * frames.length);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  for (let i = 0; i < frames.length; i++) {
    const img = i === 0 ? first : await loadImage(frames[i]);
    ctx.drawImage(img, 0, i * frameHeight);
  }
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(blob);
}

/**
 * 裁剪图片(选区)
 */
export async function crop(
  dataUrl: string,
  rect: { x: number; y: number; w: number; h: number; dpr: number },
): Promise<string> {
  const img = await loadImage(dataUrl);
  const { sx, sy, sw, sh } = scaleRect(rect);
  const canvas = new OffscreenCanvas(rect.w * rect.dpr, rect.h * rect.dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, rect.w * rect.dpr, rect.h * rect.dpr);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(blob);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('blob read failed'));
    reader.readAsDataURL(blob);
  });
}
