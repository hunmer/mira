# Mira 浏览器扩展 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Chrome MV3 扩展 `packages/mira-browser-extension`,实现网页截图、拖拽上传、资源嗅探、自动滚动、popup/side panel 双形态,通过 `mira-app-core` dist SDK 与后端通信。

**Architecture:** 方案 A 模块化分层。service worker 是唯一 SDK 出口(规避 content script CSP/跨域);content script 负责页面交互(嗅探/拖拽 popover/自动滚动/选区覆盖层);UI(popup/side panel)共享一套 Vue 3 + shadcn-vue 组件。三者通过类型化消息协议通信。

**Tech Stack:** Chrome Extension Manifest V3、TypeScript(strict)、Vue 3 + shadcn-vue、Vite + `@crxjs/vite-plugin`、`mira-app-core`(workspace SDK)、Vitest(纯逻辑模块)。

## Global Constraints

- **TypeScript strict**,继承根 `tsconfig.json`(`target: ES2020`、`module: ESNext`、`moduleResolution: node`、`strict: true`)
- **SDK 集成方式**:`import { MiraClient } from 'mira-app-core'`,用 `workspace:*` 从 monorepo 引用,**禁止手写纯 HTTP** 调用 mira-app-server
- **SDK 入口产物**:`mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs`(package.json `exports['./shared/sdk']` 已声明)
- **shadcn-vue 约定**:UI 组件放 `src/components/ui/*`,遵循 monorepo 既有风格(参考 `packages/mira-client/src/components/ui`)
- **认证模型**:用户名+密码 → `auth().login()` 拿 `accessToken`;**无 API key 体系**;token 存 `chrome.storage.session`,password 存 session,其余设置存 `chrome.storage.local`
- **service worker 唯一 SDK 出口**:content script 和 UI 不直接 import `mira-app-core`、不直接发 HTTP,全部经消息发往 service worker
- **MV3 限制**:service worker 30 秒空闲会被终止;`MiraClient` 实例不持久化,按需 rebuild;上传队列不持久化
- **monorepo 测试现状**:多数包无单测,以"构建通过 + 类型检查"为门禁。本计划纯逻辑模块用 Vitest TDD,Chrome API/UI 模块用构建通过 + 手动验证清单
- **Chrome 版本要求**:Chrome 116+(offscreen API)

## 文件结构

```
packages/mira-browser-extension/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── manifest.ts                       # MV3 manifest(程序化生成)
│   ├── background/
│   │   ├── index.ts                      # service worker 入口:消息路由 + 生命周期
│   │   ├── message-router.ts             # Request → handler 路由表
│   │   ├── mira-client.ts                # MiraClient 单例 + token + 自动重登
│   │   ├── uploader.ts                   # 上传队列(并发/重试/进度)
│   │   ├── capturer.ts                   # 截图捕获(可视/整页/选区编排)
│   │   ├── offscreen.ts                  # offscreen document 管理
│   │   ├── context-menus.ts              # 右键菜单注册
│   │   └── settings.ts                   # 设置读写封装
│   ├── content/
│   │   ├── index.ts                      # content script 入口:ContentCommand 路由
│   │   ├── sniffer.ts                    # DOM + PerformanceObserver 嗅探
│   │   ├── dragdrop.ts                   # 拖拽图片 popover 快传按钮
│   │   ├── autoscroll.ts                 # 自动滚动执行器(共享)
│   │   └── overlay/
│   │       └── selection.ts              # 选区截图覆盖层
│   ├── offscreen/
│   │   ├── index.html
│   │   ├── index.ts                      # offscreen 入口:接收 STITCH/CROP
│   │   └── image-ops.ts                  # Canvas 拼接/裁剪纯函数
│   ├── ui/
│   │   ├── popup.html
│   │   ├── sidepanel.html
│   │   ├── main.ts                       # 共用入口(containerMode prop)
│   │   ├── App.vue
│   │   ├── style.css
│   │   ├── composables/
│   │   │   ├── useBackground.ts          # 消息桥
│   │   │   ├── useSettings.ts
│   │   │   ├── useConnection.ts
│   │   │   ├── useUploadQueue.ts
│   │   │   └── useSniffer.ts
│   │   └── components/
│   │       ├── ConnectionForm.vue
│   │       ├── TabBar.vue
│   │       ├── GlobalHeader.vue
│   │       ├── upload/{UploadView,Dropzone,UploadQueue,UploadItem}.vue
│   │       ├── screenshot/ScreenshotView.vue
│   │       ├── sniffer/{SnifferView,ResourceList,ResourceItem}.vue
│   │       ├── settings/SettingsView.vue
│   │       └── ui/*                      # shadcn-vue 组件(button/input/tabs/select/switch/checkbox/card/progress/sonner)
│   └── shared/
│       ├── messages.ts                   # Request/Event/ContentCommand 类型
│       ├── staged-file.ts                # 跨上下文文件序列化(StagedFile)
│       ├── storage.ts                    # chrome.storage schema + key 常量
│       └── types.ts                      # ExtensionSettings/SniffedResource/UploadTask
├── icons/                                # 扩展图标(占位 png)
└── README.md
```

**单元边界说明**:每个文件单一职责。`shared/` 是无 Chrome 依赖的纯类型/工具(可单测);`background/`、`content/`、`ui/` 依赖 Chrome API 或 Vue;`offscreen/image-ops.ts` 是纯 Canvas 函数(可单测,jsdom 环境)。文件按"变化频率"分组:设置相关聚在 settings.ts,上传相关聚在 uploader.ts。

---

## Phase 1: 骨架与共享层

### Task 1: 创建 package 脚手架并接入 workspace

**Files:**
- Create: `packages/mira-browser-extension/package.json`
- Create: `packages/mira-browser-extension/tsconfig.json`
- Modify: `pnpm-workspace.yaml`(新增一条 `'packages/mira-browser-extension'`)
- Create: `packages/mira-browser-extension/.gitignore`
- Create: `packages/mira-browser-extension/README.md`

**Interfaces:**
- Produces:可被 workspace 识别的 package `mira-browser-extension`,依赖 `mira-app-core: workspace:*`

- [ ] **Step 1: 创建 package.json**

Create `packages/mira-browser-extension/package.json`:

```json
{
  "name": "mira-browser-extension",
  "version": "0.1.0",
  "private": true,
  "description": "Mira 浏览器扩展 - 网页采集入口(截图/拖拽上传/资源嗅探)",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "type-check": "vue-tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "mira-app-core": "workspace:*",
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "@vitejs/plugin-vue": "^5.0.0",
    "@types/chrome": "^0.0.260",
    "@vitest/coverage-v8": "^1.6.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.3.3",
    "vite": "^5.4.0",
    "vitest": "^1.6.0",
    "vue-tsc": "^2.0.0"
  }
}
```

> 注意:`@crxjs/vite-plugin` v2 仍是 beta(MV3 专用),使用 `^2.0.0-beta.28`。Vite 锁 5.x 避免与 beta 插件不兼容。

- [ ] **Step 2: 创建 tsconfig.json**

Create `packages/mira-browser-extension/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "types": ["chrome", "vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "src/**/*.tsx"],
  "references": [{ "path": "../mira-app-core" }]
}
```

- [ ] **Step 3: 接入 workspace**

在 `pnpm-workspace.yaml` 的 `packages:` 列表末尾追加一行:

```yaml
  - 'packages/mira-browser-extension'
```

- [ ] **Step 4: 创建 .gitignore 和 README**

Create `packages/mira-browser-extension/.gitignore`:

```
node_modules/
dist/
*.local
.vite/
```

Create `packages/mira-browser-extension/README.md`:

```markdown
# mira-browser-extension

Mira 浏览器扩展(Chrome MV3)。网页采集入口:截图、拖拽上传、资源嗅探、自动滚动。

## 开发

pnpm install
pnpm --filter mira-browser-extension dev   # vite + @crxjs HMR,加载 dist/ 到 chrome://extensions

## 构建

pnpm --filter mira-browser-extension build  # 产物在 dist/,可直接加载
```

- [ ] **Step 5: 安装依赖并验证 workspace 接入**

Run:
```bash
cd packages/mira-browser-extension && pnpm install
```
Expected: 安装成功,`mira-app-core` 被解析为 workspace 链接。

验证链接:
```bash
ls -la node_modules/mira-app-core
```
Expected: 是指向 `../../mira-app-core` 的符号链接。

- [ ] **Step 6: Commit**

```bash
git add packages/mira-browser-extension pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(ext): 创建 mira-browser-extension package 脚手架"
```

---

### Task 2: shared/types.ts — 核心类型定义

**Files:**
- Create: `packages/mira-browser-extension/src/shared/types.ts`

**Interfaces:**
- Produces: `ResourceKind`、`SniffedResource`、`UploadStatus`、`UploadTask`、`ExtensionSettings`、`DEFAULT_SETTINGS`、`StagedFile`

- [ ] **Step 1: 编写类型定义文件**

Create `packages/mira-browser-extension/src/shared/types.ts`:

```ts
/**
 * 资源类型
 */
export type ResourceKind = 'image' | 'audio' | 'video';

/**
 * 嗅探到的资源
 */
export interface SniffedResource {
  /** url 派生 hash,去重用 */
  id: string;
  url: string;
  kind: ResourceKind;
  source: 'dom' | 'perf';
  /** image/video 宽 */
  width?: number;
  /** image/video 高 */
  height?: number;
  /** audio/video 时长(秒) */
  duration?: number;
  /** video 海报图 url */
  poster?: string;
  mimeType?: string;
  /** srcset 其他候选 url */
  variants?: string[];
  /** 出现次数 */
  occurrences: number;
  /** 嗅探时间戳 */
  sniffedAt: number;
}

/**
 * 上传任务状态
 */
export type UploadStatus = 'queued' | 'uploading' | 'success' | 'failed';

/**
 * 上传任务来源
 */
export type UploadSource = 'screenshot' | 'dragdrop' | 'sniffer' | 'dropzone';

/**
 * 上传任务
 */
export interface UploadTask {
  id: string;
  source: UploadSource;
  file: File;
  libraryId: string;
  tags?: string[];
  folderId?: string;
  status: UploadStatus;
  /** 0-100 */
  percent: number;
  error?: string;
  result?: { success: boolean; file: string; error?: string };
  createdAt: number;
}

/**
 * UI 模式
 */
export type UIMode = 'popup' | 'sidePanel';

/**
 * 扩展设置
 */
export interface ExtensionSettings {
  serverURL: string;
  username: string;
  password: string;
  libraryId: string;
  folderId?: string;
  tags: string[];
  uiMode: UIMode;
  dragPopoverEnabled: boolean;
  dropZoneEnabled: boolean;
  snifferEnabled: boolean;
  snifferKinds: ResourceKind[];
  autoScrollEnabled: boolean;
  /** 滚动间隔(ms) */
  autoScrollDelay: number;
}

/**
 * 默认设置(开箱不崩)
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  serverURL: '',
  username: '',
  password: '',
  libraryId: '',
  tags: [],
  uiMode: 'popup',
  dragPopoverEnabled: true,
  dropZoneEnabled: true,
  snifferEnabled: false,
  snifferKinds: ['image', 'audio', 'video'],
  autoScrollEnabled: false,
  autoScrollDelay: 800,
};

/**
 * 跨上下文文件序列化结构
 * chrome.runtime.sendMessage 无法序列化 File,用此结构传输
 */
export interface StagedFile {
  name: string;
  type: string;
  /** 二进制数据 */
  buffer: ArrayBuffer;
}
```

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/shared/types.ts
git commit -m "feat(ext): shared 核心类型定义(资源/上传任务/设置)"
```

---

### Task 3: shared/messages.ts — 消息协议类型(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/shared/messages.ts`
- Create: `packages/mira-browser-extension/vitest.config.ts`
- Create: `packages/mira-browser-extension/src/shared/messages.test.ts`

**Interfaces:**
- Consumes: `ExtensionSettings`、`StagedFile`、`SniffedResource`、`ResourceKind`、`UploadStatus`(from Task 2)
- Produces: `Request`、`Event`、`ContentCommand` 联合类型 + `isRequest`/`isContentCommand` 类型守卫

- [ ] **Step 1: 创建 vitest 配置**

Create `packages/mira-browser-extension/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: 写失败测试**

Create `packages/mira-browser-extension/src/shared/messages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isRequest, isContentCommand, isEvent } from './messages';

