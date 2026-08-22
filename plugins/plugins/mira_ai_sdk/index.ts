import * as fs from 'fs';
import * as path from 'path';
import { generateText, streamText } from 'ai';
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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const PLUGIN_NAME = 'mira_ai_sdk';
const TEST_TIMEOUT_MS = 30000;
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

class MiraAiSdkPlugin {
  private readonly pluginName = PLUGIN_NAME;
  private readonly routes: any[] = [];
  private readonly backend: any;
  private readonly libraryId: string;
  private readonly dataFile: string;
  private store: StoreData = { providers: [], defaultProviderId: null };

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.backend = pluginManager.server.backend;
    this.libraryId = inst.dbService.getLibraryId();
    this.dataFile = path.join(pluginManager.getPluginDir(this.pluginName), 'data', 'providers.json');
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

  private registerApiRoutes() {
    const router = this.backend.getHttpServer().httpRouter;
    const libraryId = this.libraryId;

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
        const provider = this.resolveProvider(body.providerId);
        const model = this.buildModel(provider, body.model);
        const messages = normalizeMessages(body.messages);
        const modelId = String(body.model || '').trim() || provider.models[0];

        if (!stream) {
          const result = await generateText({
            model,
            messages,
            abortSignal: AbortSignal.timeout(300000),
          });
          return res.json({
            success: true,
            providerId: provider.id,
            providerName: provider.name,
            model: modelId,
            text: result.text,
            usage: result.usage,
          });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('X-Mira-Provider', encodeURIComponent(provider.name));
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
