import type { StagedFile } from './types';

/**
 * File → StagedFile(用于跨上下文传输)
 * chrome.runtime.sendMessage 无法序列化 File,转成 ArrayBuffer + 元信息
 */
export async function fileToStaged(file: File): Promise<StagedFile> {
  const buffer = await file.arrayBuffer();
  return { name: file.name, type: file.type, buffer };
}

/**
 * StagedFile → File(service worker 侧重建)
 */
export function stagedToFile(staged: StagedFile): File {
  return new File([staged.buffer], staged.name, { type: staged.type });
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