describe('messages 类型守卫', () => {
  it('isRequest 识别合法 Request', () => {
    expect(isRequest({ type: 'AUTH_VERIFY' })).toBe(true);
    expect(isRequest({ type: 'LIB_LIST' })).toBe(true);
    expect(isRequest({
      type: 'UPLOAD_FILES',
      payload: { files: [], libraryId: 'lib1' },
    })).toBe(true);
  });

  it('isRequest 拒绝未知 type', () => {
    expect(isRequest({ type: 'UNKNOWN' })).toBe(false);
    expect(isRequest(null)).toBe(false);
  });

  it('isContentCommand 识别合法 ContentCommand', () => {
    expect(isContentCommand({ type: 'SNIFFER_START', payload: { kinds: ['image'] } })).toBe(true);
    expect(isContentCommand({ type: 'DRAW_SELECTION' })).toBe(true);
  });

  it('isContentCommand 拒绝 Request', () => {
    expect(isContentCommand({ type: 'AUTH_VERIFY' })).toBe(false);
  });

  it('isEvent 识别合法 Event', () => {
    expect(isEvent({ type: 'AUTH_EXPIRED' })).toBe(true);
    expect(isEvent({
      type: 'UPLOAD_PROGRESS',
      payload: { id: 't1', percent: 50, status: 'uploading' },
    })).toBe(true);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: FAIL,`Cannot find module './messages'`。

- [ ] **Step 4: 实现 messages.ts**

Create `packages/mira-browser-extension/src/shared/messages.ts`:

```ts
import type {
  ExtensionSettings,
  StagedFile,
  SniffedResource,
  ResourceKind,
  UploadStatus,
} from './types';

/**
 * UI/content script → service worker
 */
export type Request =
  // 认证 / 配置
  | { type: 'AUTH_LOGIN'; payload: { username: string; password: string } }
  | { type: 'AUTH_VERIFY' }
  | { type: 'CONFIG_GET' }
  | { type: 'CONFIG_SET'; payload: Partial<ExtensionSettings> }
  // 素材库
  | { type: 'LIB_LIST' }
  | { type: 'FOLDER_LIST'; payload: { libraryId: string } }
  // 上传
  | {
      type: 'UPLOAD_FILES';
      payload: { files: StagedFile[]; libraryId: string; tags?: string[]; folderId?: string };
    }
  | { type: 'UPLOAD_FROM_URL'; payload: { url: string; kind: ResourceKind; libraryId: string } }
  | { type: 'UPLOAD_STATUS' }
  | { type: 'UPLOAD_CANCEL'; payload: { id: string } }
  // 截图
  | { type: 'CAPTURE_VISIBLE'; payload: { tabId: number } }
  | { type: 'CAPTURE_FULLPAGE'; payload: { tabId: number } }
  | { type: 'CAPTURE_SELECTION'; payload: { tabId: number } }
  // 嗅探
  | { type: 'SNIFFER_START'; payload: { tabId: number; kinds: ResourceKind[] } }
  | { type: 'SNIFFER_STOP'; payload: { tabId: number } }
  | { type: 'SNIFFER_QUERY'; payload: { tabId: number } }
  // 自动滚动
  | { type: 'AUTOSCROLL_START'; payload: { tabId: number } }
  | { type: 'AUTOSCROLL_STOP'; payload: { tabId: number } };

/**
 * service worker → 推送(content script / UI 监听)
 */
export type Event =
  | { type: 'UPLOAD_PROGRESS'; payload: { id: string; percent: number; status: UploadStatus } }
  | { type: 'SNIFFER_FOUND'; payload: { tabId: number; resources: SniffedResource[] } }
  | { type: 'AUTH_EXPIRED' };

/**
 * service worker → content script(经 chrome.tabs.sendMessage,带 tabId)
 */
export type ContentCommand =
  | { type: 'SNIFFER_START'; payload: { kinds: ResourceKind[] } }
  | { type: 'SNIFFER_STOP' }
  | { type: 'AUTOSCROLL_START'; payload: { delay: number } }
  | { type: 'AUTOSCROLL_STOP' }
  | { type: 'START_SCROLL_CAPTURE'; payload: { delay: number } }
  | { type: 'DRAW_SELECTION' }
  | { type: 'DISPATCH_DRAGDROP'; payload: { enabled: boolean } };

const REQUEST_TYPES = new Set<Request['type']>([
  'AUTH_LOGIN', 'AUTH_VERIFY', 'CONFIG_GET', 'CONFIG_SET',
  'LIB_LIST', 'FOLDER_LIST',
  'UPLOAD_FILES', 'UPLOAD_FROM_URL', 'UPLOAD_STATUS', 'UPLOAD_CANCEL',
  'CAPTURE_VISIBLE', 'CAPTURE_FULLPAGE', 'CAPTURE_SELECTION',
  'SNIFFER_START', 'SNIFFER_STOP', 'SNIFFER_QUERY',
  'AUTOSCROLL_START', 'AUTOSCROLL_STOP',
]);

const COMMAND_TYPES = new Set<ContentCommand['type']>([
  'SNIFFER_START', 'SNIFFER_STOP',
  'AUTOSCROLL_START', 'AUTOSCROLL_STOP',
  'START_SCROLL_CAPTURE', 'DRAW_SELECTION', 'DISPATCH_DRAGDROP',
]);

const EVENT_TYPES = new Set<Event['type']>([
  'UPLOAD_PROGRESS', 'SNIFFER_FOUND', 'AUTH_EXPIRED',
]);

export function isRequest(m: unknown): m is Request {
  return !!m && typeof m === 'object' && 'type' in m
    && REQUEST_TYPES.has((m as Request).type);
}

export function isContentCommand(m: unknown): m is ContentCommand {
  return !!m && typeof m === 'object' && 'type' in m
    && COMMAND_TYPES.has((m as ContentCommand).type);
}

export function isEvent(m: unknown): m is Event {
  return !!m && typeof m === 'object' && 'type' in m
    && EVENT_TYPES.has((m as Event).type);
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: PASS(5 个测试全过)。

- [ ] **Step 6: Commit**

```bash
git add packages/mira-browser-extension/src/shared/messages.ts \
  packages/mira-browser-extension/src/shared/messages.test.ts \
  packages/mira-browser-extension/vitest.config.ts
git commit -m "feat(ext): 消息协议类型 + 类型守卫(TDD)"
```

---

### Task 4: shared/staged-file.ts — 跨上下文文件序列化(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/shared/staged-file.ts`
- Create: `packages/mira-browser-extension/src/shared/staged-file.test.ts`

**Interfaces:**
- Consumes: `StagedFile`(from Task 2)
- Produces: `fileToStaged(file: File): Promise<StagedFile>`、`stagedToFile(staged: StagedFile): File`、`bufferToDataUrl(buffer, type): Promise<string>`、`dataUrlToBlob(dataUrl): Blob`

- [ ] **Step 1: 写失败测试**

Create `packages/mira-browser-extension/src/shared/staged-file.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stagedToFile, bufferToDataUrl, dataUrlToBlob } from './staged-file';

describe('staged-file', () => {
  it('stagedToFile 还原文件名和类型', () => {
    const buffer = new ArrayBuffer(3);
    new Uint8Array(buffer).set([1, 2, 3]);
    const file = stagedToFile({ name: 'a.png', type: 'image/png', buffer });
    expect(file.name).toBe('a.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(3);
  });

  it('bufferToDataUrl 生成 data url', async () => {
    const buffer = new ArrayBuffer(2);
    new Uint8Array(buffer).set([255, 216]); // JPEG SOI marker
    const url = await bufferToDataUrl(buffer, 'image/jpeg');
    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('dataUrlToBlob 还原 blob', () => {
    const blob = dataUrlToBlob('data:text/plain;base64,aGVsbG8=');
    expect(blob.size).toBe(5);
    expect(blob.type).toBe('text/plain');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 staged-file.ts**

Create `packages/mira-browser-extension/src/shared/staged-file.ts`:

```ts
import type { StagedFile } from './types';

/**
 * File → StagedFile(用于跨上下文传输)
 * chrome.runtime.sendMessage 无法序列化 File,转成 ArrayBuffer + 元信息
 */
export async function fileToStaged(file: File): Promise<StagedFile> {
  const buffer = await file.arrayBuffer();
  return { name: file.name, type: file.type, buffer };
}

/**
 * StagedFile → File(service worker 侧重建)
 */
export function stagedToFile(staged: StagedFile): File {
  return new File([staged.buffer], staged.name, { type: staged.type });
}

/**
 * ArrayBuffer → dataURL(截图 dataURL 转 File 用)
 */
export function bufferToDataUrl(buffer: ArrayBuffer, type: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type });
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * dataURL → Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const type = /data:(.*?);base64/.exec(meta)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * dataURL → File
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  return new File([dataUrlToBlob(dataUrl)], filename, {
    type: dataUrlToBlob(dataUrl).type,
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/mira-browser-extension/src/shared/staged-file.ts \
  packages/mira-browser-extension/src/shared/staged-file.test.ts
git commit -m "feat(ext): 跨上下文文件序列化工具(TDD)"
```

---

### Task 5: shared/storage.ts — chrome.storage schema 封装(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/shared/storage.ts`
- Create: `packages/mira-browser-extension/src/shared/storage.test.ts`

**Interfaces:**
- Consumes: `ExtensionSettings`、`DEFAULT_SETTINGS`(from Task 2)
- Produces: `STORAGE_KEYS`、`loadSettings()`、`saveSettings(partial)`、`loadSession()`、`saveSession(partial)`、`mergeWithDefaults(partial)`

- [ ] **Step 1: 写失败测试**

Create `packages/mira-browser-extension/src/shared/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mergeWithDefaults, STORAGE_KEYS } from './storage';
import { DEFAULT_SETTINGS } from './types';

// mock chrome.storage(在测试里用一个内存实现)
const localStore: Record<string, any> = {};
const sessionStore: Record<string, any> = {};

globalThis.chrome = {
  storage: {
    local: {
      get: async (keys: string[]) =>
        Object.fromEntries(keys.filter(k => k in localStore).map(k => [k, localStore[k]])),
      set: async (items: Record<string, any>) => { Object.assign(localStore, items); },
    },
    session: {
      get: async (keys: string[]) =>
        Object.fromEntries(keys.filter(k => k in sessionStore).map(k => [k, sessionStore[k]])),
      set: async (items: Record<string, any>) => { Object.assign(sessionStore, items); },
    },
  },
} as any;

describe('storage', () => {
  beforeEach(() => {
    Object.keys(localStore).forEach(k => delete localStore[k]);
    Object.keys(sessionStore).forEach(k => delete sessionStore[k]);
  });

  it('STORAGE_KEYS 区分 local 和 session', () => {
    expect(STORAGE_KEYS.local).toBe('mira_settings');
    expect(STORAGE_KEYS.session).toBe('mira_session');
  });

  it('mergeWithDefaults 用默认值填充缺失字段', () => {
    const merged = mergeWithDefaults({ serverURL: 'http://x', username: 'u' });
    expect(merged.serverURL).toBe('http://x');
    expect(merged.uiMode).toBe(DEFAULT_SETTINGS.uiMode);
    expect(merged.snifferEnabled).toBe(false);
  });

  it('loadSettings 返回合并默认值的完整设置', async () => {
    localStore[STORAGE_KEYS.local] = { serverURL: 'http://y' };
    const { loadSettings } = await import('./storage');
    const settings = await loadSettings();
    expect(settings.serverURL).toBe('http://y');
    expect(settings.dropZoneEnabled).toBe(true);
  });

  it('saveSettings 写入 local storage', async () => {
    const { saveSettings, loadSettings } = await import('./storage');
    await saveSettings({ serverURL: 'http://z' });
    expect(localStore[STORAGE_KEYS.local].serverURL).toBe('http://z');
  });

  it('saveSession 写入 session storage', async () => {
    const { saveSession, loadSession } = await import('./storage');
    await saveSession({ token: 'tok123' });
    const sess = await loadSession();
    expect(sess.token).toBe('tok123');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 storage.ts**

Create `packages/mira-browser-extension/src/shared/storage.ts`:

```ts
import { DEFAULT_SETTINGS, type ExtensionSettings } from './types';

export const STORAGE_KEYS = {
  /** chrome.storage.local key —— 持久设置 */
  local: 'mira_settings',
  /** chrome.storage.session key —— token / password(运行期) */
  session: 'mira_session',
} as const;

export interface SessionData {
  token?: string;
  username?: string;
  password?: string;
}

/**
 * 用默认值合并部分设置,保证字段完整
 */
export function mergeWithDefaults(partial: Partial<ExtensionSettings>): ExtensionSettings {
  return { ...DEFAULT_SETTINGS, ...partial };
}

/**
 * 读取完整设置(local storage,合并默认值)
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.local);
  const stored = result[STORAGE_KEYS.local] as Partial<ExtensionSettings> | undefined;
  return mergeWithDefaults(stored ?? {});
}

/**
 * 保存部分设置(合并后整体写入,避免覆盖丢失字段)
 */
export async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const merged = mergeWithDefaults({ ...current, ...partial });
  await chrome.storage.local.set({ [STORAGE_KEYS.local]: merged });
  return merged;
}

/**
 * 读取 session 数据(token/password)
 */
export async function loadSession(): Promise<SessionData> {
  const result = await chrome.storage.session.get(STORAGE_KEYS.session);
  return (result[STORAGE_KEYS.session] as SessionData) ?? {};
}

/**
 * 保存部分 session 数据
 */
export async function saveSession(partial: Partial<SessionData>): Promise<SessionData> {
  const current = await loadSession();
  const merged = { ...current, ...partial };
  await chrome.storage.session.set({ [STORAGE_KEYS.session]: merged });
  return merged;
}

/**
 * 清除 session(登出)
 */
export async function clearSession(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEYS.session);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: PASS(5 个测试全过)。

- [ ] **Step 5: Commit**

```bash
git add packages/mira-browser-extension/src/shared/storage.ts \
  packages/mira-browser-extension/src/shared/storage.test.ts
git commit -m "feat(ext): chrome.storage schema 封装(TDD)"
```

---

## Phase 2: Service Worker 核心

### Task 6: background/settings.ts — service worker 侧设置访问

**Files:**
- Create: `packages/mira-browser-extension/src/background/settings.ts`

**Interfaces:**
- Consumes: `loadSettings`、`saveSettings`、`loadSession`、`saveSession`(from Task 5)
- Produces: `getSettings()`、`updateSettings(partial)`、设置变更监听器注册 `onSettingsChange(cb)`

- [ ] **Step 1: 实现 settings.ts**

service worker 重启后内存设置丢失,每次读都从 storage 取(不缓存)。`onSettingsChange` 用 `chrome.storage.onChanged` 监听。

Create `packages/mira-browser-extension/src/background/settings.ts`:

```ts
import { loadSettings, saveSettings, STORAGE_KEYS } from '@/shared/storage';
import type { ExtensionSettings } from '@/shared/types';

export type SettingsChangeCallback = (settings: ExtensionSettings) => void;

const listeners = new Set<SettingsChangeCallback>();

/**
 * 读取当前设置(每次从 storage,不缓存 —— service worker 会重启)
 */
export async function getSettings(): Promise<ExtensionSettings> {
  return loadSettings();
}

/**
 * 更新部分设置并通知监听器
 */
export async function updateSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const merged = await saveSettings(partial);
  listeners.forEach(cb => cb(merged));
  return merged;
}

/**
 * 注册设置变更监听器
 */
export function onSettingsChange(cb: SettingsChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * 初始化:绑定 chrome.storage.onChanged → 广播给监听器
 * 在 service worker 启动时调用一次
 */
export function initSettingsWatcher(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.local]) {
      const settings = changes[STORAGE_KEYS.local].newValue as ExtensionSettings;
      listeners.forEach(cb => cb(settings));
    }
  });
}
```

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/background/settings.ts
git commit -m "feat(ext): service worker 侧设置访问 + 变更监听"
```

---

### Task 7: background/mira-client.ts — SDK 单例与 token 管理(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/background/mira-client.ts`
- Create: `packages/mira-browser-extension/src/background/mira-client.test.ts`

**Interfaces:**
- Consumes: `MiraClient`(from `mira-app-core`)、`loadSettings`、`loadSession`、`saveSession`(from Task 5)、`updateSettings`(from Task 6)
- Produces: `ensureClient()` → `Promise<MiraClient>`、`login(creds)`、`isAuthError(e)`、`broadcastAuthExpired()`

**说明**:`MiraClientHolder` 是纯逻辑类(token 判断、重登决策),但 `MiraClient` 实例化需要真实 SDK。测试时注入一个 mock client factory,验证重登/token 失效逻辑。

- [ ] **Step 1: 写失败测试**

Create `packages/mira-browser-extension/src/background/mira-client.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 mira-client.ts**

Create `packages/mira-browser-extension/src/background/mira-client.ts`:

```ts
import { MiraClient } from 'mira-app-core';
import { loadSettings } from '@/shared/storage';
import { loadSession, saveSession } from '@/shared/storage';

/**
 * 判断错误是否为认证失效(401 / token 过期)
 */
export function isAuthError(e: any): boolean {
  if (!e) return false;
  // axios 原始错误
  if (e.response?.status === 401) return true;
  // SDK 标准化 ErrorResponse
  if (e.error === 'AUTH_ERROR' || e.error === 'UNAUTHORIZED') return true;
  const msg = (e.message || '').toLowerCase();
  return msg.includes('token') || msg.includes('unauthorized') || msg.includes('expired');
}

let currentClient: MiraClient | null = null;
let currentServerURL = '';

/**
 * 构建/获取 MiraClient(service worker 重启后按需重建)
 */
export async function ensureClient(): Promise<MiraClient> {
  const settings = await loadSettings();
  // serverURL 变化或首次 → 重建
  if (!currentClient || currentServerURL !== settings.serverURL) {
    const session = await loadSession();
    currentClient = new MiraClient(settings.serverURL, {
      getToken: () => session.token, // 每次请求实时从闭包外的 session 取
    });
    currentServerURL = settings.serverURL;
    // 注意:getToken 闭包捕获 session 引用,rebuild 后用新闭包
    // 更稳妥:用动态读取
    currentClient = new MiraClient(settings.serverURL, {
      getToken: async () => (await loadSession()).token,
    } as any);
  }
  return currentClient;
}

/**
 * 登录并缓存 token 到 session storage
 */
export async function login(username: string, password: string): Promise<void> {
  const client = await ensureClient();
  const res = await client.auth().login(username, password);
  await saveSession({ token: res.accessToken, username, password });
}

/**
 * token 失效时自动重登(用缓存的凭据)
 * @throws 'AUTH_EXPIRED' 若无缓存凭据
 */
export async function autoRelogin(): Promise<MiraClient> {
  const session = await loadSession();
  if (!session.username || !session.password) {
    throw new Error('AUTH_EXPIRED');
  }
  await login(session.username, session.password);
  return ensureClient();
}

/**
 * 包裹任意 SDK 操作:遇到认证错误自动重登重试一次
 */
export async function withAuth<T>(op: (client: MiraClient) => Promise<T>): Promise<T> {
  const client = await ensureClient();
  try {
    return await op(client);
  } catch (e) {
    if (isAuthError(e)) {
      await autoRelogin();
      const fresh = await ensureClient();
      return op(fresh);
    }
    throw e;
  }
}

/**
 * 登出:清除 session,重置 client
 */
export async function logout(): Promise<void> {
  try {
    const client = await ensureClient();
    await client.auth().logout();
  } catch {
    // 忽略:token 可能已失效
  }
  await chrome.storage.session.remove('mira_session');
  currentClient = null;
  currentServerURL = '';
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: PASS(`isAuthError` 测试全过)。

- [ ] **Step 5: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误(确认 `MiraClient` 从 `mira-app-core` 正确导入)。

- [ ] **Step 6: Commit**

```bash
git add packages/mira-browser-extension/src/background/mira-client.ts \
  packages/mira-browser-extension/src/background/mira-client.test.ts
git commit -m "feat(ext): MiraClient 单例 + token 管理 + 自动重登"
```

---

### Task 8: background/uploader.ts — 上传队列(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/background/uploader.ts`
- Create: `packages/mira-browser-extension/src/background/uploader.test.ts`

**Interfaces:**
- Consumes: `MiraClient`、`withAuth`(from Task 7)、`UploadTask`、`UploadStatus`(from Task 2)、`stagedToFile`(from Task 4)
- Produces: `enqueue(task)`、`getQueue()`、`cancelTask(id)`、`onQueueChange(cb)`、队列进度广播 `broadcastProgress(task)`

**说明**:队列核心逻辑(并发控制、状态机、去重)是纯逻辑,可测。实际 SDK 上传通过注入的 `uploadFn` 抽象,测试注入 mock。

- [ ] **Step 1: 写失败测试**

Create `packages/mira-browser-extension/src/background/uploader.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createUploader, MAX_CONCURRENCY } from './uploader';

function makeFile(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

describe('uploader', () => {
  it('MAX_CONCURRENCY 为 3', () => {
    expect(MAX_CONCURRENCY).toBe(3);
  });

  it('enqueue 返回 task id 且状态为 queued', () => {
    const u = createUploader({ upload: async () => ({ success: true, file: 'f1' }) });
    const id = u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    const task = u.getQueue().find(t => t.id === id);
    expect(task).toBeDefined();
    expect(task!.status).toBe('queued');
  });

  it('顺序处理任务并标记 success', async () => {
    const upload = vi.fn(async () => ({ success: true, file: 'f1' }));
    const u = createUploader({ upload });
    u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    u.enqueue({ file: makeFile('b.png'), libraryId: 'lib1', source: 'dragdrop' });
    await u.idle();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(u.getQueue().every(t => t.status === 'success')).toBe(true);
  });

  it('upload 失败标记 failed 并记录 error', async () => {
    const u = createUploader({
      upload: async () => { throw new Error('network down'); },
    });
    u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    await u.idle();
    const task = u.getQueue()[0];
    expect(task.status).toBe('failed');
    expect(task.error).toContain('network down');
  });

  it('cancelTask 中止上传', async () => {
    let resolveUpload: () => void;
    const upload = vi.fn(() => new Promise<any>(r => { resolveUpload = () => r({ success: true, file: 'f' }); }));
    const u = createUploader({ upload });
    const id = u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    u.cancelTask(id);
    resolveUpload!();
    await u.idle();
    // 取消后任务应被移除或标记取消
    const task = u.getQueue().find(t => t.id === id);
    expect(task === undefined || task.status === 'failed').toBe(true);
  });

  it('onQueueChange 在状态变化时触发', async () => {
    const u = createUploader({ upload: async () => ({ success: true, file: 'f' }) });
    const changes: string[] = [];
    u.onQueueChange(tasks => changes.push(tasks.map(t => t.status).join(',')));
    u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    await u.idle();
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some(c => c.includes('success'))).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 uploader.ts**

Create `packages/mira-browser-extension/src/background/uploader.ts`:

```ts
import type { UploadTask, UploadSource } from '@/shared/types';
import type { UploadResult } from 'mira-app-core';

export const MAX_CONCURRENCY = 3;
const MAX_RETRY = 2;
const RETRY_DELAY = 1000;
const SUCCESS_TTL = 10_000; // 成功任务 10s 后移除

export interface UploadFnInput {
  file: File;
  libraryId: string;
  tags?: string[];
  folderId?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface UploaderDeps {
  /** 实际上传函数(注入,便于测试和生产区分) */
  upload: (input: UploadFnInput) => Promise<UploadResult>;
}

export interface EnqueueInput {
  file: File;
  libraryId: string;
  source: UploadSource;
  tags?: string[];
  folderId?: string;
}

type QueueListener = (tasks: UploadTask[]) => void;

export interface Uploader {
  enqueue(input: EnqueueInput): string;
  getQueue(): UploadTask[];
  cancelTask(id: string): void;
  onQueueChange(cb: QueueListener): () => void;
  /** 等待队列排空(测试用) */
  idle(): Promise<void>;
}

export function createUploader(deps: UploaderDeps): Uploader {
  const queue: UploadTask[] = [];
  const listeners = new Set<QueueListener>();
  const controllers = new Map<string, AbortController>();
  const successTimers = new Map<string, NodeJS.Timeout>();
  let active = 0;
  let idleResolvers: (() => void)[] = [];

  function notify() {
    const snapshot = [...queue];
    listeners.forEach(cb => cb(snapshot));
  }

  function checkIdle() {
    if (active === 0 && queue.every(t => t.status === 'success' || t.status === 'failed')) {
      const resolvers = idleResolvers;
      idleResolvers = [];
      resolvers.forEach(r => r());
    }
  }

  function scheduleSuccessRemoval(id: string) {
    const timer = setTimeout(() => {
      const idx = queue.findIndex(t => t.id === id);
      if (idx >= 0) {
        queue.splice(idx, 1);
        successTimers.delete(id);
        notify();
      }
    }, SUCCESS_TTL);
    successTimers.set(id, timer);
  }

  async function process(task: UploadTask) {
    task.status = 'uploading';
    notify();
    const controller = new AbortController();
    controllers.set(task.id, controller);

    let attempt = 0;
    while (true) {
      try {
        if (controller.signal.aborted) throw new Error('cancelled');
        const result = await deps.upload({
          file: task.file,
          libraryId: task.libraryId,
          tags: task.tags,
          folderId: task.folderId,
          onProgress: percent => {
            task.percent = percent;
            notify();
          },
          signal: controller.signal,
        });
        task.status = 'success';
        task.percent = 100;
        task.result = result;
        controllers.delete(task.id);
        notify();
        scheduleSuccessRemoval(task.id);
        return;
      } catch (e: any) {
        if (controller.signal.aborted || e?.message === 'cancelled') {
          task.status = 'failed';
          task.error = 'cancelled';
          controllers.delete(task.id);
          notify();
          return;
        }
        if (attempt < MAX_RETRY) {
          attempt++;
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          continue;
        }
        task.status = 'failed';
        task.error = e?.message ?? String(e);
        controllers.delete(task.id);
        notify();
        return;
      }
    }
  }

  function pump() {
    while (active < MAX_CONCURRENCY) {
      const next = queue.find(t => t.status === 'queued');
      if (!next) break;
      active++;
      process(next)
        .finally(() => {
          active--;
          pump();
          checkIdle();
        });
    }
    checkIdle();
  }

  return {
    enqueue(input) {
      const task: UploadTask = {
        id: crypto.randomUUID(),
        source: input.source,
        file: input.file,
        libraryId: input.libraryId,
        tags: input.tags,
        folderId: input.folderId,
        status: 'queued',
        percent: 0,
        createdAt: Date.now(),
      };
      queue.push(task);
      notify();
      pump();
      return task.id;
    },
    getQueue() {
      return [...queue];
    },
    cancelTask(id) {
      const controller = controllers.get(id);
      if (controller) controller.abort();
      else {
        // 还在队列未开始 → 直接移除
        const idx = queue.findIndex(t => t.id === id);
        if (idx >= 0) {
          queue.splice(idx, 1);
          notify();
        }
      }
    },
    onQueueChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    idle() {
      return new Promise<void>(resolve => {
        idleResolvers.push(resolve);
        checkIdle();
      });
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: PASS(6 个测试全过)。

- [ ] **Step 5: Commit**

```bash
git add packages/mira-browser-extension/src/background/uploader.ts \
  packages/mira-browser-extension/src/background/uploader.test.ts
git commit -m "feat(ext): 上传队列(并发/重试/取消/进度,TDD)"
```

---

### Task 9: background/capturer.ts — 截图捕获编排

**Files:**
- Create: `packages/mira-browser-extension/src/background/capturer.ts`

**Interfaces:**
- Consumes: `dataUrlToBlob`(from Task 4)、uploader `enqueue`(from Task 8)、`getSettings`(from Task 6)、`tabs.sendMessage`、`tabs.captureVisibleTab`
- Produces: `captureVisible(tabId)`、`captureFullPage(tabId)`、`captureSelection(tabId)` —— 每个捕获后自动入上传队列

- [ ] **Step 1: 实现 capturer.ts**

Create `packages/mira-browser-extension/src/background/capturer.ts`:

```ts
import type { Uploader } from './uploader';
import { dataUrlToBlob } from '@/shared/staged-file';
import { getSettings } from './settings';

export interface CapturerDeps {
  uploader: Uploader;
}

export function createCapturer(deps: CapturerDeps) {
  async function captureAndEnqueue(dataUrl: string, tabId: number, suffix: string) {
    const settings = await getSettings();
    const tab = await chrome.tabs.get(tabId);
    const domain = new URL(tab.url ?? 'unknown').hostname || 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${domain}-${timestamp}-${suffix}.png`;
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], filename, { type: 'image/png' });
    deps.uploader.enqueue({
      file,
      libraryId: settings.libraryId,
      source: 'screenshot',
      tags: [...(settings.tags ?? []), 'screenshot', domain],
      folderId: settings.folderId,
    });
  }

  /** 可视区域截图 */
  async function captureVisible(tabId: number): Promise<void> {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
    await captureAndEnqueue(dataUrl, tabId, 'visible');
  }

  /** 整页滚动截图 */
  async function captureFullPage(tabId: number): Promise<void> {
    const settings = await getSettings();
    // 通知 content script 开始滚动捕获,逐帧收集
    const frames: string[] = [];
    const dims = await chrome.tabs.sendMessage(tabId, {
      type: 'START_SCROLL_CAPTURE',
      payload: { delay: settings.autoScrollDelay },
    }) as { scrollHeight: number; viewportHeight: number };

    let y = 0;
    while (y < dims.scrollHeight) {
      const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
      frames.push(dataUrl);
      y += dims.viewportHeight;
      const arrived = await chrome.tabs.sendMessage(tabId, { type: 'SCROLL_TO', payload: { y } });
      if (!arrived.done) break; // 到底
    }
    // 恢复原位
    await chrome.tabs.sendMessage(tabId, { type: 'SCROLL_RESTORE' });

    // 拼接走 offscreen(见 Task 12)
    const stitched = await stitchFrames(frames, dims);
    await captureAndEnqueue(stitched, tabId, 'fullpage');
  }

  /** 选区截图 */
  async function captureSelection(tabId: number): Promise<void> {
    // content script 画选框,返回 rect
    const rect = await chrome.tabs.sendMessage(tabId, { type: 'DRAW_SELECTION' }) as {
      x: number; y: number; w: number; h: number; dpr: number;
    } | null;
    if (!rect) return; // 用户取消

    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
    const cropped = await cropImage(dataUrl, rect);
    await captureAndEnqueue(cropped, tabId, 'selection');
  }

  return { captureVisible, captureFullPage, captureSelection };
}
```

> 注:`stitchFrames` 和 `cropImage` 在 Task 12(offscreen)实现后注入。本 task 先写编排逻辑,这两个函数的实现在 offscreen 任务里。

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 报错 `stitchFrames`/`cropImage` 未定义(预期,Task 11 补)—— 本 task 先放占位 import,Task 11 完成后消除。

先在文件顶部加占位(后续 Task 11 替换):
```ts
// 占位:Task 11(offscreen)实现后替换
async function stitchFrames(frames: string[], dims: { scrollHeight: number; viewportHeight: number }): Promise<string> {
  throw new Error('offscreen not implemented');
}
async function cropImage(dataUrl: string, rect: { x: number; y: number; w: number; h: number; dpr: number }): Promise<string> {
  throw new Error('offscreen not implemented');
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/background/capturer.ts
git commit -m "feat(ext): 截图捕获编排(可视/整页/选区)"
```

---

### Task 10: background/offscreen.ts — offscreen document 管理

**Files:**
- Create: `packages/mira-browser-extension/src/background/offscreen.ts`

**Interfaces:**
- Produces: `ensureOffscreen()`、`closeOffscreen()`、`stitchFrames(frames, dims)`、`cropImage(dataUrl, rect)`

- [ ] **Step 1: 实现 offscreen.ts**

Create `packages/mira-browser-extension/src/background/offscreen.ts`:

```ts
let offscreenReady = false;

const OFFSCREEN_URL = 'offscreen/index.html';

/**
 * 确保 offscreen document 已创建(MV3 service worker 无 DOM,需 offscreen 做 Canvas)
 */
export async function ensureOffscreen(): Promise<void> {
  if (offscreenReady) return;
  // 检查是否已存在
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['IMAGE_PROCESSING' as chrome.offscreen.Reason],
      justification: '截图拼接与裁剪需要 Canvas',
    });
  }
  offscreenReady = true;
}

export async function closeOffscreen(): Promise<void> {
  if (!offscreenReady) return;
  await chrome.offscreen.closeDocument();
  offscreenReady = false;
}

interface StitchMsg {
  type: 'STITCH';
  frames: string[];
  viewportHeight: number;
}

interface CropMsg {
  type: 'CROP';
  dataUrl: string;
  rect: { x: number; y: number; w: number; h: number; dpr: number };
}

type OffscreenMsg = StitchMsg | CropMsg;

async function sendToOffscreen(msg: OffscreenMsg): Promise<string> {
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage(msg);
  if (res?.error) throw new Error(res.error);
  return res.dataUrl as string;
}

/** 拼接多帧截图(整页) */
export async function stitchFrames(
  frames: string[],
  dims: { scrollHeight: number; viewportHeight: number },
): Promise<string> {
  return sendToOffscreen({
    type: 'STITCH',
    frames,
    viewportHeight: dims.viewportHeight,
  });
}

/** 裁剪图片(选区) */
export async function cropImage(
  dataUrl: string,
  rect: { x: number; y: number; w: number; h: number; dpr: number },
): Promise<string> {
  return sendToOffscreen({ type: 'CROP', dataUrl, rect });
}
```

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误(`chrome.offscreen` 类型来自 `@types/chrome`)。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/background/offscreen.ts
git commit -m "feat(ext): offscreen document 管理(图像处理通道)"
```

---

### Task 11: offscreen/image-ops.ts + offscreen 入口 — Canvas 拼接/裁剪(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/offscreen/image-ops.ts`
- Create: `packages/mira-browser-extension/src/offscreen/image-ops.test.ts`
- Create: `packages/mira-browser-extension/src/offscreen/index.html`
- Create: `packages/mira-browser-extension/src/offscreen/index.ts`

**Interfaces:**
- Consumes: Canvas API(jsdom 环境需 `canvas` polyfill 或用 happy-dom;此处用纯逻辑 + 真实 Canvas 测试)
- Produces: `stitch(frames, viewportHeight)`、`crop(dataUrl, rect)` 纯函数 + offscreen 消息入口

> **测试环境**:image-ops 用 Canvas,需 happy-dom 提供基本 Canvas。Vitest 默认 jsdom 不带 Canvas 实现。改用 `environment: 'happy-dom'` 仅对此文件,或用 `// @vitest-environment happy-dom` 注释。happy-dom 的 Canvas 是存根,真实绘制无法验证像素。**折中方案**:测试只验证返回值是 dataURL 字符串、函数不抛异常(集成验证靠手动)。纯逻辑(尺寸计算)抽成可测函数。

- [ ] **Step 1: 抽取纯逻辑尺寸计算 + 写测试**

Create `packages/mira-browser-extension/src/offscreen/image-ops.ts`:

```ts
/**
 * 计算拼接画布尺寸(纯逻辑,可测)
 */
export function computeStitchSize(frames: string[], viewportHeight: number): {
  width: number;
  height: number;
} {
  // 宽度取首帧(可视区域宽度);高度 = 视口高度 × (帧数-1) + 最后一帧实际高度
  // 简化:全部按 viewportHeight,最后一帧若不足会被裁剪逻辑处理
  return { width: 0, height: frames.length * viewportHeight };
}

/**
 * 计算裁剪目标矩形(乘以 devicePixelRatio)
 */
export function scaleRect(
  rect: { x: number; y: number; w: number; h: number; dpr: number },
): { sx: number; sy: number; sw: number; sh: number } {
  const { x, y, w, h, dpr } = rect;
  return { sx: x * dpr, sy: y * dpr, sw: w * dpr, sh: h * dpr };
}
```

Create `packages/mira-browser-extension/src/offscreen/image-ops.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeStitchSize, scaleRect } from './image-ops';

describe('image-ops', () => {
  it('computeStitchSize 高度 = 帧数 × 视口高度', () => {
    const size = computeStitchSize(['a', 'b', 'c'], 800);
    expect(size.height).toBe(2400);
  });

  it('scaleRect 按 dpr 缩放', () => {
    const r = scaleRect({ x: 10, y: 20, w: 100, h: 50, dpr: 2 });
    expect(r).toEqual({ sx: 20, sy: 40, sw: 200, sh: 100 });
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test src/offscreen/image-ops.test.ts
```
Expected: PASS。

- [ ] **Step 3: 实现 Canvas 拼接/裁剪 + offscreen 入口**

补充 `packages/mira-browser-extension/src/offscreen/image-ops.ts`(在纯函数后追加 Canvas 实现):

```ts
/**
 * 拼接多帧 dataURL(整页截图)
 */
export async function stitch(
  frames: string[],
  viewportHeight: number,
): Promise<string> {
  if (frames.length === 0) throw new Error('no frames');
  // 加载首帧确定宽度
  const first = await loadImage(frames[0]);
  const width = first.naturalWidth;
  const height = viewportHeight * frames.length * (first.naturalHeight / viewportHeight);
  // 用首帧实际高度作单位(处理 dpr)
  const frameHeight = first.naturalHeight;
  const canvas = new OffscreenCanvas(width, frameHeight * frames.length);
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < frames.length; i++) {
    const img = i === 0 ? first : await loadImage(frames[i]);
    ctx.drawImage(img, 0, i * frameHeight);
  }
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(blob);
}

/**
 * 裁剪图片(选区)
 */
export async function crop(
  dataUrl: string,
  rect: { x: number; y: number; w: number; h: number; dpr: number },
): Promise<string> {
  const img = await loadImage(dataUrl);
  const { sx, sy, sw, sh } = scaleRect(rect);
  const canvas = new OffscreenCanvas(rect.w * rect.dpr, rect.h * rect.dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, rect.w * rect.dpr, rect.h * rect.dpr);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(blob);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

Create `packages/mira-browser-extension/src/offscreen/index.html`:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Mira Offscreen</title></head>
<body>
  <script type="module" src="./index.ts"></script>
</body>
</html>
```

Create `packages/mira-browser-extension/src/offscreen/index.ts`:

```ts
import { stitch, crop } from './image-ops';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'STITCH') {
    stitch(msg.frames, msg.viewportHeight)
      .then(dataUrl => sendResponse({ dataUrl }))
      .catch(e => sendResponse({ error: e.message }));
    return true; // 异步响应
  }
  if (msg.type === 'CROP') {
    crop(msg.dataUrl, msg.rect)
      .then(dataUrl => sendResponse({ dataUrl }))
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
});
```

- [ ] **Step 4: 用 Task 10 的实现替换 Task 9 capturer 的占位**

> 注:Task 编号顺序——Task 9(capturer)→ Task 10(offscreen 管理)→ Task 11(offscreen 实现)。Task 9 写占位,Task 11 Step 4 替换占位为真实 import。

在 `packages/mira-browser-extension/src/background/capturer.ts` 顶部,删除占位 `stitchFrames`/`cropImage`,改为:

```ts
import { stitchFrames, cropImage } from './offscreen';
```

替换占位函数体为上述 import(删除文件底部两个占位 `async function`)。

- [ ] **Step 5: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git add packages/mira-browser-extension/src/offscreen/ \
  packages/mira-browser-extension/src/background/capturer.ts
git commit -m "feat(ext): offscreen Canvas 拼接/裁剪 + capturer 接入"
```

---

### Task 12: background/message-router.ts + index.ts — service worker 装配

**Files:**
- Create: `packages/mira-browser-extension/src/background/message-router.ts`
- Create: `packages/mira-browser-extension/src/background/index.ts`
- Create: `packages/mira-browser-extension/src/background/context-menus.ts`

**Interfaces:**
- Consumes: 所有 background 模块(settings/mira-client/uploader/capturer/offscreen)
- Produces: service worker 入口,`Request` → handler 路由,右键菜单,生命周期初始化

- [ ] **Step 1: 实现 message-router.ts**

Create `packages/mira-browser-extension/src/background/message-router.ts`:

```ts
import type { MiraClient } from 'mira-app-core';
import type { Request, Event } from '@/shared/messages';
import { isRequest } from '@/shared/messages';
import { getSettings, updateSettings } from './settings';
import { login, withAuth, logout } from './mira-client';
import { stagedToFile } from '@/shared/staged-file';
import type { Uploader } from './uploader';
import type { SniffedResource } from '@/shared/types';

export interface RouterDeps {
  uploader: Uploader;
  captureVisible: (tabId: number) => Promise<void>;
  captureFullPage: (tabId: number) => Promise<void>;
  captureSelection: (tabId: number) => Promise<void>;
  /** 读取某 tab 的嗅探快照(index.ts 维护的 Map 注入) */
  getSniffSnapshot: (tabId: number) => SniffedResource[];
}

export type RequestHandler = (req: Request, sender: chrome.runtime.MessageSender) => Promise<unknown>;

/** 广播 Event 给所有 listener(popup/side panel/content script) */
export function broadcast(event: Event): void {
  chrome.runtime.sendMessage(event).catch(() => {
    // 没有 listener 时会报错,忽略
  });
}

export function createRouter(deps: RouterDeps): RequestHandler {
  return async (req, sender) => {
    if (!isRequest(req)) return undefined;

    switch (req.type) {
      case 'AUTH_LOGIN': {
        await login(req.payload.username, req.payload.password);
        await updateSettings({
          username: req.payload.username,
          password: req.payload.password,
        });
        return { success: true };
      }
      case 'AUTH_VERIFY': {
        return withAuth(async (client: MiraClient) => {
          await client.auth().verify();
          return { authenticated: true };
        });
      }
      case 'CONFIG_GET':
        return getSettings();
      case 'CONFIG_SET':
        return updateSettings(req.payload);
      case 'LIB_LIST':
        return withAuth((client: MiraClient) => client.libraries().getAll());
      case 'FOLDER_LIST':
        return withAuth((client: MiraClient) => client.folders().getAll(req.payload.libraryId));
      case 'UPLOAD_FILES': {
        const settings = await getSettings();
        for (const staged of req.payload.files) {
          const file = stagedToFile(staged);
          deps.uploader.enqueue({
            file,
            libraryId: req.payload.libraryId || settings.libraryId,
            source: 'dragdrop',
            tags: req.payload.tags,
            folderId: req.payload.folderId,
          });
        }
        return { enqueued: req.payload.files.length };
      }
      case 'UPLOAD_FROM_URL': {
        const settings = await getSettings();
        // service worker fetch url → Blob → File(规避 content script CORS)
        const res = await fetch(req.payload.url);
        const blob = await res.blob();
        const filename = req.payload.url.split('/').pop() || `resource-${Date.now()}`;
        const file = new File([blob], filename, { type: blob.type });
        deps.uploader.enqueue({
          file,
          libraryId: req.payload.libraryId || settings.libraryId,
          source: 'sniffer',
        });
        return { enqueued: 1 };
      }
      case 'UPLOAD_STATUS':
        return deps.uploader.getQueue();
      case 'UPLOAD_CANCEL':
        deps.uploader.cancelTask(req.payload.id);
        return { success: true };
      case 'CAPTURE_VISIBLE':
        await deps.captureVisible(req.payload.tabId);
        return { success: true };
      case 'CAPTURE_FULLPAGE':
        await deps.captureFullPage(req.payload.tabId);
        return { success: true };
      case 'CAPTURE_SELECTION':
        await deps.captureSelection(req.payload.tabId);
        return { success: true };
      case 'SNIFFER_START':
        await chrome.tabs.sendMessage(req.payload.tabId, {
          type: 'SNIFFER_START',
          payload: { kinds: req.payload.kinds },
        });
        return { success: true };
      case 'SNIFFER_STOP':
        await chrome.tabs.sendMessage(req.payload.tabId, { type: 'SNIFFER_STOP' });
        return { success: true };
      case 'SNIFFER_QUERY': {
        // 从内存快照返回(getSniffSnapshot 由 index.ts 注入)
        return { resources: deps.getSniffSnapshot(req.payload.tabId) };
      }
      case 'AUTOSCROLL_START':
        await chrome.tabs.sendMessage(req.payload.tabId, {
          type: 'AUTOSCROLL_START',
          payload: { delay: (await getSettings()).autoScrollDelay },
        });
        return { success: true };
      case 'AUTOSCROLL_STOP':
        await chrome.tabs.sendMessage(req.payload.tabId, { type: 'AUTOSCROLL_STOP' });
        return { success: true };
      default:
        return undefined;
    }
  };
}
```

- [ ] **Step 2: 实现 context-menus.ts**

Create `packages/mira-browser-extension/src/background/context-menus.ts`:

```ts
export interface ContextMenuDeps {
  captureVisible: (tabId: number) => Promise<void>;
  captureFullPage: (tabId: number) => Promise<void>;
  captureSelection: (tabId: number) => Promise<void>;
  uploadImageUrl: (url: string) => Promise<void>;
}

export function setupContextMenus(deps: ContextMenuDeps): void {
  // 安装时创建菜单
  const menus: chrome.contextMenus.CreateProperties[] = [
    { id: 'mira-capture-visible', title: 'Mira · 截图可视区域', contexts: ['page', 'image'] },
    { id: 'mira-capture-fullpage', title: 'Mira · 整页截图', contexts: ['page'] },
    { id: 'mira-capture-selection', title: 'Mira · 选区截图', contexts: ['page'] },
    { id: 'separator', type: 'separator', contexts: ['image'] },
    { id: 'mira-upload-image', title: 'Mira · 上传此图片', contexts: ['image'] },
  ];
  // 清理旧的再建(chrome.runtime.onInstalled 时调用更佳)
  chrome.contextMenus.removeAll(() => {
    menus.forEach(m => chrome.contextMenus.create(m));
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;
    switch (info.menuItemId) {
      case 'mira-capture-visible': await deps.captureVisible(tab.id); break;
      case 'mira-capture-fullpage': await deps.captureFullPage(tab.id); break;
      case 'mira-capture-selection': await deps.captureSelection(tab.id); break;
      case 'mira-upload-image':
        if (info.srcUrl) await deps.uploadImageUrl(info.srcUrl);
        break;
    }
  });
}
```

- [ ] **Step 3: 实现 index.ts(service worker 入口,装配一切)**

Create `packages/mira-browser-extension/src/background/index.ts`:

```ts
import { initSettingsWatcher, getSettings, onSettingsChange } from './settings';
import { ensureClient, isAuthError } from './mira-client';
import { createUploader } from './uploader';
import { createCapturer } from './capturer';
import { createRouter, broadcast } from './message-router';
import { setupContextMenus } from './context-menus';
import { isRequest, isEvent } from '@/shared/messages';
import type { SniffedResource } from '@/shared/types';

// 嗅探快照:每 tab 最近一次资源
const sniffSnapshots = new Map<number, SniffedResource[]>();

// 上传函数:连接 SDK
async function uploadToServer(input: {
  file: File;
  libraryId: string;
  tags?: string[];
  folderId?: string;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}) {
  const client = await ensureClient();
  // MiraClient 的 files().upload 不直接暴露 onProgress,用 axios 拦截或扩展
  // 简化:MVP 先不带进度(进度从 SDK 增强),取消用 signal
  const res = await client.files().uploadFile(input.file, input.libraryId, {
    tags: input.tags,
    folderId: input.folderId,
  });
  return res.results?.[0] ?? { success: true, file: input.file.name };
}

const uploader = createUploader({ upload: uploadToServer });
const capturer = createCapturer({ uploader });
const router = createRouter({
  uploader,
  captureVisible: capturer.captureVisible,
  captureFullPage: capturer.captureFullPage,
  captureSelection: capturer.captureSelection,
  getSniffSnapshot: (tabId: number) => sniffSnapshots.get(tabId) ?? [],
});

// 上传进度 → 广播给 UI
uploader.onQueueChange(tasks => {
  for (const t of tasks) {
    broadcast({
      type: 'UPLOAD_PROGRESS',
      payload: { id: t.id, percent: t.percent, status: t.status },
    });
  }
});

// 消息路由:Request 由 router 处理,Event/content 的 SNIFFER_REPORT 由这里处理
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // content script 上报嗅探结果(内部消息,非 Request)
  if (msg?.type === 'SNIFFER_REPORT' && sender.tab?.id) {
    sniffSnapshots.set(sender.tab.id, msg.resources as SniffedResource[]);
    broadcast({
      type: 'SNIFFER_FOUND',
      payload: { tabId: sender.tab.id, resources: msg.resources },
    });
    sendResponse({ ok: true });
    return true;
  }
  if (isRequest(msg)) {
    router(msg as any, sender).then(
      result => sendResponse(result),
      err => {
        if (isAuthError(err) || err?.message === 'AUTH_EXPIRED') {
          broadcast({ type: 'AUTH_EXPIRED' });
        }
        sendResponse({ error: err?.message ?? String(err) });
      },
    );
    return true; // 异步响应
  }
  return false;
});

// 快捷键截图
chrome.commands?.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (command === 'capture-visible') await capturer.captureVisible(tab.id);
  if (command === 'capture-fullpage') await capturer.captureFullPage(tab.id);
  if (command === 'capture-selection') await capturer.captureSelection(tab.id);
});

