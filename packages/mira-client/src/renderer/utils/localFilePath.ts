export const renameLocalFilePath = (localFile: string, newName: string): string => {
  const separatorIndex = Math.max(localFile.lastIndexOf('/'), localFile.lastIndexOf('\\'))
  return `${localFile.slice(0, separatorIndex + 1)}${newName}`
}
