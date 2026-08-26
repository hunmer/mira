import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MetadataService } from './MetadataService';

test('extracts metadata for a copied file whose database path is null', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-metadata-service-'));
  const sourcePath = path.join(directory, 'image.jpg');
  fs.writeFileSync(sourcePath, 'original image');

  const service = new MetadataService(process.execPath);
  let resolvedPath = '';
  const dbService = {
    getItemFilePath: async () => { resolvedPath = sourcePath; return sourcePath; },
    updateFile: async () => ({ success: true, oldData: null }),
  } as any;
  const file = { id: 9, name: 'image.jpg', path: null, metadata: null };

  try {
    let settled = false;
    const originalError = console.error;
    console.error = () => undefined;
    assert.equal(service.enqueue(file, dbService, () => { settled = true; }), true);
    const deadline = Date.now() + 1000;
    while (!settled && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    console.error = originalError;

    assert.equal(settled, true);
    assert.equal(resolvedPath, sourcePath);
  } finally {
    service.clear();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