// 右键菜单
setupContextMenus({
  captureVisible: capturer.captureVisible,
  captureFullPage: capturer.captureFullPage,
  captureSelection: capturer.captureSelection,
  uploadImageUrl: async url => {
    const settings = await getSettings();
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], url.split('/').pop() || 'image', { type: blob.type });
    uploader.enqueue({ file, libraryId: settings.libraryId, source: 'dragdrop' });
  },
});

// tab 关闭清理嗅探快照
chrome.tabs.onRemoved.addListener(tabId => {
  sniffSnapshots.delete(tabId);
});

// 设置变更 → uiMode 联动 side panel 行为
onSettingsChange(async settings => {
  if (settings.uiMode === 'sidePanel') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
  // sniffer / dragdrop 开关 → 通知当前 tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'DISPATCH_DRAGDROP',
      payload: { enabled: settings.dragPopoverEnabled },
    }).catch(() => {});
    chrome.tabs.sendMessage(tab.id, {
      type: settings.snifferEnabled ? 'SNIFFER_START' : 'SNIFFER_STOP',
      payload: settings.snifferEnabled ? { kinds: settings.snifferKinds } : undefined,
    }).catch(() => {});
  }
});

// 启动初始化
initSettingsWatcher();
getSettings().then(settings => {
  if (settings.uiMode === 'sidePanel') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

// 安装时初始化右键菜单
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus({
    captureVisible: capturer.captureVisible,
    captureFullPage: capturer.captureFullPage,
    captureSelection: capturer.captureSelection,
    uploadImageUrl: async url => {
      const settings = await getSettings();
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], url.split('/').pop() || 'image', { type: blob.type });
      uploader.enqueue({ file, libraryId: settings.libraryId, source: 'dragdrop' });
    },
  });
});
```

- [ ] **Step 4: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
git add packages/mira-browser-extension/src/background/message-router.ts \
  packages/mira-browser-extension/src/background/context-menus.ts \
  packages/mira-browser-extension/src/background/index.ts
git commit -m "feat(ext): service worker 装配(消息路由/右键/快捷键/生命周期)"
```

