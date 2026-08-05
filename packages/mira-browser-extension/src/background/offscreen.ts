let offscreenReady = false;

const OFFSCREEN_URL = 'offscreen/index.html';

/**
 * 确保 offscreen document 已创建(MV3 service worker 无 DOM,需 offscreen 做 Canvas)
 */
export async function ensureOffscreen(): Promise<void> {
  if (offscreenReady) return;
  // 检查是否已存在
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['IMAGE_PROCESSING' as chrome.offscreen.Reason],
      justification: '截图拼接与裁剪需要 Canvas',
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
