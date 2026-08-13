import { dbg } from '@/shared/debug';
import { fallbackImageCandidates } from '@/shared/imu';

let nextRuleId = Date.now() % 1_000_000_000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getCookies(url: string, referrer?: string): Promise<chrome.cookies.Cookie[]> {
  const cookies = await chrome.cookies.getAll({ url });
  if (!referrer) {
    dbg.log('download', 'auth', { url, cookieCount: cookies.length });
    return cookies;
  }

  try {
    const partitionKey = { topLevelSite: new URL(referrer).origin };
    const partitioned = await chrome.cookies.getAll({ url, partitionKey } as chrome.cookies.GetAllDetails);
    const allCookies = [...cookies, ...partitioned].filter((cookie, index, all) =>
      all.findIndex(other =>
        other.name === cookie.name
        && other.value === cookie.value
        && other.domain === cookie.domain
        && other.path === cookie.path,
      ) === index,
    );
    dbg.log('download', 'auth', {
      url,
      cookieCount: allCookies.length,
      partitionedCount: partitioned.length,
    });
    return allCookies;
  } catch (error) {
    dbg.log('download', 'partitioned cookies unavailable, use regular cookies', { url, referrer, error });
    return cookies;
  }
}

/** 使用来源站点 Cookie/Referer 抓取资源，并在完成后立即移除临时请求规则。 */
export async function fetchResource(url: string, referrer?: string): Promise<Response> {
  const cookies = await getCookies(url, referrer);
  const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [];
  if (cookies.length) {
    cookies.sort((a, b) => b.path.length - a.path.length);
    requestHeaders.push({
      header: 'Cookie',
      operation: chrome.declarativeNetRequest.HeaderOperation.SET,
      value: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '),
    });
  }
  if (referrer) {
    requestHeaders.push({
      header: 'Referer',
      operation: chrome.declarativeNetRequest.HeaderOperation.SET,
      value: referrer,
    });
  }

  if (!requestHeaders.length) {
    const response = await fetch(url, { credentials: 'include' });
    dbg.log('download', 'response', { url, status: response.status });
    return response;
  }

  const ruleId = ++nextRuleId;
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [{
      id: ruleId,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders,
      },
      condition: {
        regexFilter: `^${escapeRegex(url)}$`,
        initiatorDomains: [chrome.runtime.id],
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
      },
    }],
  });
  try {
    const response = await fetch(url, { credentials: 'include' });
    dbg.log('download', 'response', {
      url,
      status: response.status,
      type: response.headers.get('content-type'),
      bytes: response.headers.get('content-length'),
    });
    return response;
  } catch (error) {
    dbg.error('download', 'resource fetch failed', { url, error });
    throw error;
  } finally {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
  }
}

/** 按图片 URL 候选顺序抓取；Pinterest originals 不可用时继续尝试其他尺寸。 */
export async function fetchResourceWithFallback(
  url: string,
  referrer?: string,
): Promise<{ response: Response; url: string }> {
  const candidates = fallbackImageCandidates(url);
  let lastResponse: Response | undefined;

  for (const [index, candidate] of candidates.entries()) {
    try {
      const response = await fetchResource(candidate, referrer);
      if (response.ok) return { response, url: candidate };
      lastResponse = response;
      if (index < candidates.length - 1) {
        dbg.warn('download', 'candidate fetch failed, try next size', {
          url: candidate,
          status: response.status,
        });
      }
    } catch (error) {
      if (index === candidates.length - 1) throw error;
      dbg.warn('download', 'candidate fetch failed, try next size', { url: candidate, error });
    }
  }

  return { response: lastResponse!, url: candidates[candidates.length - 1] };
}
