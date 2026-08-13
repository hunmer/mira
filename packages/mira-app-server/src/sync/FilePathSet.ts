import * as path from 'path';

/** 文件路径比较键：统一绝对路径、分隔符，并兼容 Windows 大小写不敏感。 */
export function canonicalFilePath(filePath: string): string {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function createFilePathSet(filePaths: Iterable<string>): Set<string> {
  return new Set(Array.from(filePaths, canonicalFilePath));
}
