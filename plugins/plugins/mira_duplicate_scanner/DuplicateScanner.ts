export interface DuplicateGroup {
    key: string;
    title: string;
    size: number;
    hash?: string;
    files: DuplicateFile[];
}

export interface DuplicateFile {
    id: number;
    title: string;
    path: string;
    size: number;
    extension: string;
    mime_type: string;
    hash?: string;
    thumbnail_path?: string;
    folder_id: number | null;
    created_at: string;
}

export interface ScanResult {
    groups: DuplicateGroup[];
    totalGroups: number;
    totalFiles: number;
    mode: 'quick' | 'precise';
}

export class DuplicateScanner {
    constructor(private dbService: any) {}

    async scan(mode: 'quick' | 'precise' = 'quick'): Promise<ScanResult> {
        const allFiles = await this.fetchAllFiles();
        let groups: DuplicateGroup[];

        if (mode === 'precise') {
            groups = this.findPreciseDuplicates(allFiles);
        } else {
            groups = this.findQuickDuplicates(allFiles);
        }

        const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);
        return { groups, totalGroups: groups.length, totalFiles, mode };
    }

    private async fetchAllFiles(): Promise<DuplicateFile[]> {
        const { result } = await this.dbService.getFiles({
            select: 'id, title, path, size, extension, mime_type, hash, thumbnail_path, folder_id, created_at',
        });
        return result as DuplicateFile[];
    }

    private findQuickDuplicates(files: DuplicateFile[]): DuplicateGroup[] {
        const map = new Map<string, DuplicateFile[]>();

        for (const file of files) {
            const key = `${file.title}|${file.size}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(file);
        }

        const groups: DuplicateGroup[] = [];
        for (const [key, groupFiles] of map) {
            if (groupFiles.length > 1) {
                groups.push({
                    key,
                    title: groupFiles[0].title,
                    size: groupFiles[0].size,
                    files: groupFiles,
                });
            }
        }

        return groups.sort((a, b) => b.files.length - a.files.length);
    }

    private findPreciseDuplicates(files: DuplicateFile[]): DuplicateGroup[] {
        const quickGroups = this.findQuickDuplicates(files);
        const preciseGroups: DuplicateGroup[] = [];

        for (const group of quickGroups) {
            const hashMap = new Map<string, DuplicateFile[]>();

            for (const file of group.files) {
                const hash = file.hash || '';
                if (!hash) continue;
                if (!hashMap.has(hash)) {
                    hashMap.set(hash, []);
                }
                hashMap.get(hash)!.push(file);
            }

            for (const [hash, hashFiles] of hashMap) {
                if (hashFiles.length > 1) {
                    preciseGroups.push({
                        key: `${group.title}|${group.size}|${hash}`,
                        title: group.title,
                        size: group.size,
                        hash,
                        files: hashFiles,
                    });
                }
            }
        }

        return preciseGroups.sort((a, b) => b.files.length - a.files.length);
    }

    async deleteFiles(fileIds: number[]): Promise<{ deleted: number; errors: string[] }> {
        const errors: string[] = [];
        let deleted = 0;

        for (const id of fileIds) {
            try {
                const success = await this.dbService.deleteFile(id);
                if (success) {
                    deleted++;
                } else {
                    errors.push(`File ${id}: delete returned false`);
                }
            } catch (err) {
                errors.push(`File ${id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        return { deleted, errors };
    }
}