---

## Phase 3: Content Scripts

### Task 13: content/autoscroll.ts — 自动滚动执行器(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/content/autoscroll.ts`
- Create: `packages/mira-browser-extension/src/content/autoscroll.test.ts`

**Interfaces:**
- Produces: `createAutoScroller()` 工厂,返回 `{ start(opts), stop() }`,`MAX_SCROLL_FRAMES = 50`

**说明**:`AutoScroller` 依赖 `window` 滚动 API,测试用 jsdom mock `window.scrollBy`/`scrollY`/`innerHeight`/`scrollHeight` 验证循环逻辑(到底停止、帧数上限、AbortSignal 中断)。

- [ ] **Step 1: 写失败测试**

Create `packages/mira-browser-extension/src/content/autoscroll.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAutoScroller, MAX_SCROLL_FRAMES } from './autoscroll';

describe('autoscroll', () => {
  beforeEach(() => {
    // 模拟页面尺寸
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2400, configurable: true });
    let scrollY = 0;
    Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
    window.scrollBy = vi.fn((_, dy) => { scrollY += dy; });
    window.scrollTo = vi.fn((_, y) => { scrollY = y; });
  });

  it('MAX_SCROLL_FRAMES 为 50', () => {
    expect(MAX_SCROLL_FRAMES).toBe(50);
  });

  it('滚到底自动停止', async () => {
    const scroller = createAutoScroller();
    const arrives: number[] = [];
    await scroller.start({ step: 800, delay: 0, onArrive: y => arrives.push(y) });
    expect(arrives.length).toBeGreaterThan(0);
    // 2400 高度 / 800 步 = 3 次
    expect(arrives.length).toBeLessThanOrEqual(4);
  });

  it('AbortSignal 中断滚动', async () => {
    const controller = new AbortController();
    const scroller = createAutoScroller();
    const promise = scroller.start({ step: 800, delay: 0, signal: controller.signal });
    controller.abort();
    await expect(promise).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd packages/mira-browser-extension && pnpm test src/content/autoscroll.test.ts
```
Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 autoscroll.ts**

