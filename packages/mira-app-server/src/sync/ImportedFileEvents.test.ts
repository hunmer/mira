import assert from 'node:assert/strict';
import test from 'node:test';
import { publishImportedFile } from './ImportedFileEvents';

test('publishes the internal thumbnail event and client event after import', async () => {
  const calls: Array<{ kind: string; args: any[] }> = [];
  const target = {
    async broadcastPluginEvent(...args: any[]) {
      calls.push({ kind: 'internal', args });
      return true;
    },
    broadcastLibraryEvent(...args: any[]) {
      calls.push({ kind: 'client', args });
    },
  };

  await publishImportedFile(target, 'library-1', { id: 7, name: 'image.png', path: 'I:/image.png' });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    kind: 'internal',
    args: ['file::created', {
      message: { type: 'file', action: 'create' },
      result: { id: 7, name: 'image.png', path: 'I:/image.png' },
      libraryId: 'library-1',
    }],
  });
  assert.deepEqual(calls[1], {
    kind: 'client',
    args: ['library-1', 'file::created', {
      id: 7, name: 'image.png', path: 'I:/image.png', libraryId: 'library-1',
    }],
  });
});
