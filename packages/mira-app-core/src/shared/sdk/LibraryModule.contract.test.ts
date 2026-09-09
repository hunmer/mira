import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from './client/HttpClient';
import { LibraryModule } from './modules/LibraryModule';

describe('LibraryModule contract', () => {
    it('sets library status through PATCH and returns the unwrapped response', async () => {
        const response = { message: 'Library deactivated successfully', status: 'inactive' as const };
        const http = { patch: vi.fn().mockResolvedValue(response) };
        const module = new LibraryModule(http as unknown as HttpClient);

        await expect(module.setStatus('library-1', 'inactive')).resolves.toEqual(response);
        expect(http.patch).toHaveBeenCalledWith('/api/libraries/library-1/status', { status: 'inactive' });
    });

    it('starts and polls a library relocation through the library routes', async () => {
        const started = { relocationId: 'relocation-1' };
        const progress = { id: 'relocation-1', status: 'moving' };
        const http = {
            post: vi.fn().mockResolvedValue(started),
            get: vi.fn().mockResolvedValue(progress),
        };
        const module = new LibraryModule(http as unknown as HttpClient);

        await expect(module.relocate('library/1', 'D:/new')).resolves.toEqual(started);
        expect(http.post).toHaveBeenCalledWith('/api/libraries/library%2F1/relocate', { destinationPath: 'D:/new' });
        await expect(module.getRelocationProgress('library/1', 'task/1')).resolves.toEqual(progress);
        expect(http.get).toHaveBeenCalledWith('/api/libraries/library%2F1/relocate/task%2F1');
    });
});