Create `packages/mira-browser-extension/src/content/autoscroll.ts`:

```ts
export const MAX_SCROLL_FRAMES = 50;

export interface AutoScrollOptions {
  /** 每次滚动像素 */
  step?: number;
  /** 滚动间隔(ms) */
  delay: number;
  /** 到位回调(截图模式用) */
  onArrive?: (y: number) => void | Promise<void>;
  /** 中断信号 */
  signal?: AbortSignal;
}

export interface AutoScroller {
  start(opts: AutoScrollOptions): Promise<void>;
  stop(): void;
}

export function createAutoScroller(): AutoScroller {
  let controller: AbortController | null = null;

  function waitForRepaint(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  async function start(opts: AutoScrollOptions): Promise<void> {
    controller = new AbortController();
    const signal = opts.signal ?? controller.signal;
    const step = opts.step ?? Math.floor(window.innerHeight * 0.9);

    for (let frame = 0; frame < MAX_SCROLL_FRAMES; frame++) {
      if (signal.aborted) return;
      const beforeY = window.scrollY;
      window.scrollBy(0, step);
      await waitForRepaint();
      if (opts.delay > 0) await new Promise(r => setTimeout(r, opts.delay));
      await opts.onArrive?.(window.scrollY);
      // 到底判定
      if (window.scrollY === beforeY) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1) return;
    }
  }

  function stop(): void {
    controller?.abort();
  }

  return { start, stop };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test src/content/autoscroll.test.ts
```
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/mira-browser-extension/src/content/autoscroll.ts \
  packages/mira-browser-extension/src/content/autoscroll.test.ts
git commit -m "feat(ext): 自动滚动执行器(到底停止/帧上限/中断,TDD)"
```

---

### Task 14: content/sniffer.ts — 资源嗅探(TDD)

**Files:**
- Create: `packages/mira-browser-extension/src/content/sniffer.ts`
- Create: `packages/mira-browser-extension/src/content/sniffer.test.ts`

**Interfaces:**
- Consumes: `SniffedResource`、`ResourceKind`(from Task 2)
- Produces: `createSniffer()`、`extractFromDOM(kinds)`、`mergeResources(existing, incoming)`、`isMediaInitiator(type)`、`dedupeByUrl(resources)`、url → id 工具

**说明**:DOM 提取、去重、合并是纯逻辑,可测。PerformanceObserver/MutationObserver 绑定在 `createSniffer` 里,依赖真实浏览器 API,用 jsdom mock 验证绑定/解绑。

- [ ] **Step 1: 写失败测试**

Create `packages/mira-browser-extension/src/content/sniffer.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { extractFromDOM, mergeResources, isMediaInitiator, urlToId } from './sniffer';

describe('sniffer', () => {
  it('urlToId 对相同 url 返回相同 id', () => {
    expect(urlToId('http://a.com/1.png')).toBe(urlToId('http://a.com/1.png'));
    expect(urlToId('http://a.com/1.png')).not.toBe(urlToId('http://a.com/2.png'));
  });

  it('extractFromDOM 提取 img 资源', () => {
    document.body.innerHTML = '<img src="http://a/1.png" width="100" height="50">';
    const resources = extractFromDOM(['image']);
    expect(resources).toHaveLength(1);
    expect(resources[0].url).toBe('http://a/1.png');
    expect(resources[0].kind).toBe('image');
  });

  it('extractFromDOM 过滤 data url', () => {
    document.body.innerHTML = '<img src="data:image/png;base64,abc">';
    expect(extractFromDOM(['image'])).toHaveLength(0);
  });

  it('extractFromDOM 过滤小尺寸图标', () => {
    const img = document.createElement('img');
    img.src = 'http://a/tiny.png';
    Object.defineProperty(img, 'naturalWidth', { value: 16 });
    Object.defineProperty(img, 'naturalHeight', { value: 16 });
    document.body.innerHTML = '';
    document.body.appendChild(img);
    expect(extractFromDOM(['image'])).toHaveLength(0);
  });

  it('extractFromDOM 提取 video 和 poster', () => {
    document.body.innerHTML = '<video src="http://a/v.mp4" poster="http://a/p.jpg"></video>';
    const resources = extractFromDOM(['video']);
    expect(resources).toHaveLength(1);
    expect(resources[0].url).toBe('http://a/v.mp4');
    expect(resources[0].poster).toBe('http://a/p.jpg');
  });

  it('extractFromDOM 提取 audio', () => {
    document.body.innerHTML = '<audio src="http://a/sound.mp3"></audio>';
    const resources = extractFromDOM(['audio']);
    expect(resources[0].kind).toBe('audio');
  });

  it('extractFromDOM 提取 background-image', () => {
    const div = document.createElement('div');
    div.style.backgroundImage = 'url(http://a/bg.png)';
    document.body.innerHTML = '';
    document.body.appendChild(div);
    const resources = extractFromDOM(['image']);
    expect(resources.some(r => r.url === 'http://a/bg.png')).toBe(true);
  });

  it('mergeResources 按 url 去重并累加 occurrences', () => {
    const existing = [{ id: '1', url: 'http://a/1.png', kind: 'image' as const, source: 'dom' as const, occurrences: 1, sniffedAt: 0 }];
    const incoming = [{ id: '1', url: 'http://a/1.png', kind: 'image' as const, source: 'perf' as const, occurrences: 1, sniffedAt: 1 }];
    const merged = mergeResources(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].occurrences).toBe(2);
  });

  it('isMediaInitiator 识别 img/video/audio', () => {
    expect(isMediaInitiator('img')).toBe(true);
    expect(isMediaInitiator('video')).toBe(true);
    expect(isMediaInitiator('audio')).toBe(true);
    expect(isMediaInitiator('fetch')).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd packages/mira-browser-extension && pnpm test src/content/sniffer.test.ts
```
Expected: FAIL,模块不存在。

- [ ] **Step 3: 实现 sniffer.ts**

Create `packages/mira-browser-extension/src/content/sniffer.ts`:

```ts
import type { SniffedResource, ResourceKind } from '@/shared/types';

const MIN_IMAGE_SIZE = 32; // 小于此尺寸过滤(图标/占位图)
const DATA_URL_RE = /^data:/i;

/** url → 稳定 id(简单 hash) */
export function urlToId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return 'r' + Math.abs(hash).toString(36);
}

export function isMediaInitiator(type: string): boolean {
  return type === 'img' || type === 'video' || type === 'audio';
}

/** 判断 mime 是否为指定 kind */
function inferKindFromMime(mime: string): ResourceKind | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

/**
 * 从 DOM 提取资源(纯逻辑,基于 document 全局)
 */
export function extractFromDOM(kinds: ResourceKind[]): SniffedResource[] {
  const result: SniffedResource[] = [];
  const now = Date.now();
  const want = (k: ResourceKind) => kinds.includes(k);

  // img
  if (want('image')) {
    document.querySelectorAll('img').forEach(img => {
      const src = img.currentSrc || img.src;
      if (!src || DATA_URL_RE.test(src)) return;
      const nw = (img as any).naturalWidth ?? img.width;
      const nh = (img as any).naturalHeight ?? img.height;
      if (nw && nh && nw < MIN_IMAGE_SIZE && nh < MIN_IMAGE_SIZE) return;
      // srcset 变体
      let variants: string[] | undefined;
      if (img.srcset) {
        variants = img.srcset.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
      }
      result.push({
        id: urlToId(src), url: src, kind: 'image', source: 'dom',
        width: nw || undefined, height: nh || undefined,
        variants, occurrences: 1, sniffedAt: now,
      });
    });

    // background-image
    document.querySelectorAll<HTMLElement>('[style*="background"], .bg-cover, .bg-contain').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      const match = /url\(["']?(.*?)["']?\)/.exec(bg);
      if (match && !DATA_URL_RE.test(match[1])) {
        result.push({
          id: urlToId(match[1]), url: match[1], kind: 'image', source: 'dom',
          occurrences: 1, sniffedAt: now,
        });
      }
    });
  }

  // video
  if (want('video')) {
    document.querySelectorAll('video').forEach(v => {
      const src = (v as HTMLVideoElement).currentSrc || v.src;
      if (!src || DATA_URL_RE.test(src)) return;
      result.push({
        id: urlToId(src), url: src, kind: 'video', source: 'dom',
        duration: isFinite(v.duration) ? v.duration : undefined,
        poster: v.poster || undefined,
        width: v.videoWidth || undefined, height: v.videoHeight || undefined,
        occurrences: 1, sniffedAt: now,
      });
    });
  }

  // audio
  if (want('audio')) {
    document.querySelectorAll('audio').forEach(a => {
      const src = (a as HTMLAudioElement).currentSrc || a.src;
      if (!src || DATA_URL_RE.test(src)) return;
      result.push({
        id: urlToId(src), url: src, kind: 'audio', source: 'dom',
        duration: isFinite(a.duration) ? a.duration : undefined,
        occurrences: 1, sniffedAt: now,
      });
    });
  }

  return dedupeByUrl(result);
}

/** 按 url 去重(同一次扫描内) */
export function dedupeByUrl(resources: SniffedResource[]): SniffedResource[] {
  const map = new Map<string, SniffedResource>();
  for (const r of resources) {
    const existing = map.get(r.id);
    if (existing) existing.occurrences++;
    else map.set(r.id, { ...r });
  }
  return [...map.values()];
}

/** 合并新旧资源(跨次扫描,累加 occurrences) */
export function mergeResources(
  existing: SniffedResource[],
  incoming: SniffedResource[],
): SniffedResource[] {
  const map = new Map(existing.map(r => [r.id, { ...r }]));
  for (const r of incoming) {
    const cur = map.get(r.id);
    if (cur) cur.occurrences += r.occurrences;
    else map.set(r.id, { ...r });
  }
  return [...map.values()];
}

export interface Sniffer {
  start(kinds: ResourceKind[]): void;
  stop(): void;
  getResources(): SniffedResource[];
}

/**
 * 创建嗅探器(DOM 扫描 + PerformanceObserver + MutationObserver)
 */
export function createSniffer(onUpdate: (resources: SniffedResource[]) => void): Sniffer {
  let resources: SniffedResource[] = [];
  let kinds: ResourceKind[] = ['image', 'audio', 'video'];
  let perfObs: PerformanceObserver | null = null;
  let mutObs: MutationObserver | null = null;
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  let reportTimer: ReturnType<typeof setTimeout> | null = null;

  function scan() {
    const fresh = extractFromDOM(kinds);
    resources = mergeResources(resources, fresh);
    scheduleReport();
  }

  function scheduleReport() {
    if (reportTimer) return;
    reportTimer = setTimeout(() => {
      reportTimer = null;
      onUpdate([...resources]);
    }, 500);
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 300);
  }

  return {
    start(k) {
      kinds = k;
      resources = [];
      scan();
      // PerformanceObserver:抓懒加载/动态资源
      try {
        perfObs = new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (!isMediaInitiator(e.initiatorType)) continue;
            const kind = e.initiatorType === 'img' ? 'image' : (e.initiatorType as ResourceKind);
            if (!kinds.includes(kind)) continue;
            if (DATA_URL_RE.test(e.name)) continue;
            const r: SniffedResource = {
              id: urlToId(e.name), url: e.name, kind, source: 'perf',
              occurrences: 1, sniffedAt: Date.now(),
            };
            resources = mergeResources(resources, [r]);
            scheduleReport();
          }
        });
        perfObs.observe({ entryTypes: ['resource'] });
      } catch { /* PerformanceObserver 不可用 */ }

      // MutationObserver:新节点触发增量扫描
      mutObs = new MutationObserver(() => scheduleScan());
      mutObs.observe(document.body, { childList: true, subtree: true });
    },
    stop() {
      perfObs?.disconnect();
      mutObs?.disconnect();
      if (scanTimer) clearTimeout(scanTimer);
      if (reportTimer) clearTimeout(reportTimer);
      perfObs = mutObs = null;
      scanTimer = reportTimer = null;
    },
    getResources() {
      return [...resources];
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test src/content/sniffer.test.ts
```
Expected: PASS(9 个测试全过)。

- [ ] **Step 5: Commit**

```bash
git add packages/mira-browser-extension/src/content/sniffer.ts \
  packages/mira-browser-extension/src/content/sniffer.test.ts
git commit -m "feat(ext): 资源嗅探(DOM+PerformanceObserver+MutationObserver,TDD)"
```

---

### Task 15: content/dragdrop.ts — 拖拽图片 popover

**Files:**
- Create: `packages/mira-browser-extension/src/content/dragdrop.ts`

**Interfaces:**
- Produces: `createDragDrop({ enabled, onUpload })` —— `onUpload(payload)` 由 content/index.ts 接到后发消息给 service worker

- [ ] **Step 1: 实现 dragdrop.ts**

Create `packages/mira-browser-extension/src/content/dragdrop.ts`:

```ts
export interface DragDropPayload {
  /** 已有 File(本地拖动文件) */
  file?: File;
  /** 或仅有 url(网页图片) */
  url?: string;
  kind: 'image' | 'video';
}

export interface DragDropHandlers {
  onUpload: (payload: DragDropPayload) => void;
}

export interface DragDropController {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

const POPOVER_Z = 2147483646; // 仅次于选区覆盖层

export function createDragDrop(handlers: DragDropHandlers): DragDropController {
  let enabled = true;
  let popover: HTMLDivElement | null = null;

  function onDragStart(e: DragEvent) {
    if (!enabled) return;
    const target = e.target as HTMLElement;
    const isImg = target?.tagName === 'IMG';
    const isVideo = target?.tagName === 'VIDEO';
    if (!isImg && !isVideo) return;
    showPopover(e.clientX, e.clientY, isVideo ? 'video' : 'image', target);
  }

  function onDragEnd() {
    hidePopover();
  }

  function showPopover(x: number, y: number, kind: 'image' | 'video', target: HTMLElement) {
    hidePopover();
    popover = document.createElement('div');
    popover.style.cssText = `
      position: fixed; left: ${x + 12}px; top: ${y}px; z-index: ${POPOVER_Z};
      background: #1a1a1a; color: #fff; padding: 8px 14px; border-radius: 8px;
      font: 13px system-ui; box-shadow: 0 4px 12px rgba(0,0,0,.3);
      cursor: copy; user-select: none; display: flex; align-items: center; gap: 6px;
    `;
    popover.textContent = `⬆ 上传到 Mira`;
    popover.addEventListener('dragover', ev => ev.preventDefault());
    popover.addEventListener('drop', ev => {
      ev.preventDefault();
      hidePopover();
      // 优先取 dataTransfer 里的 File
      const dtFile = ev.dataTransfer?.files?.[0];
      if (dtFile) {
        handlers.onUpload({ file: dtFile, kind });
        return;
      }
      // 否则取元素 src
      const url = (target as HTMLImageElement).currentSrc || (target as HTMLImageElement).src;
      if (url) handlers.onUpload({ url, kind });
    });
    document.documentElement.appendChild(popover);
  }

  function hidePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  // 捕获阶段,确保先于页面处理
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('dragend', onDragEnd, true);
  document.addEventListener('drop', onDragEnd, true);

  return {
    setEnabled(v) { enabled = v; if (!v) hidePopover(); },
    destroy() {
      hidePopover();
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('dragend', onDragEnd, true);
      document.removeEventListener('drop', onDragEnd, true);
    },
  };
}
```

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/content/dragdrop.ts
git commit -m "feat(ext): 拖拽图片 popover 快传按钮"
```

---

### Task 16: content/overlay/selection.ts — 选区截图覆盖层

**Files:**
- Create: `packages/mira-browser-extension/src/content/overlay/selection.ts`

**Interfaces:**
- Produces: `drawSelection(): Promise<{x,y,w,h,dpr} | null>`(null = 用户取消)

- [ ] **Step 1: 实现 selection.ts**

Create `packages/mira-browser-extension/src/content/overlay/selection.ts`:

```ts
export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
  dpr: number;
}

const OVERLAY_Z = 2147483647; // 最高

/**
 * 注入全屏遮罩 + 选框,用户拖拽框选,返回 rect
 * @returns rect,或 null(用户按 Esc 取消)
 */
export function drawSelection(): Promise<SelectionRect | null> {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: ${OVERLAY_Z};
      background: rgba(0,0,0,.4); cursor: crosshair;
    `;
    const box = document.createElement('div');
    box.style.cssText = `
      position: absolute; border: 2px dashed #4ade80;
      background: rgba(74,222,128,.1); pointer-events: none;
    `;
    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);

    let startX = 0, startY = 0, dragging = false;

    function cleanup() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    }
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('mousedown', (e: MouseEvent) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = startX + 'px';
      box.style.top = startY + 'px';
      box.style.width = '0px';
      box.style.height = '0px';
    });

    overlay.addEventListener('mousemove', (e: MouseEvent) => {
      if (!dragging) return;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.style.width = w + 'px';
      box.style.height = h + 'px';
    });

    overlay.addEventListener('mouseup', (e: MouseEvent) => {
      if (!dragging) return;
      dragging = false;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      cleanup();
      if (w < 4 || h < 4) {
        resolve(null); // 误点
        return;
      }
      resolve({ x, y, w, h, dpr: window.devicePixelRatio || 1 });
    });
  });
}
```

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/content/overlay/selection.ts
git commit -m "feat(ext): 选区截图覆盖层"
```

