import type { StagedFile } from './types';
import { dbg } from './debug';

/**
 * File → StagedFile(用于跨上下文传输)
 * chrome.runtime.sendMessage 无法序列化 File,转成普通 number[] + 元信息。
 *
 * 重要:不能用 ArrayBuffer 也不能用 Uint8Array —— 实测 UI → service worker 经
 * 结构化克隆:裸 ArrayBuffer 会变成空对象 {};Uint8Array 会变成 {0:255,1:216,...}
 * 的「类数组普通对象」(丢掉 TypedArray 身份,instanceof 全部失败)。
 * 普通 number[] 是真正的 Array,结构化克隆稳定,代价是内存翻倍(可接受)。
 */
export async function fileToStaged(file: File): Promise<StagedFile> {
  const buffer = await file.arrayBuffer();
  const bytes = Array.from(new Uint8Array(buffer));
  dbg.log('staged', 'fileToStaged', { name: file.name, type: file.type, size: file.size, bytesLen: bytes.length });
  return { name: file.name, type: file.type, buffer: bytes };
}

/**
 * 把到达 service worker 的任意形态 buffer 规整成 Uint8Array。
 * 兼容:number[] / Uint8Array / ArrayBuffer / 类数组对象 {0:x,1:y,...} / 损坏对象。
 */
function normalizeBytes(buf: unknown): Uint8Array {
  // 真正的数组(number[])—— 主路径
  if (Array.isArray(buf)) {
    return new Uint8Array(buf);
  }
  // Uint8Array / 其他 TypedArray
  if (buf instanceof Uint8Array) return buf;
  if (ArrayBuffer.isView(buf as any)) {
    const view = buf as unknown as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  // ArrayBuffer
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  // 类数组普通对象 {0:255,1:216,...}(Uint8Array 经结构化克隆退化成的形态)
  if (buf && typeof buf === 'object') {
    const obj = buf as Record<string, number>;
    // 用 length 字段(若有)或遍历键确定长度
    const len = typeof obj.length === 'number' ? obj.length : Object.keys(obj).length;
    if (len > 0) {
      const out = new Uint8Array(len);
      for (let i = 0; i < len; i++) out[i] = obj[i] ?? 0;
      return out;
    }
  }
  dbg.error('staged', 'normalizeBytes: unrecognized buffer', { got: buf });
  return new Uint8Array(0);
}

/**
 * StagedFile → File(service worker 侧重建)
 */
export function stagedToFile(staged: StagedFile): File {
  const bytes = normalizeBytes(staged.buffer);
  dbg.log('staged', 'stagedToFile', { name: staged.name, type: staged.type, bytesLen: bytes.length });
  return new File([bytes], staged.name, { type: staged.type || 'application/octet-stream' });
}

/**
 * ArrayBuffer → dataURL(截图 dataURL 转 File 用)
 *
 * 优先使用浏览器原生 FileReader(扩展运行时 service worker / content script 可用)。
 * Node 测试环境无全局 FileReader,降级为 Buffer 手工拼 base64 dataURL,
 * 产物格式与 FileReader.readAsDataURL 一致:`data:<type>;base64,<data>`。
 */
export function bufferToDataUrl(buffer: ArrayBuffer, type: string): Promise<string> {
  if (typeof FileReader === 'undefined') {
    const base64 = Buffer.from(new Uint8Array(buffer)).toString('base64');
    return Promise.resolve(`data:${type};base64,${base64}`);
  }
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type });
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * dataURL → Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const type = /data:(.*?);base64/.exec(meta)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * dataURL → File
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  return new File([dataUrlToBlob(dataUrl)], filename, {
    type: dataUrlToBlob(dataUrl).type,
  });
}
