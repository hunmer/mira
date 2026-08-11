import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchResource } from './resource-fetch';

describe('fetchResource', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('image')));
    vi.stubGlobal('chrome', {
      runtime: { id: 'mira-extension' },
      cookies: {
        getAll: vi.fn().mockResolvedValue([
          { name: 'session', value: 'abc', domain: '.example.com', path: '/' },
        ]),
      },
      declarativeNetRequest: {
        HeaderOperation: { SET: 'set' },
        RuleActionType: { MODIFY_HEADERS: 'modifyHeaders' },
        ResourceType: { XMLHTTPREQUEST: 'xmlhttprequest' },
        updateSessionRules: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('在请求期间注入来源 Cookie 和 Referer，并在结束后移除规则', async () => {
    await fetchResource('https://cdn.example.com/image.jpg', 'https://www.example.com/page');

    const update = chrome.declarativeNetRequest.updateSessionRules as ReturnType<typeof vi.fn>;
    const rule = update.mock.calls[0][0].addRules[0];
    expect(rule.action.requestHeaders).toEqual([
      { header: 'Cookie', operation: 'set', value: 'session=abc' },
      { header: 'Referer', operation: 'set', value: 'https://www.example.com/page' },
    ]);
    expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/image.jpg', { credentials: 'include' });
    expect(update.mock.calls[1][0]).toEqual({ removeRuleIds: [rule.id] });
  });
});
