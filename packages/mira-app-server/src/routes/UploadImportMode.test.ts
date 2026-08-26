import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveUploadImport } from './UploadImportMode';

test('copies browser uploads instead of linking the temporary upload file', () => {
    const decision = resolveUploadImport('data/temp/upload.jpg', undefined, 'link');

    assert.deepEqual(decision, {
        sourceFilePath: 'data/temp/upload.jpg',
        importType: 'copy',
        usesOriginalSource: false,
    });
});

test('copies uploads when the supplied source path is not accessible to the server', () => {
    const decision = resolveUploadImport(
        'data/temp/upload.jpg',
        'C:/client-only/source.jpg',
        'move',
        () => false,
    );

    assert.equal(decision.sourceFilePath, 'data/temp/upload.jpg');
    assert.equal(decision.importType, 'copy');
    assert.equal(decision.usesOriginalSource, false);
});

test('honours link mode for an accessible local source path', () => {
    const decision = resolveUploadImport(
        'data/temp/upload.jpg',
        'D:/pictures/source.jpg',
        'link',
        () => true,
    );

    assert.equal(decision.sourceFilePath, 'D:/pictures/source.jpg');
    assert.equal(decision.importType, 'link');
    assert.equal(decision.usesOriginalSource, true);
});
