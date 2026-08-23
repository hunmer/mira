#!/usr/bin/env node
/**
 * 从 https://models.dev/api.json 拉取服务商/模型目录，
 * 精简后保存为插件根目录 presets.json，供「新建服务商」时选择预设。
 *
 * 用法:
 *   npm run fetch-presets                      # 在线拉取（可设 HTTPS_PROXY，需安装 undici）
 *   npm run fetch-presets -- --input a.json    # 转换已下载的 api.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CATALOG_URL = 'https://models.dev/api.json';
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = join(pluginRoot, 'presets.json');
const inputArg = process.argv.indexOf('--input');

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return '';
  const raw = value.trim();
  const withScheme = raw.includes('://') ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

async function main() {
  let raw;
  if (inputArg > 0 && process.argv[inputArg + 1]) {
    raw = JSON.parse(await readFile(process.argv[inputArg + 1], 'utf8'));
  } else {
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    let dispatcher;
    if (proxy) {
      try {
        const { ProxyAgent } = await import('undici');
        dispatcher = new ProxyAgent(proxy);
      } catch {
        console.warn('已设置 HTTPS_PROXY 但未安装 undici，将尝试直连（npm i -D undici 可启用代理）');
      }
    }
    const response = await fetch(CATALOG_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(60000),
      ...(dispatcher ? { dispatcher } : {}),
    });
    if (!response.ok) throw new Error(`拉取目录失败: ${response.status} ${response.statusText}`);
    raw = await response.json();
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('目录数据格式无效');

  const providers = [];
  for (const [providerId, provider] of Object.entries(raw)) {
    const baseUrl = normalizeBaseUrl(provider.api);
    if (!baseUrl) continue;
    const models = Object.entries(provider.models || {})
      .map(([modelKey, model]) => ({
        id: String(model?.id ?? modelKey),
        name: String(model?.name ?? model?.id ?? modelKey),
      }))
      .filter(model => model.id);
    providers.push({
      id: String(provider.id ?? providerId),
      name: String(provider.name ?? providerId),
      baseUrl,
      sdk: typeof provider.npm === 'string' ? provider.npm : '',
      modelCount: models.length,
      models,
    });
  }
  providers.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    source: CATALOG_URL,
    updatedAt: new Date().toISOString(),
    providers,
  };
  await writeFile(outputFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`已保存 ${providers.length} 个服务商 / ${providers.reduce((sum, item) => sum + item.modelCount, 0)} 个模型到 ${outputFile}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
