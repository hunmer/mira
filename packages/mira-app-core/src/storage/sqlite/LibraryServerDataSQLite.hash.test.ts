import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

describe('LibraryServerDataSQLite.calculateFileHashSync', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses the complete file content instead of its first 16 bytes', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-hash-'));
    tempDirs.push(tempDir);
    const firstPath = path.join(tempDir, 'first.jpg');
    const secondPath = path.join(tempDir, 'second.jpg');
    const sharedHeader = Buffer.from('ffd8ffe000104a464946000101010048', 'hex');
    const firstContent = Buffer.concat([sharedHeader, Buffer.from('first image')]);
    const secondContent = Buffer.concat([sharedHeader, Buffer.from('second image')]);
    fs.writeFileSync(firstPath, firstContent);
    fs.writeFileSync(secondPath, secondContent);

    const storage = new LibraryServerDataSQLite({});
    const firstHash = storage.calculateFileHashSync(firstPath);
    const secondHash = storage.calculateFileHashSync(secondPath);

    expect(firstHash).toBe(createHash('md5').update(firstContent).digest('hex'));
    expect(secondHash).toBe(createHash('md5').update(secondContent).digest('hex'));
    expect(firstHash).not.toBe(secondHash);
  });
});
