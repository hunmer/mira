import assert from 'node:assert/strict';
import test from 'node:test';
import { DuplicateFile, DuplicateScanner } from './DuplicateScanner';

function file(id: number, title: string, size: number, hash?: string): DuplicateFile {
    return {
        id,
        name: title,
        title,
        size,
        hash,
        path: `/library/${id}.png`,
        folder_id: null,
        created_at: 1786579200000,
    };
}

function database(
    files: DuplicateFile[],
    getItemFilePath: (file: DuplicateFile) => Promise<string> = async file => file.path,
    deleteFile: (id: number) => Promise<boolean> = async () => true,
) {
    return {
        getFiles: async (options?: any) => ({ result: files, limit: options?.filters?.limit, offset: 0, total: files.length }),
        getItemFilePath,
        deleteFile,
    } as any;
}

test('scans name and size candidates before confirming matching hashes', async () => {
    let requestedLimit = 0;
    let requestedSelect = '';
    let requestedCountFile = false;
    let requestedRecycled: boolean | undefined;
    const resolvedNames: string[] = [];
    const db = database([file(1, 'a', 10, 'same'), file(2, 'a', 10, 'same'), file(3, 'a', 20)]);
    db.getItemFilePath = async (item: DuplicateFile) => {
        resolvedNames.push(item.name);
        return item.path;
    };
    db.getFiles = async (options?: any) => {
        requestedLimit = options?.filters?.limit;
        requestedRecycled = options?.filters?.recycled;
        requestedSelect = options?.select;
        requestedCountFile = options?.countFile;
        return { result: [file(1, 'a', 10, 'same'), file(2, 'a', 10, 'same'), file(3, 'a', 20)], limit: requestedLimit, offset: 0, total: 3 };
    };

    const result = await new DuplicateScanner(db, async () => 'same').scan();

    assert.equal(requestedLimit, Number.MAX_SAFE_INTEGER);
    assert.equal(requestedRecycled, false);
    assert.equal(requestedSelect, 'id, name, name AS title, path, size, hash, folder_id, created_at, recycled');
    assert.equal(requestedCountFile, true);
    assert.deepEqual(resolvedNames, ['a', 'a']);
    assert.equal(result.candidateGroups, 1);
    assert.equal(result.candidateFiles, 2);
    assert.equal(result.computedHashes, 2);
    assert.deepEqual(result.hashErrors, []);
    assert.equal(result.totalGroups, 1);
    assert.equal(result.totalFiles, 2);
    assert.deepEqual(result.groups[0].files.map(item => item.id), [1, 2]);
});

test('resolves current paths and computes MD5 for every first-round candidate', async () => {
    const calculatedPaths: string[] = [];
    const scanner = new DuplicateScanner(database([
        file(1, 'a', 10, 'same'),
        file(2, 'a', 10),
        file(3, 'unique', 20),
    ], async file => `/resolved${file.path}`), async (path) => {
        calculatedPaths.push(path);
        return 'same';
    });

    const result = await scanner.scan();

    assert.deepEqual(calculatedPaths, ['/resolved/library/1.png', '/resolved/library/2.png']);
    assert.equal(result.computedHashes, 2);
    assert.equal(result.totalGroups, 1);
    assert.equal(result.groups[0].hash, 'same');
    assert.deepEqual(result.groups[0].files.map(item => item.id), [1, 2]);
});

test('resolves non-recycled records with null database paths from name and folder hierarchy', async () => {
    const candidates = [
        { ...file(1, 'same.png', 10), path: null as any, folder_id: 3 },
        { ...file(2, 'same.png', 10), path: null as any, folder_id: 3 },
    ];
    const calculatedPaths: string[] = [];
    const scanner = new DuplicateScanner(database(candidates, async item => {
        assert.equal(item.name, 'same.png');
        assert.equal(item.folder_id, 3);
        return `D:/library/parent/child/${item.name}`;
    }), async filePath => {
        calculatedPaths.push(filePath);
        return 'same';
    });

    const result = await scanner.scan();

    assert.deepEqual(calculatedPaths, ['D:/library/parent/child/same.png']);
    assert.equal(result.totalFiles, 2);
    assert.deepEqual(result.hashErrors, []);
});

test('reports unreadable candidates without failing the scan', async () => {
    const scanner = new DuplicateScanner(database([
        file(1, 'a', 10, 'same'),
        file(2, 'a', 10),
    ]), async path => {
        if (path.endsWith('/2.png')) throw new Error('ENOENT');
        return 'same';
    });

    const result = await scanner.scan();

    assert.equal(result.totalGroups, 0);
    assert.equal(result.computedHashes, 1);
    assert.deepEqual(result.hashErrors, [{ id: 2, path: '/library/2.png', error: 'ENOENT' }]);
});

test('hashes the same resolved physical file only once', async () => {
    let hashCalls = 0;
    const scanner = new DuplicateScanner(database([
        file(1, 'a', 10),
        file(2, 'a', 10),
    ], async () => '/library/current-a.png'), async () => {
        hashCalls++;
        return 'same';
    });

    const result = await scanner.scan();

    assert.equal(hashCalls, 1);
    assert.equal(result.computedHashes, 1);
    assert.equal(result.totalFiles, 2);
});

test('delete deduplicates IDs and collects failures', async () => {
    const calls: number[] = [];
    const scanner = new DuplicateScanner(database([], undefined, async (id: number) => {
        calls.push(id);
        if (id === 2) throw new Error('locked');
        return id !== 3;
    }));

    const result = await scanner.deleteFiles([1, 1, 2, 3]);

    assert.deepEqual(calls, [1, 2, 3]);
    assert.equal(result.deleted, 1);
    assert.deepEqual(result.errors, ['File 2: locked', 'File 3: delete returned false']);
});
