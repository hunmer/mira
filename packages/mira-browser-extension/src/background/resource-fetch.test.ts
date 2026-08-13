import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchResource, fetchResourceWithFallback } from './resource-fetch';

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

  it('Pinterest originals 返回 403 时继续尝试其他尺寸', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response('image', {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }));

    const result = await fetchResourceWithFallback(
      'https://i.pinimg.com/originals/93/c8/a7/image.jpg',
    );

    expect(fetch).toHaveBeenNthCalledWith(1,
      'https://i.pinimg.com/originals/93/c8/a7/image.jpg',
      { credentials: 'include' },
    );
    expect(fetch).toHaveBeenNthCalledWith(2,
      'https://i.pinimg.com/1200x/93/c8/a7/image.jpg',
      { credentials: 'include' },
    );
    expect(result.url).toBe('https://i.pinimg.com/1200x/93/c8/a7/image.jpg');
    expect(result.response.ok).toBe(true);
  });

  it('非 Pinterest URL 不增加额外请求', async () => {
    const result = await fetchResourceWithFallback('https://cdn.example.com/image.jpg');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.url).toBe('https://cdn.example.com/image.jpg');
  });
});
