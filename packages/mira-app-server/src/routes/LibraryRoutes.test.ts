import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { resolveLibraryPath } from './LibraryRoutes';

test('resolveLibraryPath appends the library name when needed', () => {
    const parentPath = path.join('root', 'libraries');

    assert.equal(
        resolveLibraryPath(parentPath, 'photos'),
        path.join(parentPath, 'photos')
    );
});

test('resolveLibraryPath does not append an existing library name', () => {
    const libraryPath = path.join('root', 'libraries', 'photos');

    assert.equal(resolveLibraryPath(libraryPath, 'photos'), libraryPath);
    assert.equal(
        resolveLibraryPath(`${libraryPath}${path.sep}`, 'photos'),
        path.normalize(`${libraryPath}${path.sep}`)
    );
});
