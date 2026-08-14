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
});
