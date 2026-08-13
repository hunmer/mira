export interface ImportedFileEventTarget {
  broadcastPluginEvent(eventName: string, data: Record<string, any>): Promise<boolean>;
  broadcastLibraryEvent(libraryId: string, eventName: string, data: Record<string, any>): void;
}

export async function publishImportedFile(
  target: ImportedFileEventTarget | undefined,
  libraryId: string,
  file: Record<string, any>,
): Promise<void> {
  if (!target) return;
  await target.broadcastPluginEvent('file::created', {
    message: { type: 'file', action: 'create' },
    result: file,
    libraryId,
  });
  target.broadcastLibraryEvent(libraryId, 'file::created', { ...file, libraryId });
}
