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
