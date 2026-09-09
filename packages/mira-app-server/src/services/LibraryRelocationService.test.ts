import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { copyLibraryDirectory } from './LibraryRelocationService';

test('copyLibraryDirectory copies files and empty directories with progress', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mira-relocate-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const source = path.join(root, 'source');
    const destination = path.join(root, 'destination');
    await fs.promises.mkdir(path.join(source, 'nested', 'empty'), { recursive: true });
    await fs.promises.writeFile(path.join(source, 'one.txt'), 'one');
    await fs.promises.writeFile(path.join(source, 'nested', 'two.txt'), 'second');

    let latest = { totalFiles: 0, movedFiles: 0, totalBytes: 0, movedBytes: 0, current: '' };
    await copyLibraryDirectory(source, destination, progress => { latest = progress; });

    assert.equal(await fs.promises.readFile(path.join(destination, 'one.txt'), 'utf8'), 'one');
    assert.equal(await fs.promises.readFile(path.join(destination, 'nested', 'two.txt'), 'utf8'), 'second');
    assert.equal((await fs.promises.stat(path.join(destination, 'nested', 'empty'))).isDirectory(), true);
    assert.equal(latest.totalFiles, 2);
    assert.equal(latest.movedFiles, 2);
    assert.equal(latest.totalBytes, 9);
    assert.equal(latest.movedBytes, 9);
    assert.ok(['one.txt', path.join('nested', 'two.txt')].includes(latest.current));
});

test('copyLibraryDirectory rejects a non-empty destination', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mira-relocate-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const source = path.join(root, 'source');
    const destination = path.join(root, 'destination');
    await fs.promises.mkdir(source);
    await fs.promises.mkdir(destination);
    await fs.promises.writeFile(path.join(destination, 'existing.txt'), 'keep');

    await assert.rejects(
        copyLibraryDirectory(source, destination, () => undefined),
        /must be empty/,
    );
});

test('copyLibraryDirectory rejects nested source and destination paths', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mira-relocate-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const source = path.join(root, 'source');
    await fs.promises.mkdir(source);

    await assert.rejects(
        copyLibraryDirectory(source, path.join(source, 'nested'), () => undefined),
        /cannot contain each other/,
    );
});
