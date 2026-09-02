import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFolderId, resolveTagIds } from './FileAssociationResolver';

function createDatabase() {
    const createdTags: string[] = [];
    const createdFolders: string[] = [];
    const db = {
        async queryTag({ title }: { title: string }) {
            return title === 'existing-tag' ? [{ id: 7, title }] : [];
        },
        async createTag({ title }: { title: string }) {
            createdTags.push(title);
            return 8;
        },
        async findFolderByName(title: string) {
            return title === 'existing-folder' ? { id: 9, title } : null;
        },
        async createFolder({ title }: { title: string }) {
            createdFolders.push(title);
            return 10;
        },
    };
    return { db, createdTags, createdFolders };
}

test('resolves tag IDs and creates missing tag names', async () => {
    const { db, createdTags } = createDatabase();

    const result = await resolveTagIds(db, [3, '4', 'existing-tag', 'new-tag', 'new-tag']);

    assert.deepEqual(result, ['3', '4', '7', '8']);
    assert.deepEqual(createdTags, ['new-tag']);
});

test('resolves folder IDs and creates missing folder names', async () => {
    const { db, createdFolders } = createDatabase();

    assert.equal(await resolveFolderId(db, 3), 3);
    assert.equal(await resolveFolderId(db, '4'), 4);
    assert.equal(await resolveFolderId(db, 'existing-folder'), 9);
    assert.equal(await resolveFolderId(db, 'new-folder'), 10);
    assert.deepEqual(createdFolders, ['new-folder']);
});

test('preserves omitted and root folder values', async () => {
    const { db } = createDatabase();

    assert.equal(await resolveFolderId(db, undefined), undefined);
    assert.equal(await resolveFolderId(db, null), null);
});

test('treats fractional numbers as association names', async () => {
    const { db, createdTags, createdFolders } = createDatabase();

    await resolveTagIds(db, [1.5]);
    await resolveFolderId(db, 2.5);

    assert.deepEqual(createdTags, ['1.5']);
    assert.deepEqual(createdFolders, ['2.5']);
});
