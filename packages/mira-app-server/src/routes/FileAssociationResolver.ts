interface AssociationDatabase {
    queryTag(query: Record<string, any>): Promise<Record<string, any>[]>;
    createTag(data: Record<string, any>): Promise<number>;
    findFolderByName(name: string): Promise<Record<string, any> | null>;
    createFolder(data: Record<string, any>): Promise<number>;
}

function integerId(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
    return undefined;
}

function associationName(value: unknown, type: 'tag' | 'folder'): string {
    const name = String(value ?? '').trim();
    if (!name) throw new Error(`${type} name cannot be empty`);
    return name;
}

export async function resolveTagIds(db: AssociationDatabase, tags: unknown[]): Promise<string[]> {
    const ids: string[] = [];
    const resolvedNames = new Map<string, string>();

    for (const tag of tags) {
        const id = integerId(tag);
        if (id !== undefined) {
            ids.push(String(id));
            continue;
        }

        const name = associationName(tag, 'tag');
        const resolved = resolvedNames.get(name);
        if (resolved !== undefined) {
            ids.push(resolved);
            continue;
        }
        const found = await db.queryTag({ title: name });
        const resolvedId = String(found[0]?.id ?? await db.createTag({ title: name }));
        resolvedNames.set(name, resolvedId);
        ids.push(resolvedId);
    }

    return [...new Set(ids)];
}

export async function resolveFolderId(
    db: AssociationDatabase,
    folder: unknown,
): Promise<number | null | undefined> {
    if (folder === undefined) return undefined;
    if (folder === null) return null;

    const id = integerId(folder);
    if (id !== undefined) return id;

    const name = associationName(folder, 'folder');
    const found = await db.findFolderByName(name);
    return found?.id ?? await db.createFolder({ title: name });
}
