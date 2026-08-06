let offscreenReady = false;

// 与 @crxjs 保留目录的产物路径一致(源 src/offscreen/index.html → dist/src/offscreen/index.html)
const OFFSCREEN_URL = 'src/offscreen/index.html';

/**
 * 确保 offscreen document 已创建(MV3 service worker 无 DOM,需 offscreen 做 Canvas)
 *
 * reasons 必须是 Chrome 合法值(见 chrome.offscreen.Reason 枚举)。
 * Canvas convertToBlob 产出 Blob,用 BLOBS;不可用 IMAGE_PROCESSING(那是 Firefox/Edge 的,
 * Chrome 会拒绝)。DOM_PARSER / DOM_SCRAPING 也合法,但 BLOBS 最贴合本用途。
 */
export async function ensureOffscreen(): Promise<void> {
  if (offscreenReady) return;
  // 检查是否已存在
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      // 用枚举成员(Reason 是 enum,字符串字面量不直接兼容);BLOBS 对应 Canvas convertToBlob
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: '截图拼接与裁剪需要 Canvas convertToBlob',
    });
  }
  offscreenReady = true;
}

export async function closeOffscreen(): Promise<void> {
  if (!offscreenReady) return;
  await chrome.offscreen.closeDocument();
  offscreenReady = false;
}

interface StitchMsg {
  type: 'STITCH';
  frames: string[];
  viewportHeight: number;
}

interface CropMsg {
  type: 'CROP';
  dataUrl: string;
  rect: { x: number; y: number; w: number; h: number; dpr: number };
}

type OffscreenMsg = StitchMsg | CropMsg;

async function sendToOffscreen(msg: OffscreenMsg): Promise<string> {
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage(msg);
  if (res?.error) throw new Error(res.error);
  return res.dataUrl as string;
}

/** 拼接多帧截图(整页) */
export async function stitchFrames(
  frames: string[],
  dims: { scrollHeight: number; viewportHeight: number },
): Promise<string> {
  return sendToOffscreen({
    type: 'STITCH',
    frames,
    viewportHeight: dims.viewportHeight,
  });
}

/** 裁剪图片(选区) */
export async function cropImage(
  dataUrl: string,
  rect: { x: number; y: number; w: number; h: number; dpr: number },
): Promise<string> {
  return sendToOffscreen({ type: 'CROP', dataUrl, rect });
}
