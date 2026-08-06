import { describe, it, expect } from 'vitest';
import { stagedToFile, fileToStaged, bufferToDataUrl, dataUrlToBlob } from './staged-file';
import type { StagedFile } from './types';

describe('staged-file', () => {
  it('stagedToFile 还原 number[] 主路径', () => {
    const file = stagedToFile({ name: 'a.png', type: 'image/png', buffer: [1, 2, 3] });
    expect(file.name).toBe('a.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(3);
  });

  it('stagedToFile 兼容 Uint8Array', () => {
    const file = stagedToFile({ name: 'a.png', type: 'image/png', buffer: new Uint8Array([1, 2, 3, 4]) });
    expect(file.size).toBe(4);
  });

  it('stagedToFile 兼容旧 ArrayBuffer', () => {
    const buffer = new ArrayBuffer(3);
    new Uint8Array(buffer).set([1, 2, 3]);
    const file = stagedToFile({ name: 'a.png', type: 'image/png', buffer: buffer as unknown as number[] });
    expect(file.size).toBe(3);
  });

  // 回归:Uint8Array 经 sendMessage 结构化克隆退化成 {0:x,1:y,...} 类数组对象,
  // 必须能正确还原(这是真实线上 bug)
  it('stagedFromFile 兼容类数组普通对象 {0:x,1:y,length:n}', () => {
    const arrayLike = { 0: 255, 1: 216, 2: 255, length: 3 } as unknown as number[];
    const file = stagedToFile({ name: 'a.jpg', type: 'image/jpeg', buffer: arrayLike });
    expect(file.size).toBe(3);
  });

  it('stagedToFile 对完全损坏的对象降级为 0 字节(不抛)', () => {
    const file = stagedToFile({ name: 'a.png', type: 'image/png', buffer: {} as unknown as number[] });
    expect(file.size).toBe(0);
    expect(file.name).toBe('a.png');
  });

  it('fileToStaged → stagedToFile 往返字节数一致', async () => {
    const original = new File([new Uint8Array([10, 20, 30, 40])], 'b.jpg', { type: 'image/jpeg' });
    const staged = await fileToStaged(original);
    expect(Array.isArray(staged.buffer)).toBe(true);
    expect(staged.buffer.length).toBe(4);
    const restored = stagedToFile(staged);
    expect(restored.size).toBe(4);
    expect(restored.type).toBe('image/jpeg');
  });

  it('bufferToDataUrl 生成 data url', async () => {
    const buffer = new ArrayBuffer(2);
    new Uint8Array(buffer).set([255, 216]); // JPEG SOI marker
    const url = await bufferToDataUrl(buffer, 'image/jpeg');
    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('dataUrlToBlob 还原 blob', () => {
    const blob = dataUrlToBlob('data:text/plain;base64,aGVsbG8=');
    expect(blob.size).toBe(5);
    expect(blob.type).toBe('text/plain');
  });
});


