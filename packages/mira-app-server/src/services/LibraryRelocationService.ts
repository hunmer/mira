import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { MiraServer } from '..';

export interface LibraryRelocationProgress {
    id: string;
    libraryId: string;
    sourcePath: string;
    destinationPath: string;
    status: 'preparing' | 'moving' | 'completed' | 'error';
    totalFiles: number;
    movedFiles: number;
    totalBytes: number;
    movedBytes: number;
    current: string;
    error?: string;
    startedAt: number;
    finishedAt?: number;
}

interface FileEntry {
    source: string;
    relative: string;
    size: number;
}

interface DirectoryEntries {
    files: FileEntry[];
    directories: string[];
}

function isNestedPath(parent: string, candidate: string): boolean {
    const relative = path.relative(parent, candidate);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function comparablePath(value: string): string {
    return process.platform === 'win32' ? value.toLowerCase() : value;
}

async function collectEntries(
    root: string,
    current = root,
    result: DirectoryEntries = { files: [], directories: [] },
): Promise<DirectoryEntries> {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
        const source = path.join(current, entry.name);
        if (entry.isDirectory()) {
            result.directories.push(path.relative(root, source));
            await collectEntries(root, source, result);
        } else if (entry.isFile()) {
            const stat = await fs.promises.stat(source);
            result.files.push({ source, relative: path.relative(root, source), size: stat.size });
        } else {
            throw new Error(`Unsupported filesystem entry: ${source}`);
        }
    }
    return result;
}

export async function copyLibraryDirectory(
    sourcePath: string,
    destinationPath: string,
    onProgress: (progress: { totalFiles: number; movedFiles: number; totalBytes: number; movedBytes: number; current: string }) => void,
): Promise<void> {
    const source = path.resolve(sourcePath);
    const destination = path.resolve(destinationPath);
    if (comparablePath(source) === comparablePath(destination)) {
        throw new Error('Source and destination paths are the same');
    }
    if (isNestedPath(source, destination) || isNestedPath(destination, source)) {
        throw new Error('Source and destination paths cannot contain each other');
    }

    const sourceStat = await fs.promises.stat(source).catch(() => null);
    if (!sourceStat?.isDirectory()) throw new Error('Source library path does not exist');

    const destinationStat = await fs.promises.stat(destination).catch(() => null);
    if (destinationStat && !destinationStat.isDirectory()) {
        throw new Error('Destination path is not a directory');
    }
    if (destinationStat && (await fs.promises.readdir(destination)).length > 0) {
        throw new Error('Destination directory must be empty');
    }

    const { files, directories } = await collectEntries(source);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    let movedFiles = 0;
    let movedBytes = 0;
    onProgress({ totalFiles: files.length, movedFiles, totalBytes, movedBytes, current: '' });

    try {
        await fs.promises.mkdir(destination, { recursive: true });
        await Promise.all(directories.map(directory => fs.promises.mkdir(path.join(destination, directory), { recursive: true })));
        for (const file of files) {
            const target = path.join(destination, file.relative);
            await fs.promises.mkdir(path.dirname(target), { recursive: true });
            await pipeline(
                fs.createReadStream(file.source),
                new Transform({
                    transform(chunk, _encoding, callback) {
                        movedBytes += chunk.length;
                        onProgress({ totalFiles: files.length, movedFiles, totalBytes, movedBytes, current: file.relative });
                        callback(null, chunk);
                    },
                }),
                fs.createWriteStream(target, { flags: 'wx' }),
            );
            movedFiles += 1;
            onProgress({ totalFiles: files.length, movedFiles, totalBytes, movedBytes, current: file.relative });
        }
    } catch (error) {
        await fs.promises.rm(destination, { recursive: true, force: true }).catch(() => undefined);
        throw error;
    }
}

export class LibraryRelocationService {
    private tasks = new Map<string, LibraryRelocationProgress>();
    private activeLibraries = new Set<string>();

    constructor(private backend: MiraServer) { }

