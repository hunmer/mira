let nextRuleId = Date.now() % 1_000_000_000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getCookies(url: string, referrer?: string): Promise<chrome.cookies.Cookie[]> {
  const cookies = await chrome.cookies.getAll({ url });
  if (!referrer) return cookies;

  try {
    const partitionKey = { topLevelSite: new URL(referrer).origin };
    const partitioned = await chrome.cookies.getAll({ url, partitionKey } as chrome.cookies.GetAllDetails);
    return [...cookies, ...partitioned].filter((cookie, index, all) =>
      all.findIndex(other =>
        other.name === cookie.name
        && other.value === cookie.value
        && other.domain === cookie.domain
        && other.path === cookie.path,
      ) === index,
    );
  } catch {
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

  if (!requestHeaders.length) return fetch(url, { credentials: 'include' });

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
    return await fetch(url, { credentials: 'include' });
  } finally {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
  }
}
