import { LibraryServerDataSQLite } from 'mira-app-core/storage/sqlite';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';

export interface DuplicateFile {
    id: number;
    name: string;
    title: string;
    path: string;
    size: number;
    hash?: string;
    folder_id: number | null;
    created_at: number;
}

export interface DuplicateGroup {
    key: string;
    title: string;
    size: number;
    hash?: string;
    files: DuplicateFile[];
}

export interface DuplicateScanResult {
    groups: DuplicateGroup[];
    totalGroups: number;
    totalFiles: number;
    candidateGroups: number;
    candidateFiles: number;
    computedHashes: number;
    hashErrors: Array<{ id: number; path: string; error: string }>;
}

export type DuplicateMatchMode = 'name-size' | 'size' | 'name';

type DuplicateDatabase = Pick<LibraryServerDataSQLite, 'getFiles' | 'deleteFile' | 'getItemFilePath'>;

export class DuplicateScanner {
    constructor(
        private readonly dbService: DuplicateDatabase,
        private readonly hashFile: (filePath: string) => Promise<string> = calculateFileMd5,
    ) {}

    async scan(options: { matchMode?: DuplicateMatchMode } = {}): Promise<DuplicateScanResult> {
        const files = await this.fetchAllFiles();
        const candidates = this.findQuickDuplicates(files, options.matchMode || 'name-size');
        const { groups, computedHashes, hashErrors } = await this.confirmByHash(candidates);

        return {
            groups,
            totalGroups: groups.length,
            totalFiles: groups.reduce((sum, group) => sum + group.files.length, 0),
            candidateGroups: candidates.length,
            candidateFiles: candidates.reduce((sum, group) => sum + group.files.length, 0),
            computedHashes,
            hashErrors,
        };
    }

    async deleteFiles(fileIds: number[]): Promise<{ deleted: number; errors: string[] }> {
        const errors: string[] = [];
        let deleted = 0;

        for (const id of [...new Set(fileIds)]) {
            try {
                if (await this.dbService.deleteFile(id)) {
                    deleted++;
                } else {
                    errors.push(`File ${id}: delete returned false`);
                }
            } catch (error) {
                errors.push(`File ${id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return { deleted, errors };
    }

    private async fetchAllFiles(): Promise<DuplicateFile[]> {
        const { result } = await this.dbService.getFiles({
            // getItemFilePath() needs the original file name to resolve the physical path.
            select: 'id, name, name AS title, path, size, hash, folder_id, created_at, recycled',
            filters: { limit: Number.MAX_SAFE_INTEGER },
            countFile: true,
        });
        return result as unknown as DuplicateFile[];
    }

    private findQuickDuplicates(files: DuplicateFile[], matchMode: DuplicateMatchMode): DuplicateGroup[] {
        const filesByKey = new Map<string, DuplicateFile[]>();
        for (const file of files) {
            const key = matchMode === 'size'
                ? String(file.size)
                : matchMode === 'name'
                    ? file.title
                    : `${file.title}|${file.size}`;
            const group = filesByKey.get(key) || [];
            group.push(file);
            filesByKey.set(key, group);
        }

        return [...filesByKey.entries()]
            .filter(([, groupFiles]) => groupFiles.length > 1)
            .map(([key, groupFiles]) => ({
                key,
                title: groupFiles[0].title,
                size: groupFiles[0].size,
                files: groupFiles,
            }))
            .sort((a, b) => b.files.length - a.files.length);
    }

    private async confirmByHash(candidateGroups: DuplicateGroup[]): Promise<{
        groups: DuplicateGroup[];
        computedHashes: number;
        hashErrors: Array<{ id: number; path: string; error: string }>;
    }> {
        const groups: DuplicateGroup[] = [];
        const hashErrors: Array<{ id: number; path: string; error: string }> = [];
        const hashByPath = new Map<string, Promise<string>>();
        let computedHashes = 0;

        for (const candidateGroup of candidateGroups) {
            const filesByHash = new Map<string, DuplicateFile[]>();
            for (const file of candidateGroup.files) {
                let resolvedPath = file.path;
                let hash: string;
                try {
                    resolvedPath = await this.dbService.getItemFilePath(file, { isUrlFile: false });
                    let hashPromise = hashByPath.get(resolvedPath);
                    let startedHash = false;
                    if (!hashPromise) {
                        hashPromise = this.hashFile(resolvedPath);
                        hashByPath.set(resolvedPath, hashPromise);
                        startedHash = true;
                    }
                    hash = await hashPromise;
                    if (startedHash) computedHashes++;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.warn('[DuplicateScanner] Failed to hash candidate', {
                        id: file.id,
                        databasePath: file.path,
                        resolvedPath,
                        error: message,
                    });
                    hashErrors.push({ id: file.id, path: resolvedPath, error: message });
                    continue;
                }
                const hashGroup = filesByHash.get(hash) || [];
                hashGroup.push({ ...file, path: resolvedPath, hash });
                filesByHash.set(hash, hashGroup);
            }
            for (const [hash, hashFiles] of filesByHash) {
                if (hashFiles.length < 2) continue;
                groups.push({
                    key: `${candidateGroup.title}|${candidateGroup.size}|${hash}`,
                    title: candidateGroup.title,
                    size: candidateGroup.size,
                    hash,
                    files: hashFiles,
                });
            }
        }
        return { groups: groups.sort((a, b) => b.files.length - a.files.length), computedHashes, hashErrors };
    }

}

function calculateFileMd5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = createHash('md5');
        const stream = createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}
