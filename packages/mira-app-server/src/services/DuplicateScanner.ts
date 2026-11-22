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

/** 候选文件哈希解析的阶段结果（枚举驱动，替代原内嵌的缓存命中/新发起/失败三态嵌套）。 */
enum HashStage {
    /** 本文件首次见到该物理路径：发起了哈希计算并成功完成。 */
    Computed = 'computed',
    /** 命中同路径缓存：复用了已完成的哈希结果。 */
    Reused = 'reused',
    /** 路径解析或哈希计算失败。 */
    Failed = 'failed',
}

/** 单个候选文件的哈希解析结果。 */
type HashOutcome =
    | { stage: HashStage.Computed | HashStage.Reused; hash: string; resolvedPath: string }
    | { stage: HashStage.Failed; resolvedPath: string; error: string };

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
            filters: { limit: Number.MAX_SAFE_INTEGER, recycled: false },
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

    /** 解析单个候选文件的物理路径并计算/复用哈希（同路径 promise 缓存去重）。 */
    private async resolveFileHash(
        file: DuplicateFile,
        hashByPath: Map<string, Promise<string>>,
    ): Promise<HashOutcome> {
        let resolvedPath = file.path;
        try {
            resolvedPath = await this.dbService.getItemFilePath(file, { isUrlFile: false });
            let hashPromise = hashByPath.get(resolvedPath);
            let startedHash = false;
            if (!hashPromise) {
                hashPromise = this.hashFile(resolvedPath);
                hashByPath.set(resolvedPath, hashPromise);
                startedHash = true;
            }
            const hash = await hashPromise;
            return { stage: startedHash ? HashStage.Computed : HashStage.Reused, hash, resolvedPath };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { stage: HashStage.Failed, resolvedPath, error: message };
        }
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
                const outcome = await this.resolveFileHash(file, hashByPath);
                switch (outcome.stage) {
                    case HashStage.Failed:
                        console.warn('[DuplicateScanner] Failed to hash candidate', {
                            id: file.id,
                            databasePath: file.path,
                            resolvedPath: outcome.resolvedPath,
                            error: outcome.error,
                        });
                        hashErrors.push({ id: file.id, path: outcome.resolvedPath, error: outcome.error });
                        continue;
                    case HashStage.Computed:
                        computedHashes++;
                        break;
                    case HashStage.Reused:
                        break;
                }
                const hashGroup = filesByHash.get(outcome.hash) || [];
                hashGroup.push({ ...file, path: outcome.resolvedPath, hash: outcome.hash });
                filesByHash.set(outcome.hash, hashGroup);
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
