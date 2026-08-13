import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalFilePath, createFilePathSet } from './FilePathSet';

test('treats Windows slash variants as the same file', () => {
  const dbPath = 'I:\\sync\\BaiduSyncdisk\\game\\成长必修课封面.png';
  const scannedPath = 'I:/sync/BaiduSyncdisk/game/成长必修课封面.png';

  assert.equal(canonicalFilePath(dbPath), canonicalFilePath(scannedPath));
  assert.equal(createFilePathSet([dbPath]).has(canonicalFilePath(scannedPath)), true);
});

test('keeps different files distinct', () => {
  const paths = createFilePathSet([
    'I:/sync/BaiduSyncdisk/game/a.png',
    'I:/sync/BaiduSyncdisk/game/b.png',
  ]);

  assert.equal(paths.size, 2);
});
