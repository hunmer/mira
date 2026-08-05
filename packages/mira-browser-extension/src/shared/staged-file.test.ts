import { describe, it, expect } from 'vitest';
import { stagedToFile, bufferToDataUrl, dataUrlToBlob } from './staged-file';

describe('staged-file', () => {
  it('stagedToFile 还原文件名和类型', () => {
    const buffer = new ArrayBuffer(3);
    new Uint8Array(buffer).set([1, 2, 3]);
    const file = stagedToFile({ name: 'a.png', type: 'image/png', buffer });
    expect(file.name).toBe('a.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(3);
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