---

### Task 17: content/index.ts — content script 装配

**Files:**
- Create: `packages/mira-browser-extension/src/content/index.ts`

**Interfaces:**
- Consumes: 所有 content 模块(sniffer/dragdrop/autoscroll/selection)+ ContentCommand 路由
- Produces: content script 入口

- [ ] **Step 1: 实现 content/index.ts**

Create `packages/mira-browser-extension/src/content/index.ts`:

```ts
import { isContentCommand } from '@/shared/messages';
import { createSniffer } from './sniffer';
import { createDragDrop, type DragDropPayload } from './dragdrop';
import { createAutoScroller } from './autoscroll';
import { drawSelection } from './overlay/selection';
import type { ResourceKind } from '@/shared/types';

// 嗅探上报:发给 service worker(SNIFFER_REPORT)
const sniffer = createSniffer(resources => {
  chrome.runtime.sendMessage({ type: 'SNIFFER_REPORT', resources }).catch(() => {});
});

// 拖拽上传:发给 service worker
const dragdrop = createDragDrop({
  onUpload(payload: DragDropPayload) {
    if (payload.file) {
      // File 跨上下文序列化
      payload.file.arrayBuffer().then(buffer => {
        chrome.runtime.sendMessage({
          type: 'UPLOAD_FILES',
          payload: {
            files: [{ name: payload.file!.name, type: payload.file!.type, buffer }],
            libraryId: '', // service worker 用默认 libraryId
          },
        }).catch(() => {});
      });
    } else if (payload.url) {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_FROM_URL',
        payload: { url: payload.url, kind: payload.kind, libraryId: '' },
      }).catch(() => {});
    }
  },
});

const scroller = createAutoScroller();

// content script 内部消息:截图滚动控制(SCROLL_TO/SCROLL_RESTORE 由 capturer 发)
let restoreY = 0;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // ContentCommand(service worker → content)
  if (isContentCommand(msg)) {
    switch (msg.type) {
      case 'SNIFFER_START':
        sniffer.start(msg.payload.kinds);
        sendResponse({ ok: true });
        return true;
      case 'SNIFFER_STOP':
        sniffer.stop();
        sendResponse({ ok: true });
        return true;
      case 'DISPATCH_DRAGDROP':
        dragdrop.setEnabled(msg.payload.enabled);
        sendResponse({ ok: true });
        return true;
      case 'AUTOSCROLL_START':
        scroller.start({ delay: msg.payload.delay }).then(() => sendResponse({ done: true }));
        return true;
      case 'AUTOSCROLL_STOP':
        scroller.stop();
        sendResponse({ ok: true });
        return true;
      case 'START_SCROLL_CAPTURE':
        restoreY = window.scrollY;
        sendResponse({
          scrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
        });
        return true;
      case 'DRAW_SELECTION':
        drawSelection().then(rect => sendResponse(rect));
        return true;
    }
  }

  // 截图滚动内部命令(capturer 用 chrome.tabs.sendMessage 发)
  if (msg?.type === 'SCROLL_TO') {
    window.scrollTo(0, msg.payload.y);
    const done = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
    sendResponse({ done });
    return true;
  }
  if (msg?.type === 'SCROLL_RESTORE') {
    window.scrollTo(0, restoreY);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// 初始化:根据当前设置启用 dragdrop
chrome.runtime.sendMessage({ type: 'CONFIG_GET' }).then((settings: any) => {
  if (settings?.dragPopoverEnabled === false) dragdrop.setEnabled(false);
}).catch(() => {});
```

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/content/index.ts
git commit -m "feat(ext): content script 装配(ContentCommand 路由)"
```

---

## Phase 4: UI 层

### Task 18: vite.config.ts + manifest.ts + HTML 入口

**Files:**
- Create: `packages/mira-browser-extension/vite.config.ts`
- Create: `packages/mira-browser-extension/src/manifest.ts`
- Create: `packages/mira-browser-extension/src/ui/popup.html`
- Create: `packages/mira-browser-extension/src/ui/sidepanel.html`

- [ ] **Step 1: 实现 manifest.ts**

Create `packages/mira-browser-extension/src/manifest.ts`:

```ts
import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Mira 网页采集',
  version: pkg.version,
  description: '截图、拖拽上传、资源嗅探到 Mira 素材库',
  permissions: [
    'activeTab', 'tabs', 'storage', 'scripting',
    'contextMenus', 'sidePanel', 'offscreen', 'commands',
  ],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/ui/popup.html',
    default_title: 'Mira',
  },
  side_panel: {
    default_path: 'src/ui/sidepanel.html',
  },
  content_scripts: [{
    matches: ['<all_urls>'],
    js: ['src/content/index.ts'],
  }],
  commands: {
    'capture-visible': { description: '截图可视区域' },
    'capture-fullpage': { description: '整页截图' },
    'capture-selection': { description: '选区截图' },
  },
});
```

- [ ] **Step 2: 实现 vite.config.ts**

Create `packages/mira-browser-extension/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { crx } from '@crxjs/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { port: 5175 },
  },
});
```

- [ ] **Step 3: 创建 HTML 入口**

Create `packages/mira-browser-extension/src/ui/popup.html`:

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mira</title>
  <style>html,body{margin:0;padding:0;width:380px;}</style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

Create `packages/mira-browser-extension/src/ui/sidepanel.html`:

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mira 面板</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

> 注意:两个 HTML 共用 `main.ts`。`containerMode` 通过判断 `location.pathname` 含 `sidepanel` 来决定,popup/sidepanel 用同一个 main.ts。

- [ ] **Step 4: Commit**

```bash
git add packages/mira-browser-extension/vite.config.ts \
  packages/mira-browser-extension/src/manifest.ts \
  packages/mira-browser-extension/src/ui/popup.html \
  packages/mira-browser-extension/src/ui/sidepanel.html
