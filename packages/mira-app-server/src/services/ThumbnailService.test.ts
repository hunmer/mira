import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ThumbnailService } from './ThumbnailService';

async function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for thumbnail generation');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('generates an imported copy thumbnail from the library file path', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-thumbnail-import-'));
  const sourcePath = path.join(directory, 'image.jpg');
  const thumbPath = path.join(directory, 'thumbs', '7.png');
  fs.writeFileSync(sourcePath, 'original image');

  const generatedFrom: string[] = [];
  const service = new ThumbnailService();
  service.registerGenerator({
    name: 'test-image',
    supportedExtensions: ['jpg'],
    async generate(inputPath, outputPath) {
      generatedFrom.push(inputPath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, 'thumbnail');
    },
  });

  const file = { id: 7, name: 'image.jpg', path: null, thumb: 0 };
  const dbService = {
    getFile: async () => ({ ...file }),
    getItemFilePath: async () => sourcePath,
    getItemThumbPath: async () => thumbPath,
    updateFile: async () => ({ success: true, oldData: null }),
  } as any;

  try {
    service.onFileImported('library-1', file, dbService);
    await waitFor(() => generatedFrom.length > 0);

    assert.deepEqual(generatedFrom, [sourcePath]);
    assert.equal(fs.readFileSync(thumbPath, 'utf8'), 'thumbnail');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
