import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { generateText, streamText, generateImage } from 'ai';
import type { DataContent } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  createdAt: number;
  updatedAt: number;
}

interface StoreData {
  providers: ProviderConfig[];
  defaultProviderId: string | null;
}

interface PresetModel {
  id: string;
  name: string;
}

interface PresetProvider {
  id: string;
  name: string;
  baseUrl: string;
  sdk: string;
  modelCount: number;
  models: PresetModel[];
}

interface PresetFile {
  source: string;
  updatedAt: string;
  providers: PresetProvider[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const PLUGIN_NAME = 'mira_ai_sdk';
const TEST_TIMEOUT_MS = 30000;
const IMAGE_TIMEOUT_MS = 300000;
const IMAGE_DIR_NAME = path.join('data', 'images');
const VALID_ROLES = new Set(['system', 'user', 'assistant']);

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 3) + '••••••••' + key.slice(-3);
}

function parseModels(value: unknown): string[] {
  const list = Array.isArray(value)
    ? value.map(item => String(item || '').trim())
    : String(value || '').split(/[\n,]/).map(item => item.trim());
  return Array.from(new Set(list.filter(Boolean)));
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || !value.length) throw new Error('messages 必须是非空数组');
  return value.map((item: any) => {
    const role = String(item?.role || '');
    if (!VALID_ROLES.has(role)) throw new Error(`不支持的消息角色: ${role || '(空)'}`);
    const content = String(item?.content ?? '');
    return { role, content } as ChatMessage;
  });
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function imageExtensionOf(mediaType: string): string {
  return IMAGE_EXTENSIONS[String(mediaType || '').toLowerCase()] || 'png';
}