git commit -m "feat(ext): vite 配置 + manifest + HTML 入口"
```

---

### Task 19: shadcn-vue 基础组件 + style.css

**Files:**
- Create: `packages/mira-browser-extension/src/ui/style.css`
- Create: `packages/mira-browser-extension/src/ui/components/ui/*`(button/input/tabs/select/switch/checkbox/card/progress/sonner —— 从 monorepo 现有组件复制适配)

> **说明**:shadcn-vue 组件基于 reka-ui + tailwind。本扩展用最小子集。为避免引入完整 tailwind 配置成本,采用 **内联样式的轻量自实现组件**(复刻 shadcn-vue 视觉但用 scoped CSS),而非完整 shadcn-vue 脚手架。这与 monorepo 的 `@/components/ui` 约定在视觉上一致,实现上更轻。若后续要严格对齐,可迁移到完整 shadcn-vue。

- [ ] **Step 1: 创建 style.css(基础变量 + reset)**

Create `packages/mira-browser-extension/src/ui/style.css`:

```css
:root {
  --bg: #0f0f10;
  --bg-elev: #1a1a1c;
  --fg: #fafafa;
  --muted: #a1a1aa;
  --border: #27272a;
  --primary: #4ade80;
  --primary-fg: #052e16;
  --danger: #ef4444;
  --radius: 8px;
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  background: var(--bg); color: var(--fg);
  font: 13px/1.5 system-ui, -apple-system, sans-serif;
}
#app { width: 100%; min-height: 100vh; }
```

- [ ] **Step 2: 创建基础 UI 组件**

Create `packages/mira-browser-extension/src/ui/components/ui/Button.vue`:

```vue
<script setup lang="ts">
defineProps<{ variant?: 'default' | 'outline' | 'ghost' | 'danger'; size?: 'sm' | 'md' }>();
</script>
<template>
  <button class="btn" :class="[variant ?? 'default', size ?? 'md']">
    <slot />
  </button>
</template>
<style scoped>
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid var(--border); border-radius: var(--radius);
  cursor: pointer; font: inherit; transition: background .15s;
  background: var(--bg-elev); color: var(--fg);
}
.btn.default { background: var(--primary); color: var(--primary-fg); border-color: var(--primary); }
.btn.outline { background: transparent; }
.btn.ghost { background: transparent; border-color: transparent; }
.btn.danger { background: var(--danger); color: #fff; border-color: var(--danger); }
.btn.sm { padding: 4px 8px; font-size: 12px; }
.btn.md { padding: 6px 12px; }
.btn:hover { opacity: .85; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
```

Create `packages/mira-browser-extension/src/ui/components/ui/Input.vue`:

```vue
<script setup lang="ts">
defineProps<{ modelValue?: string; type?: string; placeholder?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    class="input"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
<style scoped>
.input {
  width: 100%; padding: 6px 10px;
  background: var(--bg); color: var(--fg);
  border: 1px solid var(--border); border-radius: var(--radius);
  font: inherit;
}
.input:focus { outline: none; border-color: var(--primary); }
</style>
```

Create `packages/mira-browser-extension/src/ui/components/ui/Switch.vue`:

```vue
<script setup lang="ts">
defineProps<{ modelValue?: boolean }>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>
<template>
  <button
    class="switch"
    :class="{ on: modelValue }"
    @click="$emit('update:modelValue', !modelValue)"
  />
</template>
<style scoped>
.switch {
  width: 36px; height: 20px; border-radius: 999px;
  background: var(--border); border: none; cursor: pointer;
  position: relative; transition: background .15s;
}
.switch.on { background: var(--primary); }
.switch::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform .15s;
}
.switch.on::after { transform: translateX(16px); }
</style>
```

Create `packages/mira-browser-extension/src/ui/components/ui/Progress.vue`:

```vue
<script setup lang="ts">
defineProps<{ value: number }>(); // 0-100
</script>
<template>
  <div class="progress"><div class="bar" :style="{ width: value + '%' }" /></div>
</template>
<style scoped>
.progress { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.bar { height: 100%; background: var(--primary); transition: width .2s; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/ui/style.css \
  packages/mira-browser-extension/src/ui/components/ui/
git commit -m "feat(ext): UI 基础组件(Button/Input/Switch/Progress)+ 全局样式"
```

---

### Task 20: composables/useBackground.ts — UI 消息桥

**Files:**
- Create: `packages/mira-browser-extension/src/ui/composables/useBackground.ts`

**Interfaces:**
- Consumes: `Request`、`Event`(from Task 3)
- Produces: `useBackground()` → `{ login, verify, getSettings, setSettings, listLibraries, uploadFiles, uploadStatus, onUploadProgress, onSnifferFound, onAuthExpired, captureVisible, ... }`

- [ ] **Step 1: 实现 useBackground.ts**

Create `packages/mira-browser-extension/src/ui/composables/useBackground.ts`:

```ts
import type { Request, Event } from '@/shared/messages';
import type { ExtensionSettings, UploadTask, SniffedResource } from '@/shared/types';
import type { StagedFile } from '@/shared/types';

function send<T = any>(req: Request): Promise<T> {
  return chrome.runtime.sendMessage(req);
}

export function useBackground() {
  return {
    async login(username: string, password: string) {
      return send({ type: 'AUTH_LOGIN', payload: { username, password } });
    },
    async verify() {
      return send<{ authenticated: boolean }>({ type: 'AUTH_VERIFY' });
    },
    async getSettings() {
      return send<ExtensionSettings>({ type: 'CONFIG_GET' });
    },
    async setSettings(partial: Partial<ExtensionSettings>) {
      return send<ExtensionSettings>({ type: 'CONFIG_SET', payload: partial });
    },
    async listLibraries() {
      return send({ type: 'LIB_LIST' });
    },
    async listFolders(libraryId: string) {
      return send({ type: 'FOLDER_LIST', payload: { libraryId } });
    },
    async uploadFiles(files: StagedFile[], libraryId: string, tags?: string[], folderId?: string) {
      return send({ type: 'UPLOAD_FILES', payload: { files, libraryId, tags, folderId } });
    },
    async uploadStatus() {
      return send<UploadTask[]>({ type: 'UPLOAD_STATUS' });
    },
    async cancelUpload(id: string) {
      return send({ type: 'UPLOAD_CANCEL', payload: { id } });
    },
    async captureVisible(tabId: number) {
      return send({ type: 'CAPTURE_VISIBLE', payload: { tabId } });
    },
    async captureFullPage(tabId: number) {
      return send({ type: 'CAPTURE_FULLPAGE', payload: { tabId } });
    },
    async captureSelection(tabId: number) {
      return send({ type: 'CAPTURE_SELECTION', payload: { tabId } });
    },
    async snifferQuery(tabId: number) {
      return send<{ resources: SniffedResource[] }>({ type: 'SNIFFER_QUERY', payload: { tabId } });
    },
    onUploadProgress(cb: (p: { id: string; percent: number; status: string }) => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'UPLOAD_PROGRESS') cb(msg.payload);
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
    onSnifferFound(cb: (tabId: number, resources: SniffedResource[]) => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'SNIFFER_FOUND') cb(msg.payload.tabId, msg.payload.resources);
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
    onAuthExpired(cb: () => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'AUTH_EXPIRED') cb();
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
  };
}
```

- [ ] **Step 2: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/ui/composables/useBackground.ts
git commit -m "feat(ext): UI 消息桥(useBackground)"
```

---

### Task 21: composables — settings/connection/uploadQueue/sniffer

**Files:**
- Create: `packages/mira-browser-extension/src/ui/composables/useSettings.ts`
- Create: `packages/mira-browser-extension/src/ui/composables/useConnection.ts`
- Create: `packages/mira-browser-extension/src/ui/composables/useUploadQueue.ts`
- Create: `packages/mira-browser-extension/src/ui/composables/useSniffer.ts`

- [ ] **Step 1: 实现 useSettings.ts**

Create `packages/mira-browser-extension/src/ui/composables/useSettings.ts`:

```ts
import { ref } from 'vue';
import { useBackground } from './useBackground';
import type { ExtensionSettings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';

const settings = ref<ExtensionSettings>({ ...DEFAULT_SETTINGS });
const bg = useBackground();

export function useSettings() {
  async function load() {
    settings.value = await bg.getSettings();
  }
  async function update(partial: Partial<ExtensionSettings>) {
    settings.value = await bg.setSettings(partial);
  }
  return { settings, load, update };
}
```

- [ ] **Step 2: 实现 useConnection.ts**

Create `packages/mira-browser-extension/src/ui/composables/useConnection.ts`:

```ts
import { ref } from 'vue';
import { useBackground } from './useBackground';
import type { Library } from 'mira-app-core';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'failed';

const status = ref<ConnStatus>('idle');
const libraries = ref<Library[]>([]);
const bg = useBackground();

export function useConnection() {
  async function login(serverURL: string, username: string, password: string) {
    status.value = 'connecting';
    try {
      // 先保存 serverURL
      await bg.setSettings({ serverURL, username, password });
      await bg.login(username, password);
      status.value = 'connected';
      await refreshLibraries();
    } catch (e: any) {
      status.value = 'failed';
      throw e;
    }
  }
  async function refreshLibraries() {
    try {
      libraries.value = await bg.listLibraries();
    } catch {
      libraries.value = [];
    }
  }
  async function verify() {
    try {
      const r = await bg.verify();
      status.value = r.authenticated ? 'connected' : 'idle';
      if (status.value === 'connected') await refreshLibraries();
    } catch {
      status.value = 'idle';
    }
  }
  return { status, libraries, login, refreshLibraries, verify };
}
```

- [ ] **Step 3: 实现 useUploadQueue.ts**

Create `packages/mira-browser-extension/src/ui/composables/useUploadQueue.ts`:

```ts
import { ref, onUnmounted } from 'vue';
import { useBackground } from './useBackground';
import { fileToStaged } from '@/shared/staged-file';
import type { UploadTask } from '@/shared/types';

const tasks = ref<UploadTask[]>([]);
const bg = useBackground();

export function useUploadQueue() {
  async function load() {
    tasks.value = await bg.uploadStatus();
  }
  async function addFiles(files: File[], libraryId: string, tags?: string[], folderId?: string) {
    const staged = await Promise.all([...files].map(fileToStaged));
    await bg.uploadFiles(staged, libraryId, tags, folderId);
    await load();
  }
  async function cancel(id: string) {
    await bg.cancelUpload(id);
    await load();
  }

  // 监听进度
  const off = bg.onUploadProgress(p => {
    const idx = tasks.value.findIndex(t => t.id === p.id);
    if (idx >= 0) {
      tasks.value[idx] = { ...tasks.value[idx], percent: p.percent, status: p.status as any };
    } else {
      // 新任务
      load();
    }
  });
  onUnmounted(off);

  return { tasks, load, addFiles, cancel };
}
```

- [ ] **Step 4: 实现 useSniffer.ts**

Create `packages/mira-browser-extension/src/ui/composables/useSniffer.ts`:

```ts
import { ref, onUnmounted } from 'vue';
import { useBackground } from './useBackground';
import type { SniffedResource } from '@/shared/types';

const resources = ref<SniffedResource[]>([]);
const bg = useBackground();

export function useSniffer(currentTabId: () => number) {
  async function load() {
    const r = await bg.snifferQuery(currentTabId());
    resources.value = r.resources;
  }
  async function start() {
    // 通过 setSettings 触发 service worker → content script
    await bg.setSettings({ snifferEnabled: true });
  }
  async function stop() {
    await bg.setSettings({ snifferEnabled: false });
  }

  const off = bg.onSnifferFound((tabId, res) => {
    if (tabId === currentTabId()) resources.value = res;
  });
  onUnmounted(off);

  return { resources, load, start, stop };
}
```

- [ ] **Step 5: 类型检查通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm exec tsc --noEmit
```
Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git add packages/mira-browser-extension/src/ui/composables/useSettings.ts \
  packages/mira-browser-extension/src/ui/composables/useConnection.ts \
  packages/mira-browser-extension/src/ui/composables/useUploadQueue.ts \
  packages/mira-browser-extension/src/ui/composables/useSniffer.ts
git commit -m "feat(ext): UI composables(settings/connection/uploadQueue/sniffer)"
```

---

### Task 22: 组件 — ConnectionForm / GlobalHeader / TabBar

**Files:**
- Create: `packages/mira-browser-extension/src/ui/components/ConnectionForm.vue`
- Create: `packages/mira-browser-extension/src/ui/components/GlobalHeader.vue`
- Create: `packages/mira-browser-extension/src/ui/components/TabBar.vue`

- [ ] **Step 1: 实现 ConnectionForm.vue**

Create `packages/mira-browser-extension/src/ui/components/ConnectionForm.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';

const emit = defineEmits<{ connected: [] }>();
const { login } = useConnection();
const { update } = useSettings();

const serverURL = ref('http://localhost:8081');
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(serverURL.value, username.value, password.value);
    await update({ libraryId: '' }); // 触发后续默认选库
    emit('connected');
  } catch (e: any) {
    error.value = e?.message ?? '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="form">
    <h2>Mira 连接</h2>
    <label>服务器地址</label>
    <Input v-model="serverURL" placeholder="http://localhost:8081" />
    <label>用户名</label>
    <Input v-model="username" placeholder="用户名" />
    <label>密码</label>
    <Input v-model="password" type="password" placeholder="密码" />
    <p v-if="error" class="err">{{ error }}</p>
    <Button :disabled="loading" @click="submit">
      {{ loading ? '连接中...' : '连接' }}
    </Button>
  </div>
</template>

<style scoped>
.form { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
h2 { margin: 0 0 8px; font-size: 16px; }
label { font-size: 12px; color: var(--muted); margin-top: 6px; }
.err { color: var(--danger); font-size: 12px; margin: 4px 0; }
</style>
```

- [ ] **Step 2: 实现 GlobalHeader.vue**

Create `packages/mira-browser-extension/src/ui/components/GlobalHeader.vue`:

```vue
<script setup lang="ts">
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import { computed } from 'vue';

const { status, libraries } = useConnection();
const { settings, update } = useSettings();

const statusColor = computed(() => ({
  idle: '#71717a', connecting: '#eab308', connected: '#4ade80', failed: '#ef4444',
}[status.value]));

async function onLibChange(e: Event) {
  const libraryId = (e.target as HTMLSelectElement).value;
  await update({ libraryId });
}
</script>

<template>
  <div class="header">
    <span class="dot" :style="{ background: statusColor }" />
    <select class="lib" :value="settings.libraryId" @change="onLibChange">
      <option value="" disabled>选择素材库</option>
      <option v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option>
    </select>
  </div>
</template>

<style scoped>
.header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lib { flex: 1; background: transparent; color: var(--fg); border: none; font: inherit; }
.lib option { background: var(--bg-elev); }
</style>
```

- [ ] **Step 3: 实现 TabBar.vue**

Create `packages/mira-browser-extension/src/ui/components/TabBar.vue`:

```vue
<script setup lang="ts">
defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();
const tabs = [
  { id: 'upload', label: '上传' },
  { id: 'screenshot', label: '截图' },
  { id: 'sniffer', label: '嗅探' },
  { id: 'settings', label: '设置' },
];
</script>

<template>
  <div class="tabs">
    <button
      v-for="t in tabs" :key="t.id"
      class="tab" :class="{ active: modelValue === t.id }"
      @click="emit('update:modelValue', t.id)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
.tabs { display: flex; border-bottom: 1px solid var(--border); }
.tab { flex: 1; padding: 8px; background: transparent; border: none; color: var(--muted); cursor: pointer; font: inherit; border-bottom: 2px solid transparent; }
.tab.active { color: var(--fg); border-bottom-color: var(--primary); }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add packages/mira-browser-extension/src/ui/components/ConnectionForm.vue \
  packages/mira-browser-extension/src/ui/components/GlobalHeader.vue \
  packages/mira-browser-extension/src/ui/components/TabBar.vue
git commit -m "feat(ext): UI 组件(ConnectionForm/GlobalHeader/TabBar)"
```

---

### Task 23: 组件 — 上传页签(Dropzone/UploadQueue/UploadItem)

**Files:**
- Create: `packages/mira-browser-extension/src/ui/components/upload/Dropzone.vue`
- Create: `packages/mira-browser-extension/src/ui/components/upload/UploadItem.vue`
- Create: `packages/mira-browser-extension/src/ui/components/upload/UploadQueue.vue`
- Create: `packages/mira-browser-extension/src/ui/components/upload/UploadView.vue`

- [ ] **Step 1: 实现 Dropzone.vue**

Create `packages/mira-browser-extension/src/ui/components/upload/Dropzone.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
const emit = defineEmits<{ drop: [files: File[]] }>();
const hovering = ref(false);
function onDrop(e: DragEvent) {
  hovering.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []);
  if (files.length) emit('drop', files);
}
</script>

<template>
  <div
    class="zone" :class="{ hover: hovering }"
    @dragover.prevent="hovering = true"
    @dragleave="hovering = false"
    @drop.prevent="onDrop"
  >
    拖放文件到此处上传
  </div>
</template>

<style scoped>
.zone { padding: 24px; border: 2px dashed var(--border); border-radius: var(--radius); text-align: center; color: var(--muted); margin: 12px; transition: border-color .15s; }
.zone.hover { border-color: var(--primary); color: var(--fg); }
</style>
```

- [ ] **Step 2: 实现 UploadItem.vue**

Create `packages/mira-browser-extension/src/ui/components/upload/UploadItem.vue`:

```vue
<script setup lang="ts">
import type { UploadTask } from '@/shared/types';
import Progress from '@/ui/components/ui/Progress.vue';
import Button from '@/ui/components/ui/Button.vue';
defineProps<{ task: UploadTask }>();
defineEmits<{ cancel: []; retry: [] }>();
</script>

<template>
  <div class="item">
    <div class="info">
      <span class="name">{{ task.file.name }}</span>
      <span class="size">{{ Math.round(task.file.size / 1024) }}KB</span>
    </div>
    <Progress v-if="task.status === 'uploading'" :value="task.percent" />
    <div class="status">
      <span :class="task.status">
        {{ { queued: '排队', uploading: `${task.percent}%`, success: '完成', failed: task.error ?? '失败' }[task.status] }}
      </span>
      <Button v-if="task.status === 'uploading'" size="sm" variant="ghost" @click="$emit('cancel')">取消</Button>
      <Button v-if="task.status === 'failed'" size="sm" variant="ghost" @click="$emit('retry')">重试</Button>
    </div>
  </div>
</template>

<style scoped>
.item { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.info { display: flex; justify-content: space-between; }
.name { font-size: 12px; }
.size { font-size: 11px; color: var(--muted); }
.status { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 11px; }
.success { color: var(--primary); } .failed { color: var(--danger); } .queued { color: var(--muted); }
</style>
```

- [ ] **Step 3: 实现 UploadQueue.vue + UploadView.vue**

Create `packages/mira-browser-extension/src/ui/components/upload/UploadQueue.vue`:

```vue
<script setup lang="ts">
import type { UploadTask } from '@/shared/types';
import UploadItem from './UploadItem.vue';
defineProps<{ tasks: UploadTask[] }>();
defineEmits<{ cancel: [id: string]; retry: [id: string] }>();
</script>

<template>
  <div class="queue">
    <UploadItem
      v-for="t in tasks" :key="t.id" :task="t"
      @cancel="$emit('cancel', t.id)" @retry="$emit('retry', t.id)"
    />
    <p v-if="!tasks.length" class="empty">暂无上传任务</p>
  </div>
</template>

<style scoped>
.queue { flex: 1; overflow-y: auto; }
.empty { text-align: center; color: var(--muted); padding: 24px; }
</style>
```

Create `packages/mira-browser-extension/src/ui/components/upload/UploadView.vue`:

```vue
<script setup lang="ts">
import { useUploadQueue } from '@/ui/composables/useUploadQueue';
import { useSettings } from '@/ui/composables/useSettings';
import Dropzone from './Dropzone.vue';
import UploadQueue from './UploadQueue.vue';

const { tasks, load, addFiles, cancel } = useUploadQueue();
const { settings } = useSettings();
load();

function onDrop(files: File[]) {
  addFiles(files, settings.value.libraryId, settings.value.tags, settings.value.folderId);
}
</script>

<template>
  <div class="view">
    <Dropzone v-if="settings.dropZoneEnabled" @drop="onDrop" />
    <UploadQueue :tasks="tasks" @cancel="cancel" @retry="load" />
  </div>
</template>

<style scoped>
.view { display: flex; flex-direction: column; height: 100%; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add packages/mira-browser-extension/src/ui/components/upload/
git commit -m "feat(ext): 上传页签(Dropzone/Queue/Item/View)"
```

---

### Task 24: 组件 — 截图页签 / 嗅探页签 / 设置页签

**Files:**
- Create: `packages/mira-browser-extension/src/ui/components/screenshot/ScreenshotView.vue`
- Create: `packages/mira-browser-extension/src/ui/components/sniffer/ResourceItem.vue`
- Create: `packages/mira-browser-extension/src/ui/components/sniffer/ResourceList.vue`
- Create: `packages/mira-browser-extension/src/ui/components/sniffer/SnifferView.vue`
- Create: `packages/mira-browser-extension/src/ui/components/settings/SettingsView.vue`

- [ ] **Step 1: 实现 ScreenshotView.vue**

Create `packages/mira-browser-extension/src/ui/components/screenshot/ScreenshotView.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useBackground } from '@/ui/composables/useBackground';
import Button from '@/ui/components/ui/Button.vue';

const bg = useBackground();
const msg = ref('');

async function run(fn: (tabId: number) => Promise<any>, label: string) {
  msg.value = `${label}中...`;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { msg.value = '未找到活动标签页'; return; }
  try {
    await fn(tab.id);
    msg.value = `${label}完成,已加入上传队列`;
  } catch (e: any) {
    msg.value = e?.message ?? `${label}失败`;
  }
}
</script>

<template>
  <div class="view">
    <Button @click="run(bg.captureVisible, '可视区域截图')">可视区域截图</Button>
    <Button @click="run(bg.captureFullPage, '整页截图')">整页截图</Button>
    <Button @click="run(bg.captureSelection, '选区截图')">选区截图</Button>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<style scoped>
.view { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.msg { color: var(--muted); font-size: 12px; margin-top: 8px; }
</style>
```

- [ ] **Step 2: 实现 SnifferView.vue + ResourceList + ResourceItem**

Create `packages/mira-browser-extension/src/ui/components/sniffer/ResourceItem.vue`:

```vue
<script setup lang="ts">
import type { SniffedResource } from '@/shared/types';
defineProps<{ resource: SniffedResource; selected: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="item" @click="$emit('toggle')">
    <input type="checkbox" :checked="selected" @click.stop="$emit('toggle')" />
    <img v-if="resource.kind === 'image'" :src="resource.url" class="thumb" loading="lazy" />
    <img v-else-if="resource.kind === 'video' && resource.poster" :src="resource.poster" class="thumb" loading="lazy" />
    <div v-else class="thumb icon">{{ resource.kind === 'audio' ? '🎵' : '🎬' }}</div>
    <div class="meta">
      <div class="url">{{ resource.url.split('/').pop() }}</div>
      <div class="dim">{{ resource.width }}×{{ resource.height }} · ×{{ resource.occurrences }}</div>
    </div>
  </div>
</template>

<style scoped>
.item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; background: var(--bg-elev); }
.thumb.icon { display: flex; align-items: center; justify-content: center; font-size: 20px; }
.meta { flex: 1; overflow: hidden; }
.url { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dim { font-size: 11px; color: var(--muted); }
</style>
```

Create `packages/mira-browser-extension/src/ui/components/sniffer/ResourceList.vue`:

```vue
<script setup lang="ts">
import type { SniffedResource } from '@/shared/types';
import ResourceItem from './ResourceItem.vue';
defineProps<{ resources: SniffedResource[]; selected: Set<string> }>();
defineEmits<{ toggle: [id: string] }>();
</script>

<template>
  <div class="list">
    <ResourceItem
      v-for="r in resources" :key="r.id" :resource="r"
      :selected="selected.has(r.id)" @toggle="$emit('toggle', r.id)"
    />
  </div>
</template>

<style scoped>
.list { flex: 1; overflow-y: auto; }
</style>
```

Create `packages/mira-browser-extension/src/ui/components/sniffer/SnifferView.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBackground } from '@/ui/composables/useBackground';
import { useSniffer } from '@/ui/composables/useSniffer';
import { useSettings } from '@/ui/composables/useSettings';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import ResourceList from './ResourceList.vue';

const bg = useBackground();
const { settings, update } = useSettings();
// 当前 tab id(同步缓存,挂载时取一次)
const tabIdRef = ref(0);
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => { tabIdRef.value = t?.id ?? 0; });
const { resources, load, start, stop } = useSniffer(() => tabIdRef.value);

const selected = ref(new Set<string>());
function toggle(id: string) {
  const s = new Set(selected.value);
  s.has(id) ? s.delete(id) : s.add(id);
  selected.value = s;
}

async function onToggle(on: boolean) {
  await update({ snifferEnabled: on });
  on ? await start() : await stop();
  if (on) load();
}

async function uploadSelected() {
  const targets = resources.value.filter(r => selected.value.has(r.id));
  for (const r of targets) {
    // 资源上传走 UPLOAD_FROM_URL(service worker fetch → File → 队列)
    chrome.runtime.sendMessage({
      type: 'UPLOAD_FROM_URL',
      payload: { url: r.url, kind: r.kind, libraryId: settings.value.libraryId },
    });
  }
  selected.value.clear();
}
</script>

<template>
  <div class="view">
    <div class="bar">
      <label>资源嗅探</label>
      <Switch :model-value="settings.snifferEnabled" @update:model-value="onToggle" />
    </div>
    <ResourceList :resources="resources" :selected="selected" @toggle="toggle" />
    <Button v-if="selected.size" @click="uploadSelected">上传选中 ({{ selected.size }})</Button>
  </div>
</template>

<style scoped>
.view { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.bar label { flex: 1; }
</style>
```

- [ ] **Step 3: 实现 SettingsView.vue**

Create `packages/mira-browser-extension/src/ui/components/settings/SettingsView.vue`:

```vue
<script setup lang="ts">
import { useSettings } from '@/ui/composables/useSettings';
import Input from '@/ui/components/ui/Input.vue';
import Switch from '@/ui/components/ui/Switch.vue';

const { settings, update } = useSettings();
</script>

<template>
  <div class="view">
    <section>
      <h3>目标</h3>
      <label>默认标签(逗号分隔)</label>
      <Input
        :model-value="settings.tags.join(',')"
        @update:model-value="v => update({ tags: v.split(',').map(s => s.trim()).filter(Boolean) })"
      />
    </section>
    <section>
      <h3>界面</h3>
      <div class="row">
        <span>UI 模式</span>
        <select :value="settings.uiMode" @change="e => update({ uiMode: (e.target as HTMLSelectElement).value as any })">
          <option value="popup">Popup</option>
          <option value="sidePanel">侧边栏</option>
        </select>
      </div>
      <div class="row"><span>拖拽快传按钮</span><Switch :model-value="settings.dragPopoverEnabled" @update:model-value="v => update({ dragPopoverEnabled: v })" /></div>
      <div class="row"><span>面板拖放区</span><Switch :model-value="settings.dropZoneEnabled" @update:model-value="v => update({ dropZoneEnabled: v })" /></div>
    </section>
    <section>
      <h3>采集</h3>
      <div class="row"><span>资源嗅探</span><Switch :model-value="settings.snifferEnabled" @update:model-value="v => update({ snifferEnabled: v })" /></div>
      <div class="row"><span>自动滚动</span><Switch :model-value="settings.autoScrollEnabled" @update:model-value="v => update({ autoScrollEnabled: v })" /></div>
      <div class="row">
        <span>滚动间隔(ms)</span>
        <Input
          type="number" :model-value="String(settings.autoScrollDelay)"
          @update:model-value="v => update({ autoScrollDelay: Number(v) || 800 })"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.view { padding: 12px; }
section { margin-bottom: 16px; }
h3 { margin: 0 0 8px; font-size: 13px; color: var(--muted); text-transform: uppercase; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
label { font-size: 12px; color: var(--muted); display: block; margin: 6px 0 2px; }
select { background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add packages/mira-browser-extension/src/ui/components/screenshot/ \
  packages/mira-browser-extension/src/ui/components/sniffer/ \
  packages/mira-browser-extension/src/ui/components/settings/
git commit -m "feat(ext): 截图/嗅探/设置页签组件"
```

---

### Task 25: App.vue + main.ts — 装配主界面

**Files:**
- Create: `packages/mira-browser-extension/src/ui/App.vue`
- Create: `packages/mira-browser-extension/src/ui/main.ts`

- [ ] **Step 1: 实现 App.vue**

Create `packages/mira-browser-extension/src/ui/App.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useConnection } from '@/ui/composables/useConnection';
import { useBackground } from '@/ui/composables/useBackground';
import ConnectionForm from '@/ui/components/ConnectionForm.vue';
import GlobalHeader from '@/ui/components/GlobalHeader.vue';
import TabBar from '@/ui/components/TabBar.vue';
import UploadView from '@/ui/components/upload/UploadView.vue';
import ScreenshotView from '@/ui/components/screenshot/ScreenshotView.vue';
import SnifferView from '@/ui/components/sniffer/SnifferView.vue';
import SettingsView from '@/ui/components/settings/SettingsView.vue';

const props = defineProps<{ containerMode: 'popup' | 'sidePanel' }>();
const { status, verify, libraries } = useConnection();
const bg = useBackground();
const activeTab = ref('upload');

const authenticated = computed(() => status.value === 'connected');

onMounted(async () => {
  await verify();
  // 监听认证过期 → 切回登录
  bg.onAuthExpired(() => { status.value = 'idle'; });
});

function onConnected() {
  status.value = 'connected';
}
</script>

<template>
  <div class="app" :class="containerMode">
    <ConnectionForm v-if="!authenticated" @connected="onConnected" />
    <template v-else>
      <GlobalHeader />
      <TabBar v-model="activeTab" />
      <div class="content">
        <UploadView v-if="activeTab === 'upload'" />
        <ScreenshotView v-else-if="activeTab === 'screenshot'" />
        <SnifferView v-else-if="activeTab === 'sniffer'" />
        <SettingsView v-else-if="activeTab === 'settings'" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; background: var(--bg); }
.app.popup { width: 380px; max-height: 600px; }
.content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
</style>
```

- [ ] **Step 2: 实现 main.ts**

Create `packages/mira-browser-extension/src/ui/main.ts`:

```ts
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// 根据入口 HTML 决定 containerMode
const containerMode = location.pathname.includes('sidepanel') ? 'sidePanel' : 'popup';

createApp(App, { containerMode }).mount('#app');
```

- [ ] **Step 3: Commit**

```bash
git add packages/mira-browser-extension/src/ui/App.vue \
  packages/mira-browser-extension/src/ui/main.ts
git commit -m "feat(ext): App.vue 主界面装配 + main.ts 入口"
```

---

## Phase 5: 集成与验证

### Task 26: 图标占位 + 构建验证

**Files:**
- Create: `packages/mira-browser-extension/icons/icon16.png`、`icon48.png`、`icon128.png`(占位)
- Modify: `packages/mira-browser-extension/src/manifest.ts`(补 `icons` / `action.default_icon`)

- [ ] **Step 1: 生成占位图标**

用任意方式生成 3 个尺寸的 png 占位(纯色方块即可,后续替换)。或用 imagemagick:

```bash
cd packages/mira-browser-extension/icons
for size in 16 48 128; do
  # 用 node 生成纯色 png 占位
  node -e "
const fs=require('fs');
// 最小 PNG: 1x1 绿色像素,Chrome 会缩放
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
fs.writeFileSync('icon${size}.png',png);
"
done
```

- [ ] **Step 2: manifest.ts 补 icons**

在 `packages/mira-browser-extension/src/manifest.ts` 的 `defineManifest` 内追加:

```ts
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  action: {
    default_popup: 'src/ui/popup.html',
    default_title: 'Mira',
    default_icon: { '16': 'icons/icon16.png', '48': 'icons/icon48.png' },
  },
```

(替换原 `action` 块)

- [ ] **Step 3: 类型检查**

Run:
```bash
cd packages/mira-browser-extension && pnpm type-check
```
Expected: 无错误。

- [ ] **Step 4: 构建验证**

Run:
```bash
cd packages/mira-browser-extension && pnpm build
```
Expected:
- `dist/` 目录生成
- 含 `manifest.json`、`service-worker-loader.js`、`content-scripts/`、`src/ui/popup.html`、`src/ui/sidepanel.html`、`icons/`
- 无构建错误

检查产物:
```bash
ls dist/
cat dist/manifest.json | head -20
```

- [ ] **Step 5: 全部测试通过**

Run:
```bash
cd packages/mira-browser-extension && pnpm test
```
Expected: 所有测试 PASS。

- [ ] **Step 6: Commit**

```bash
git add packages/mira-browser-extension/icons/ \
  packages/mira-browser-extension/src/manifest.ts
git commit -m "feat(ext): 图标占位 + manifest 补全 + 构建验证通过"
```

---

### Task 27: 手动验证清单 + README 完善

**Files:**
- Modify: `packages/mira-browser-extension/README.md`

**说明**:Chrome API 和 UI 无法自动化测试,用手动验证清单确保功能正确。此 task 无代码测试,是验收 gate。

- [ ] **Step 1: 加载扩展**

```
1. cd packages/mira-browser-extension && pnpm build
2. 打开 chrome://extensions
3. 开启"开发者模式"
4. 点"加载已解压的扩展程序",选 dist/ 目录
5. 扩展出现在列表,无错误
```

- [ ] **Step 2: 验证清单(逐项确认)**

将以下清单加入 README,逐项手动验证:

```markdown
## 手动验证清单

### 连接
- [ ] 点图标 → popup 出现 → 显示连接表单
- [ ] 输入服务器地址 + 账密 → 连接 → 状态灯变绿 → 出现素材库下拉
- [ ] 错误账密 → 显示错误信息,不崩溃

### 上传
- [ ] 拖文件到拖放区 → 进入队列 → 上传成功 → 10s 后移除
- [ ] 网页拖起图片 → 出现"上传到 Mira"按钮 → 拖到按钮 → 上传
- [ ] 右键图片 → "Mira · 上传此图片" → 上传
- [ ] 上传中取消 → 任务停止

### 截图
- [ ] 可视区域截图 → 上传队列出现 screenshot-xxx.png
- [ ] 整页截图 → 滚动后上传拼接图(fixed 元素重复为已知限制)
- [ ] 选区截图 → 框选后上传裁剪图;Esc 取消
- [ ] chrome:// 页截图 → 提示不支持

### 嗅探
- [ ] 开启嗅探 → 资源列表出现图片/视频/音频
- [ ] 多选 → "上传选中" → 队列出现
- [ ] 关闭嗅探 → 列表不再增长

### 自动滚动
- [ ] 开启自动滚动 → 页面自动滚到底 → 停止
- [ ] 无限流页面 → 滚到 50 屏上限停止

### 设置
- [ ] 切换 UI 模式 → side panel / popup 生效
- [ ] 改默认标签 → 上传的文件带标签
- [ ] 关闭拖拽按钮 → 页面拖图不弹 popover
```

- [ ] **Step 3: 最终提交**

```bash
git add packages/mira-browser-extension/README.md
git commit -m "docs(ext): 手动验证清单 + README 完善"
```

---

## 验证计划完整性

所有 8 个 spec 章节(共 14 节)的覆盖情况:

| Spec 节 | 覆盖 Task |
|---------|-----------|
| §1-2 目标与决策 | Global Constraints |
| §3-4 架构与包结构 | Task 1(脚手架)+ Global Constraints |
| §5 消息总线 | Task 3(messages)+ Task 12(router)+ Task 17(content 装配) |
| §6 设置与存储 | Task 2(types)+ Task 5(storage)+ Task 6(bg settings)+ Task 21(useSettings)+ Task 24(SettingsView) |
| §7 截图子系统 | Task 9(capturer)+ Task 10(offscreen mgmt)+ Task 11(image-ops)+ Task 16(selection)+ Task 24(ScreenshotView) |
| §8 资源嗅探 | Task 14(sniffer)+ Task 17(content)+ Task 24(SnifferView) |
| §9 拖拽与自动滚动 | Task 13(autoscroll)+ Task 15(dragdrop)+ Task 17(content)+ Task 23(Dropzone) |
| §10 上传队列与 SDK | Task 7(mira-client)+ Task 8(uploader)+ Task 12(router 接 SDK) |
| §11 UI 与交互 | Task 18-25(全部 UI) |
| §12 manifest 权限 | Task 18(manifest)+ Task 26(图标) |
| §13 已知限制 | 体现在实现中(fixed 不处理、队列不持久、50 屏上限) |
| §14 后续 spec | 不在本次实现 |

**测试覆盖**:Task 3/4/5/7/8/13/14 有 Vitest 单测(纯逻辑);Task 11 有尺寸计算单测;其余 Chrome API/UI 靠 Task 27 手动验证。