    getProgress(id: string): LibraryRelocationProgress | undefined {
        return this.tasks.get(id);
    }

    async start(libraryId: string, destinationPath: string): Promise<{ relocationId: string }> {
        if (this.activeLibraries.has(libraryId)) throw new Error('Library relocation is already running');
        const config = this.backend.libraries!.getLibraryConfig(libraryId);
        if (!config) throw new Error('Library not found');

        const configuredPath = config.path || config.customFields?.path;
        if (!configuredPath) throw new Error('Library path is not configured');
        const sourcePath = path.resolve(configuredPath);
        const destination = path.resolve(destinationPath);
        const id = randomUUID();
        const progress: LibraryRelocationProgress = {
            id,
            libraryId,
            sourcePath,
            destinationPath: destination,
            status: 'preparing',
            totalFiles: 0,
            movedFiles: 0,
            totalBytes: 0,
            movedBytes: 0,
            current: '',
            startedAt: Date.now(),
        };
        this.tasks.set(id, progress);
        this.activeLibraries.add(libraryId);
        void this.run(progress, config);
        return { relocationId: id };
    }

    private async run(progress: LibraryRelocationProgress, currentConfig: Record<string, any>): Promise<void> {
        const libraryObj = this.backend.libraries!.getLibrary(progress.libraryId)!;
        const wasActive = this.backend.libraries!.isLibraryActive(progress.libraryId);
        let destinationCommitted = false;
        try {
            if (wasActive && !await this.backend.libraries!.disableLibrary(progress.libraryId)) {
                throw new Error('Failed to stop library before relocation');
            }

            progress.status = 'moving';
            await copyLibraryDirectory(progress.sourcePath, progress.destinationPath, update => Object.assign(progress, update));

            const updatedConfig = {
                ...currentConfig,
                path: progress.destinationPath,
                customFields: { ...currentConfig.customFields, path: progress.destinationPath },
                status: wasActive ? 'active' : 'inactive',
                updatedAt: new Date().toISOString(),
            };
            libraryObj.savedConfig = updatedConfig;
            await this.persistConfig(progress.libraryId, updatedConfig);
            destinationCommitted = true;
            await fs.promises.rm(progress.sourcePath, { recursive: true, force: false });

            if (wasActive && !await this.backend.libraries!.enableLibrary(progress.libraryId)) {
                throw new Error('Files moved, but the library could not be restarted');
            }
            progress.status = 'completed';
        } catch (error: any) {
            progress.status = 'error';
            progress.error = error?.message || String(error);
            if (destinationCommitted) {
                const destinationConfig = {
                    ...currentConfig,
                    path: progress.destinationPath,
                    customFields: { ...currentConfig.customFields, path: progress.destinationPath },
                    status: 'inactive',
                };
                libraryObj.savedConfig = destinationConfig;
                await this.persistConfig(progress.libraryId, destinationConfig).catch(() => undefined);
            } else {
                await fs.promises.rm(progress.destinationPath, { recursive: true, force: true }).catch(() => undefined);
                libraryObj.savedConfig = { ...currentConfig, status: wasActive ? 'active' : 'inactive' };
                await this.persistConfig(progress.libraryId, libraryObj.savedConfig).catch(() => undefined);
                if (wasActive) await this.backend.libraries!.enableLibrary(progress.libraryId).catch(() => false);
            }
        } finally {
            progress.finishedAt = Date.now();
            this.activeLibraries.delete(progress.libraryId);
        }
    }

    private async persistConfig(libraryId: string, updatedConfig: Record<string, any>): Promise<void> {
        const librarysPath = path.join(this.backend.dataPath, 'librarys.json');
        const libraries = JSON.parse(await fs.promises.readFile(librarysPath, 'utf8'));
        const index = libraries.findIndex((library: any) => library.id === libraryId);
        if (index < 0) throw new Error('Library configuration not found');
        libraries[index] = updatedConfig;
        await fs.promises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');
    }
}