function slugifyPrompt(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

// 剥离 data URL 前缀，AI SDK 的 DataContent 需要纯 base64
function toBase64Content(value: unknown): string {
  return String(value || '').replace(/^data:[^;]*;base64,/, '');
}

/** 将不同 OpenAI 兼容服务商的图片响应归一化为 AI SDK 所需的 b64_json。 */
function imageResponseFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  return fetch(input, init).then(async response => {
    const contentType = response.headers.get('content-type') || '';
    const url = typeof input === 'string' ? input : input.toString();
    if (!url.includes('/images/') || !contentType.toLowerCase().includes('json')) return response;

    const text = await response.text();
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      // Some gateways prepend markdown/log text to an otherwise valid JSON body.
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start) return new Response(text, response);
      try { payload = JSON.parse(text.slice(start, end + 1)); } catch { return new Response(text, response); }
    }
    if (!Array.isArray(payload?.data)) return new Response(text, response);

    const data = await Promise.all(payload.data.map(async (item: any) => {
      if (typeof item?.b64_json === 'string') return item;
      const inline = item?.base64 || item?.base64_json || item?.b64;
      if (typeof inline === 'string') return { ...item, b64_json: toBase64Content(inline) };
      if (typeof item?.url === 'string') {
        const image = await fetch(item.url);
        if (!image.ok) throw new Error(`下载生成图片失败 HTTP ${image.status}`);
        const bytes = new Uint8Array(await image.arrayBuffer());
        const mediaType = image.headers.get('content-type') || 'image/png';
        return { ...item, b64_json: Buffer.from(bytes).toString('base64'), mediaType };
      }
      return item;
    }));
    const headers = new Headers(response.headers);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify({ ...payload, data }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}

class MiraAiSdkPlugin {
  private readonly pluginName = PLUGIN_NAME;
  private readonly routes: any[] = [];
  private readonly backend: any;
  private readonly libraryId: string;
  private readonly dataFile: string;
  private readonly pluginDir: string;
  private store: StoreData = { providers: [], defaultProviderId: null };
  private presetsCache: PresetFile | null = null;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.backend = pluginManager.server.backend;
    this.libraryId = inst.dbService.getLibraryId();
    this.pluginDir = pluginManager.getPluginDir(this.pluginName);
    this.dataFile = path.join(this.pluginDir, 'data', 'providers.json');
    this.loadStore();
    this.registerApiRoutes();
    this.routes.push({
      name: 'AiSdkManager',
      group: '工具',
      path: '/tools/ai-sdk',
      component: 'components/AiSdkManager.js',
      pluginName: this.pluginName,
      meta: { title: 'AI 服务商', roles: ['super', 'admin', 'user'] },
    });
  }

  getRoutes() {
    return [...this.routes];
  }

  private loadStore() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      this.store = {
        providers: Array.isArray(raw.providers) ? raw.providers : [],
        defaultProviderId: raw.defaultProviderId ?? null,
      };
    } catch {
      this.store = { providers: [], defaultProviderId: null };
    }
  }

  private saveStore() {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    fs.writeFileSync(this.dataFile, JSON.stringify(this.store, null, 2));
  }

  private findProvider(id: unknown): ProviderConfig {
    const provider = this.store.providers.find(item => item.id === String(id || ''));
    if (!provider) throw new Error('服务商不存在');
    return provider;
  }

  private resolveProvider(id: unknown): ProviderConfig {
    if (id) return this.findProvider(id);
    if (this.store.defaultProviderId) return this.findProvider(this.store.defaultProviderId);
    throw new Error('未指定服务商，且没有设置默认服务商');
  }

  private buildModel(provider: ProviderConfig, modelId: unknown) {
    const model = String(modelId || '').trim() || provider.models[0];
    if (!model) throw new Error(`服务商 ${provider.name} 没有配置模型`);
    const openaiCompatible = createOpenAICompatible({
      name: provider.name,
      apiKey: provider.apiKey || undefined,
      baseURL: provider.baseUrl,
    });
    return openaiCompatible(model);
  }

  private buildImageModel(provider: ProviderConfig, modelId: unknown) {
    const model = String(modelId || '').trim() || provider.models[0];
    if (!model) throw new Error(`服务商 ${provider.name} 没有配置模型`);
    const openaiCompatible = createOpenAICompatible({
      name: provider.name,
      apiKey: provider.apiKey || undefined,
      baseURL: provider.baseUrl,
      fetch: imageResponseFetch,
    });
    return openaiCompatible.imageModel(model);
  }

  private maskedProviders() {
    return this.store.providers.map(item => ({
      id: item.id,
      name: item.name,
      baseUrl: item.baseUrl,
      apiKeyMasked: maskApiKey(item.apiKey),
      hasApiKey: Boolean(item.apiKey),
      models: item.models,
      isDefault: item.id === this.store.defaultProviderId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  private loadPresets(): PresetFile | null {
    if (this.presetsCache) return this.presetsCache;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(this.pluginDir, 'presets.json'), 'utf8'));
      this.presetsCache = {
        source: String(raw.source || 'https://models.dev/api.json'),
        updatedAt: String(raw.updatedAt || ''),
        providers: Array.isArray(raw.providers) ? raw.providers : [],
      };
    } catch {
      this.presetsCache = null;
    }
    return this.presetsCache;
  }

  private registerApiRoutes() {
    const router = this.backend.getHttpServer().httpRouter;
    const libraryId = this.libraryId;

    router.registerRounter(libraryId, '/ai-sdk/presets/list', 'get', async (_req: any, res: any) => {
      const presets = this.loadPresets();
      res.json({
        success: true,
        updatedAt: presets?.updatedAt || '',
        source: presets?.source || '',
        providers: (presets?.providers || []).map(item => ({
          id: item.id,
          name: item.name,
          baseUrl: item.baseUrl,
          sdk: item.sdk,
          modelCount: item.modelCount,
        })),
      });
    });

    router.registerRounter(libraryId, '/ai-sdk/presets/models', 'post', async (req: any, res: any) => {
      try {
        const presets = this.loadPresets();
        const preset = presets?.providers.find(item => item.id === String(req.body?.id || ''));
        if (!preset) throw new Error('预设服务商不存在');
        res.json({ success: true, models: preset.models });
      } catch (error) {
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(libraryId, '/ai-sdk/presets/refresh', 'post', async (_req: any, res: any) => {
      execFile(
        process.execPath,
        [path.join(this.pluginDir, 'scripts', 'fetch-presets.mjs')],
        { timeout: 120000, cwd: this.pluginDir },
        (error, _stdout, stderr) => {
          if (error) {
            return res.status(502).json({
              success: false,
              error: `刷新预设失败（服务器可能无法直连 models.dev，可设置 HTTPS_PROXY 后重试）: ${stderr || error.message}`,
            });
          }
          this.presetsCache = null;
          const presets = this.loadPresets();
          res.json({ success: true, updatedAt: presets?.updatedAt || '', providers: presets?.providers.length || 0 });
        },
      );
    });

    // 注意: HttpRouter 同一 path 只支持一种 method，各操作使用独立路径
    router.registerRounter(libraryId, '/ai-sdk/providers/list', 'get', async (_req: any, res: any) => {
      res.json({ success: true, providers: this.maskedProviders(), defaultProviderId: this.store.defaultProviderId });
    });

    router.registerRounter(libraryId, '/ai-sdk/providers/create', 'post', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        const name = String(body.name || '').trim();
        const baseUrl = String(body.baseUrl || '').trim().replace(/\/+$/, '');
        if (!name) throw new Error('名称不能为空');
        if (!/^https?:\/\//i.test(baseUrl)) throw new Error('Base URL 必须以 http:// 或 https:// 开头');
        const models = parseModels(body.models);
        if (!models.length) throw new Error('至少配置一个模型');
        const provider: ProviderConfig = {
          id: newId(),
          name,
          baseUrl,
          apiKey: String(body.apiKey || '').trim(),
          models,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.store.providers.push(provider);
        if (!this.store.defaultProviderId || body.setDefault) this.store.defaultProviderId = provider.id;
        this.saveStore();
        res.json({ success: true, id: provider.id });
      } catch (error) {
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(libraryId, '/ai-sdk/providers/update', 'post', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        const provider = this.findProvider(body.id);
        if (body.name !== undefined) {
          const name = String(body.name || '').trim();
          if (!name) throw new Error('名称不能为空');
          provider.name = name;
        }
        if (body.baseUrl !== undefined) {
          const baseUrl = String(body.baseUrl || '').trim().replace(/\/+$/, '');
          if (!/^https?:\/\//i.test(baseUrl)) throw new Error('Base URL 必须以 http:// 或 https:// 开头');
          provider.baseUrl = baseUrl;
        }
        // apiKey 留空或提交的是掩码时保留原值
        if (body.apiKey !== undefined) {
          const apiKey = String(body.apiKey || '').trim();
          if (apiKey && apiKey !== maskApiKey(provider.apiKey)) provider.apiKey = apiKey;
        }
        if (body.models !== undefined) {
          const models = parseModels(body.models);
          if (!models.length) throw new Error('至少配置一个模型');
          provider.models = models;
        }
        provider.updatedAt = Date.now();
        this.saveStore();
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(libraryId, '/ai-sdk/providers/delete', 'post', async (req: any, res: any) => {
      try {
        const provider = this.findProvider(req.body?.id);
        this.store.providers = this.store.providers.filter(item => item.id !== provider.id);
        if (this.store.defaultProviderId === provider.id) {
          this.store.defaultProviderId = this.store.providers[0]?.id ?? null;
        }
        this.saveStore();
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(libraryId, '/ai-sdk/providers/default', 'post', async (req: any, res: any) => {
      try {
        const provider = this.findProvider(req.body?.id);
        this.store.defaultProviderId = provider.id;
        this.saveStore();
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(libraryId, '/ai-sdk/providers/test', 'post', async (req: any, res: any) => {
      try {
        const provider = this.findProvider(req.body?.id);
        const model = this.buildModel(provider, req.body?.model);
        const startedAt = Date.now();
        const result = await generateText({
          model,
          prompt: 'Reply with exactly: ok',
          maxOutputTokens: 512,
          abortSignal: AbortSignal.timeout(TEST_TIMEOUT_MS),
        });
        res.json({
          success: true,
          model: String(req.body?.model || '').trim() || provider.models[0],
          latencyMs: Date.now() - startedAt,
          reply: result.text.trim(),
          usage: result.usage,
        });
      } catch (error) {
        res.status(502).json({ success: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(libraryId, '/ai-sdk/chat', 'post', async (req: any, res: any) => {
      let stream = false;
      try {
        const body = req.body || {};
        stream = body.stream === true;
        const messages = normalizeMessages(body.messages);

        // 请求自带 baseUrl/apiKey 时直连，不经过已保存的服务商
        let providerId: string | null = null;
        let providerName: string;
        let modelId: string;
        let model: ReturnType<ReturnType<typeof createOpenAICompatible>>;
        if (String(body.baseUrl || '').trim()) {
          const baseUrl = String(body.baseUrl).trim().replace(/\/+$/, '');
          if (!/^https?:\/\//i.test(baseUrl)) throw new Error('baseUrl 必须以 http:// 或 https:// 开头');
          modelId = String(body.model || '').trim();
          if (!modelId) throw new Error('自带 baseUrl 调用时必须指定 model');
          providerName = String(body.name || '自定义').trim() || '自定义';
          model = createOpenAICompatible({
            name: providerName,
            apiKey: String(body.apiKey || '').trim() || undefined,
            baseURL: baseUrl,
          })(modelId);
        } else {
          const provider = this.resolveProvider(body.providerId);
          providerId = provider.id;
          providerName = provider.name;
          model = this.buildModel(provider, body.model);
          modelId = String(body.model || '').trim() || provider.models[0];
        }

        if (!stream) {
          const result = await generateText({
            model,
            messages,
            abortSignal: AbortSignal.timeout(300000),
          });
          return res.json({
            success: true,
            providerId,
            providerName,
            model: modelId,
            text: result.text,
            usage: result.usage,
          });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('X-Mira-Provider', encodeURIComponent(providerName));
        res.setHeader('X-Mira-Model', encodeURIComponent(modelId));
        res.flushHeaders();

        let streamError = '';
        let received = false;
        const result = streamText({
          model,
          messages,
          onError({ error }) {
            streamError = error instanceof Error ? error.message : String(error);
          },
        });
        try {
          for await (const chunk of result.textStream) {
            received = true;
            res.write(chunk);
          }
        } catch (error) {
          streamError = streamError || (error instanceof Error ? error.message : String(error));
        }
        if (streamError && !received) {
          res.write(`[AI SDK 错误] ${streamError}`);
        }
        res.end();
      } catch (error) {
        if (stream && res.headersSent) {
          res.write(`[AI SDK 错误] ${this.errorMessage(error)}`);
          return res.end();
        }
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });

    // 图片生成（参考 ai-image 的参数设计；结果写入 data/images/ 并经 /api/plugins 静态路由访问）
    router.registerRounter(libraryId, '/ai-sdk/image/generate', 'post', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        const prompt = String(body.prompt || '').trim();
        if (!prompt) throw new Error('prompt 不能为空');

        // 与 /ai-sdk/chat 一致：请求自带 baseUrl/apiKey 时直连，否则用已保存服务商
        let providerId: string | null = null;
        let providerName: string;
        let modelId: string;
        let imageModel: ReturnType<ReturnType<typeof createOpenAICompatible>['imageModel']>;
        if (String(body.baseUrl || '').trim()) {
          const baseUrl = String(body.baseUrl).trim().replace(/\/+$/, '');
          if (!/^https?:\/\//i.test(baseUrl)) throw new Error('baseUrl 必须以 http:// 或 https:// 开头');
          modelId = String(body.model || '').trim();
          if (!modelId) throw new Error('自带 baseUrl 调用时必须指定 model');
          providerName = String(body.name || '自定义').trim() || '自定义';
          imageModel = createOpenAICompatible({
            name: providerName,
            apiKey: String(body.apiKey || '').trim() || undefined,
            baseURL: baseUrl,
            fetch: imageResponseFetch,
          }).imageModel(modelId);
        } else {
          const provider = this.resolveProvider(body.providerId);
          providerId = provider.id;
          providerName = provider.name;
          imageModel = this.buildImageModel(provider, body.model);
          modelId = String(body.model || '').trim() || provider.models[0];
        }

        const n = Math.min(Math.max(1, Number(body.n) || 1), 10);
        const size = String(body.size || '').trim();
        if (size && !/^\d{2,5}x\d{2,5}$/.test(size)) throw new Error('size 格式必须为 {width}x{height}，如 1024x1024');
        const seed = body.seed === undefined || body.seed === null || body.seed === '' ? undefined : Number(body.seed);
        if (seed !== undefined && (!Number.isFinite(seed) || seed < 0)) throw new Error('seed 必须是非负数字');
        const providerOptions = body.providerOptions && typeof body.providerOptions === 'object' && !Array.isArray(body.providerOptions)
          ? body.providerOptions
          : undefined;

        // 传入 images（base64 数组，可选）时走图片编辑（/images/edits），否则文生图（/images/generations）
        const inputImages: DataContent[] = Array.isArray(body.images)
          ? body.images.map((item: unknown) => toBase64Content(item)).filter(Boolean)
          : [];
        const mask: DataContent | undefined = body.mask ? toBase64Content(body.mask) : undefined;
        const generatePrompt = inputImages.length ? { text: prompt, images: inputImages, mask } : prompt;

        const startedAt = Date.now();
        const result = await generateImage({
          model: imageModel,
          prompt: generatePrompt,
          n,
          size: (size || undefined) as `${number}x${number}` | undefined,
          seed,
          providerOptions,
          abortSignal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
        });

        const imageDir = path.join(this.pluginDir, IMAGE_DIR_NAME);
        fs.mkdirSync(imageDir, { recursive: true });
        const returnBase64 = body.returnBase64 === true;
        const slug = slugifyPrompt(prompt) || 'image';
        const images = result.images.map(image => {
          const extension = imageExtensionOf(image.mediaType);
          const fileName = `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${extension}`;
          fs.writeFileSync(path.join(imageDir, fileName), image.uint8Array);
          const item: Record<string, unknown> = {
            url: `plugins/${libraryId}/${PLUGIN_NAME}/${IMAGE_DIR_NAME.split(path.sep).join('/')}/${fileName}`,
            file: `${IMAGE_DIR_NAME.split(path.sep).join('/')}/${fileName}`,
            mediaType: image.mediaType,
          };
          if (returnBase64) item.base64 = image.base64;
          return item;
        });

        res.json({
          success: true,
          providerId,
          providerName,
          model: modelId,
          prompt,
          n,
          size: size || null,
          elapsed: Date.now() - startedAt,
          images,
          warnings: result.warnings,
          usage: result.usage,
        });
      } catch (error) {
        res.status(502).json({ success: false, error: this.errorMessage(error) });
      }
    });
  }

  private errorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (/is not valid JSON|Failed to fetch|fetch failed/i.test(message)) {
      return `无法连接到服务商，请检查 Base URL 与网络: ${message}`;
    }
    if (/401|Unauthorized|invalid.*key|incorrect.*key/i.test(message)) {
      return `鉴权失败，请检查 API Key: ${message}`;
    }
    return message;
  }
}

export function init(inst: any) {
  return new MiraAiSdkPlugin(inst);
}
