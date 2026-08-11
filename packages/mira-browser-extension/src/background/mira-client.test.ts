import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAuthError } from './mira-client';

describe('isAuthError', () => {
  it('识别 401 错误对象', () => {
    expect(isAuthError({ response: { status: 401 } })).toBe(true);
  });

  it('识别 ErrorResponse 的 AUTH_ERROR', () => {
    expect(isAuthError({ error: 'AUTH_ERROR' })).toBe(true);
  });

  it('识别 token 相关 message', () => {
    expect(isAuthError({ message: 'token expired' })).toBe(true);
    expect(isAuthError({ message: 'unauthorized access' })).toBe(true);
  });

  it('拒绝非认证错误', () => {
    expect(isAuthError({ response: { status: 500 } })).toBe(false);
    expect(isAuthError({ message: 'network timeout' })).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(new Error('boom'))).toBe(false);
  });
});

describe('autoRelogin', () => {
  it('浏览器重启清空 session 后使用持久化凭据重登', async () => {
    vi.resetModules();
    const login = vi.fn().mockResolvedValue({ accessToken: 'fresh-token' });
    const saveSession = vi.fn().mockResolvedValue({});

    vi.doMock('mira-app-core/shared/sdk', () => ({
      MiraClient: class {
        auth() { return { login }; }
      },
    }));
    vi.doMock('@/shared/storage', () => ({
      STORAGE_KEYS: { session: 'mira_session' },
      loadSettings: vi.fn().mockResolvedValue({
        servers: [],
        activeServerId: '',
        serverURL: 'http://localhost:8081',
        username: 'saved-user',
        password: 'saved-pass',
      }),
      loadSession: vi.fn().mockResolvedValue({}),
      saveSession,
    }));

    try {
      const { autoRelogin } = await import('./mira-client');
      await autoRelogin();

      expect(login).toHaveBeenCalledWith('saved-user', 'saved-pass');
      expect(saveSession).toHaveBeenCalledWith({
        token: 'fresh-token',
        username: 'saved-user',
        password: 'saved-pass',
      });
    } finally {
      vi.doUnmock('mira-app-core/shared/sdk');
      vi.doUnmock('@/shared/storage');
    }
  });
});
