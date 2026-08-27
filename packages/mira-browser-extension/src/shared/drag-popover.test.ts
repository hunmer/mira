import { describe, expect, it } from 'vitest';
import { isDragPopoverHostAllowed } from './types';

describe('isDragPopoverHostAllowed', () => {
  it('黑名单模式仅禁用列表中的 host', () => {
    expect(isDragPopoverHostAllowed('example.com', 'blacklist', [])).toBe(true);
    expect(isDragPopoverHostAllowed('example.com', 'blacklist', ['EXAMPLE.COM'])).toBe(false);
    expect(isDragPopoverHostAllowed('other.com', 'blacklist', ['example.com'])).toBe(true);
  });

  it('白名单模式仅启用列表中的 host', () => {
    expect(isDragPopoverHostAllowed('example.com', 'whitelist', [])).toBe(false);
    expect(isDragPopoverHostAllowed(' example.com ', 'whitelist', [' EXAMPLE.COM '])).toBe(true);
    expect(isDragPopoverHostAllowed('other.com', 'whitelist', ['example.com'])).toBe(false);
  });
});
