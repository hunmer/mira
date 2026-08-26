import * as fs from 'fs';

export type FileImportType = 'copy' | 'move' | 'link';

export interface UploadImportDecision {
    sourceFilePath: string;
    importType: FileImportType;
    usesOriginalSource: boolean;
}

export function resolveUploadImport(
    uploadedFilePath: string,
    sourcePath: unknown,
    configuredImportType: unknown,
    fileExists: (filePath: string) => boolean = fs.existsSync,
): UploadImportDecision {
    const usesOriginalSource = typeof sourcePath === 'string'
        && sourcePath.length > 0
        && fileExists(sourcePath);
    const validImportType = typeof configuredImportType === 'string'
        && ['copy', 'move', 'link'].includes(configuredImportType)
        ? configuredImportType as FileImportType
        : 'copy';

    return {
        sourceFilePath: usesOriginalSource ? sourcePath : uploadedFilePath,
        // Remote uploads only have a temporary server-side file, so they must be copied.
        importType: usesOriginalSource ? validImportType : 'copy',
        usesOriginalSource,
    };
}
