import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { resolveLibraryPath } from './LibraryRoutes';

test('resolveLibraryPath appends the library name to the parent path', () => {
    const parentPath = path.join('root', 'libraries');

    assert.equal(
        resolveLibraryPath(parentPath, 'photos'),
        path.join(parentPath, 'photos')
    );
});

test('resolveLibraryPath always appends the library name', () => {
    const libraryPath = path.join('root', 'libraries', 'photos');

    // 目录名与库名相同也仍然拼接：素材库目录 = 路径 + 名称
    assert.equal(resolveLibraryPath(libraryPath, 'photos'), path.join(libraryPath, 'photos'));
    assert.equal(
        resolveLibraryPath(`${libraryPath}${path.sep}`, 'photos'),
        path.join(path.normalize(libraryPath), 'photos')
    );
});
