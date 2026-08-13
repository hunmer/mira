# 重复文件扫描插件 Implementation Plan

> 状态: 历史实施计划。2026-08-13 起功能已内置到 mira-app-server 和 Dashboard 数据库扫描卡片，原插件已移除。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建服务端插件 `mira_duplicate_scanner`，在 Dashboard 中注入前端页面，支持单库内重复文件扫描（名称+大小 / 名称+大小+hash）、对比查看、批量删除。

**Architecture:** 服务端插件继承 `ServerPlugin`，通过 `httpRouter.registerRounter()` 注册 REST API，通过 `registerRoute()` 向 Dashboard 注入前端路由。前端组件以 IIFE 格式编写，通过 `window.MiraDashboardUI` 获取 shadcn-vue 组件。扫描逻辑通过 `ILibraryServerData.getFiles()` 获取全部文件后在内存中分组。

**Tech Stack:** TypeScript (服务端), Plain JS + Vue template (前端), Express routes, mira-storage-sqlite, shadcn-vue

---

## File Structure

| 操作 | 文件 | 职责 |
|------|------|------|
| Create | `plugins/plugins/mira_duplicate_scanner/package.json` | 包配置 |
| Create | `plugins/plugins/mira_duplicate_scanner/tsconfig.json` | TS 编译配置 |
| Create | `plugins/plugins/mira_duplicate_scanner/index.ts` | 插件入口，构造函数注册路由 |
| Create | `plugins/plugins/mira_duplicate_scanner/DuplicateScanner.ts` | 扫描逻辑：quick/precise 分组 |
| Create | `plugins/plugins/mira_duplicate_scanner/components/DuplicateScanner.js` | Dashboard 前端组件 (IIFE) |
| Modify | `packages/mira-dashboard-next/src/pluginRuntime.ts` | 扩展 MiraDashboardUI 导出 |
| Modify | `plugins/plugins/plugins.json` | 注册新插件 |

---

### Task 1: 扩展 Dashboard pluginRuntime.ts — 补充 UI 组件

**Files:**
- Modify: `packages/mira-dashboard-next/src/pluginRuntime.ts`

- [ ] **Step 1: 添加 Dialog/Table/Tabs/Input/Progress 导入和注册**

在 `pluginRuntime.ts` 中补充缺失组件的 import 和 window 暴露：

```typescript
import { getDashboardContext } from '@/stores/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'

export function ensurePluginRuntime() {
  ;(window as any).MiraDashboard = getDashboardContext()
  ;(window as any).MiraDashboardUI = {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Progress,
    ScrollArea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  }
}
```

- [ ] **Step 2: 验证构建通过**

Run: `cd packages/mira-dashboard-next && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 无 import 错误。如果某个组件不存在（如缺少 shadcn 组件），需要先通过 `npx shadcn-vue@latest add <component>` 添加。

- [ ] **Step 3: Commit**

```bash
git add packages/mira-dashboard-next/src/pluginRuntime.ts
git commit -m "feat(dashboard): extend MiraDashboardUI with Dialog/Table/Tabs/Input/Progress"
```

---

### Task 2: 创建插件骨架 — package.json + tsconfig.json

**Files:**
- Create: `plugins/plugins/mira_duplicate_scanner/package.json`
- Create: `plugins/plugins/mira_duplicate_scanner/tsconfig.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "mira_duplicate_scanner",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "mira-storage-sqlite": "file:../../packages/mira-storage-sqlite",
    "mira-app-server": "file:../../packages/mira-app-server"
  },
  "author": "hunmer",
  "license": "ISC"
}
```

- [ ] **Step 2: 创建 tsconfig.json**

复用 mira_n8n 的配置，路径指向 `../../packages/*`（Windows 兼容）：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist", "components"]
}
```

- [ ] **Step 3: 创建 components 目录占位**

```bash
mkdir -p plugins/plugins/mira_duplicate_scanner/components
```

- [ ] **Step 4: Commit**

```bash
git add plugins/plugins/mira_duplicate_scanner/
git commit -m "feat(plugin): scaffold mira_duplicate_scanner package"
```

---

### Task 3: 实现扫描逻辑 — DuplicateScanner.ts

**Files:**
- Create: `plugins/plugins/mira_duplicate_scanner/DuplicateScanner.ts`

- [ ] **Step 1: 实现 DuplicateScanner 类**

```typescript
import { ILibraryServerData } from 'mira-storage-sqlite';

export interface DuplicateGroup {
    key: string;           // "title|size" 或 "title|size|hash"
    title: string;
    size: number;
    hash?: string;
    files: DuplicateFile[];
}

export interface DuplicateFile {
    id: number;
    title: string;
    path: string;
    size: number;
    extension: string;
    mime_type: string;
    hash?: string;
    thumbnail_path?: string;
    folder_id: number | null;
    created_at: string;
}

export interface ScanResult {
    groups: DuplicateGroup[];
    totalGroups: number;
    totalFiles: number;
    mode: 'quick' | 'precise';
}

export class DuplicateScanner {
    constructor(private dbService: ILibraryServerData) {}

    async scan(mode: 'quick' | 'precise' = 'quick'): Promise<ScanResult> {
        const allFiles = await this.fetchAllFiles();
        let groups: DuplicateGroup[];

        if (mode === 'precise') {
            groups = this.findPreciseDuplicates(allFiles);
        } else {
            groups = this.findQuickDuplicates(allFiles);
        }

        const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);
        return { groups, totalGroups: groups.length, totalFiles, mode };
    }

    private async fetchAllFiles(): Promise<DuplicateFile[]> {
        const { result } = await this.dbService.getFiles({
            select: 'id, title, path, size, extension, mime_type, hash, thumbnail_path, folder_id, created_at',
        });
        return result as DuplicateFile[];
    }

    private findQuickDuplicates(files: DuplicateFile[]): DuplicateGroup[] {
        const map = new Map<string, DuplicateFile[]>();

        for (const file of files) {
            const key = `${file.title}|${file.size}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(file);
        }

        const groups: DuplicateGroup[] = [];
        for (const [key, groupFiles] of map) {
            if (groupFiles.length > 1) {
                groups.push({
                    key,
                    title: groupFiles[0].title,
                    size: groupFiles[0].size,
                    files: groupFiles,
                });
            }
        }

        return groups.sort((a, b) => b.files.length - a.files.length);
    }

    private findPreciseDuplicates(files: DuplicateFile[]): DuplicateGroup[] {
        // 先做 quick 分组，再按 hash 细分
        const quickGroups = this.findQuickDuplicates(files);
        const preciseGroups: DuplicateGroup[] = [];

        for (const group of quickGroups) {
            const hashMap = new Map<string, DuplicateFile[]>();

            for (const file of group.files) {
                const hash = file.hash || '';
                if (!hash) continue; // precise 模式跳过无 hash 文件
                if (!hashMap.has(hash)) {
                    hashMap.set(hash, []);
                }
                hashMap.get(hash)!.push(file);
            }

            for (const [hash, hashFiles] of hashMap) {
                if (hashFiles.length > 1) {
                    preciseGroups.push({
                        key: `${group.title}|${group.size}|${hash}`,
                        title: group.title,
                        size: group.size,
                        hash,
                        files: hashFiles,
                    });
                }
            }
        }

        return preciseGroups.sort((a, b) => b.files.length - a.files.length);
    }

    async deleteFiles(fileIds: number[]): Promise<{ deleted: number; errors: string[] }> {
        const errors: string[] = [];
        let deleted = 0;

        for (const id of fileIds) {
            try {
                const success = await this.dbService.deleteFile(id);
                if (success) {
                    deleted++;
                } else {
                    errors.push(`File ${id}: delete returned false`);
                }
            } catch (err) {
                errors.push(`File ${id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        return { deleted, errors };
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add plugins/plugins/mira_duplicate_scanner/DuplicateScanner.ts
git commit -m "feat(plugin): implement DuplicateScanner scan logic"
```

---

### Task 4: 实现插件入口 — index.ts

**Files:**
- Create: `plugins/plugins/mira_duplicate_scanner/index.ts`

- [ ] **Step 1: 实现 MiraDuplicateScanner 插件类**

遵循 mira_n8n 的模式：构造函数中注册路由 + 注册 Dashboard 前端路由。

```typescript
import { ServerPluginManager, MiraWebsocketServer, ServerPlugin } from 'mira-app-server';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraHttpServer } from 'mira-app-server/dist/server';
import { DuplicateScanner, ScanResult } from './DuplicateScanner';

class MiraDuplicateScanner extends ServerPlugin {
    private readonly httpServer: MiraHttpServer;
    private readonly dbService: ILibraryServerData;

    constructor({ pluginManager, server, dbService }: {
        pluginManager: ServerPluginManager;
        server: MiraWebsocketServer;
        dbService: ILibraryServerData;
    }) {
        super('mira_duplicate_scanner', pluginManager, dbService);
        this.dbService = dbService;
        this.httpServer = server.backend.getHttpServer();

        const libraryId = dbService.getLibraryId();

        // POST /api/duplicate/scan — 扫描重复文件
        this.httpServer.httpRouter.registerRounter(
            libraryId, '/duplicate/scan', 'post',
            async (req: any, res: any) => {
                try {
                    const { libraryId: reqLibId, mode } = req.body;
                    if (!reqLibId) {
                        return res.status(400).json({ success: false, error: 'Missing libraryId' });
                    }

                    const scanner = new DuplicateScanner(this.dbService);
                    const result: ScanResult = await scanner.scan(mode || 'quick');
                    res.json({ success: true, data: result });
                } catch (error) {
                    console.error('[mira_duplicate_scanner] scan error:', error);
                    res.status(500).json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Scan failed',
                    });
                }
            }
        );

        // POST /api/duplicate/delete — 批量删除文件
        this.httpServer.httpRouter.registerRounter(
            libraryId, '/duplicate/delete', 'post',
            async (req: any, res: any) => {
                try {
                    const { libraryId: reqLibId, fileIds } = req.body;
                    if (!reqLibId || !Array.isArray(fileIds) || fileIds.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'Missing libraryId or fileIds',
                        });
                    }

                    const scanner = new DuplicateScanner(this.dbService);
                    const result = await scanner.deleteFiles(fileIds);
                    res.json({ success: true, data: result });
                } catch (error) {
                    console.error('[mira_duplicate_scanner] delete error:', error);
                    res.status(500).json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Delete failed',
                    });
                }
            }
        );

        // 注册 Dashboard 前端路由
        this.registerRoute({
            name: 'DuplicateScanner',
            group: '文件管理',
            path: '/tools/duplicate-scanner',
            component: 'components/DuplicateScanner.js',
            pluginName: 'mira_duplicate_scanner',
            meta: { title: '重复文件扫描', roles: ['super', 'admin', 'user'] },
        });

        console.log(`[mira_duplicate_scanner] Plugin initialized for library: ${libraryId}`);
    }
}

export function init(inst: any): MiraDuplicateScanner {
    return new MiraDuplicateScanner(inst);
}
```

- [ ] **Step 2: Commit**

```bash
git add plugins/plugins/mira_duplicate_scanner/index.ts
git commit -m "feat(plugin): implement MiraDuplicateScanner entry with routes"
```

---

### Task 5: 实现 Dashboard 前端组件 — DuplicateScanner.js

**Files:**
- Create: `plugins/plugins/mira_duplicate_scanner/components/DuplicateScanner.js`

这是最大的任务。IIFE 格式，Vue Options API + template 字符串。

- [ ] **Step 1: 编写 DuplicateScanner.js 组件**

```javascript
(function () {
  if (!window.MiraPluginComponents) {
    window.MiraPluginComponents = {};
  }
  var ui = window.MiraDashboardUI || {};
  var Dashboard = window.MiraDashboard || {};

  var DuplicateScanner = {
    name: 'DuplicateScanner',
    components: {
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      MiraCardContent: ui.CardContent,
      MiraCardHeader: ui.CardHeader,
      MiraCardTitle: ui.CardTitle,
      MiraDialog: ui.Dialog,
      MiraDialogContent: ui.DialogContent,
      MiraDialogHeader: ui.DialogHeader,
      MiraDialogTitle: ui.DialogTitle,
      MiraDialogDescription: ui.DialogDescription,
      MiraDialogFooter: ui.DialogFooter,
      MiraScrollArea: ui.ScrollArea,
      MiraSelect: ui.Select,
      MiraSelectContent: ui.SelectContent,
      MiraSelectItem: ui.SelectItem,
      MiraSelectTrigger: ui.SelectTrigger,
      MiraSelectValue: ui.SelectValue,
      MiraSeparator: ui.Separator,
      MiraBadge: ui.Badge,
      MiraInput: ui.Input,
    },
    template: [
      '<div class="p-6 space-y-6 max-w-5xl mx-auto">',
      '  <div class="flex items-center justify-between">',
      '    <h1 class="text-2xl font-bold">重复文件扫描</h1>',
      '  </div>',

      '  <!-- 控制栏 -->',
      '  <div class="flex items-center gap-4">',
      '    <MiraSelect v-model="selectedLibraryId" class="w-64">',
      '      <MiraSelectTrigger>',
      '        <MiraSelectValue placeholder="选择素材库" />',
      '      </MiraSelectTrigger>',
      '      <MiraSelectContent>',
      '        <MiraSelectItem v-for="lib in libraries" :key="lib.id" :value="lib.id">',
      '          {{ lib.name }}',
      '        </MiraSelectItem>',
      '      </MiraSelectContent>',
      '    </MiraSelect>',

      '    <div class="flex items-center gap-2 border rounded-md p-1">',
      '      <button',
      '        :class="[\'px-3 py-1 rounded text-sm\', scanMode === \'quick\' ? \'bg-primary text-primary-foreground\' : \'text-muted-foreground hover:bg-muted\']"',
      '        @click="scanMode = \'quick\'">快速</button>',
      '      <button',
      '        :class="[\'px-3 py-1 rounded text-sm\', scanMode === \'precise\' ? \'bg-primary text-primary-foreground\' : \'text-muted-foreground hover:bg-muted\']"',
      '        @click="scanMode = \'precise\'">精确</button>',
      '    </div>',

      '    <MiraButton @click="startScan" :disabled="scanning || !selectedLibraryId">',
      '      {{ scanning ? "扫描中..." : "开始扫描" }}',
      '    </MiraButton>',
      '  </div>',

      '  <MiraSeparator />',

      '  <!-- 结果摘要 -->',
      '  <div v-if="result" class="text-sm text-muted-foreground">',
      '    扫描结果: {{ result.totalGroups }} 组重复，共 {{ result.totalFiles }} 个文件',
      '    <span v-if="result.mode === \'precise\'" class="ml-2">(精确模式 - hash 校验)</span>',
      '  </div>',

      '  <!-- 错误 -->',
      '  <div v-if="error" class="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3">',
      '    {{ error }}',
      '  </div>',

      '  <!-- 空状态 -->',
      '  <div v-if="result && result.totalGroups === 0" class="text-center py-12 text-muted-foreground">',
      '    <div class="text-lg">未发现重复文件</div>',
      '    <div class="text-sm mt-1">所有文件都是唯一的</div>',
      '  </div>',

      '  <!-- 结果列表 -->',
      '  <MiraScrollArea v-if="result && result.totalGroups > 0" class="max-h-[calc(100vh-320px)]">',
      '    <div class="space-y-4 pr-4">',
      '      <MiraCard v-for="(group, gi) in result.groups" :key="group.key">',
      '        <MiraCardHeader class="pb-2">',
      '          <div class="flex items-center justify-between">',
      '            <MiraCardTitle class="text-base">',
      '              组 {{ gi + 1 }}: "{{ group.title }}"',
      '            </MiraCardTitle>',
      '            <MiraBadge variant="secondary">',
      '              {{ formatSize(group.size) }} × {{ group.files.length }}',
      '            </MiraBadge>',
      '          </div>',
      '        </MiraCardHeader>',
      '        <MiraCardContent>',
      '          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">',
      '            <div v-for="file in group.files" :key="file.id"',
      '                 class="border rounded-lg p-3 relative" :class="{ \'border-primary bg-primary/5\': !selectedIds.has(file.id) }">',
      '              <!-- 缩略图 -->',
      '              <div class="w-full h-24 bg-muted rounded flex items-center justify-center mb-2 overflow-hidden">',
      '                <img v-if="file.thumbnail_path" :src="getThumbUrl(file)" class="w-full h-full object-cover" />',
      '                <span v-else class="text-2xl">{{ fileIcon(file.extension) }}</span>',
      '              </div>',
      '              <!-- 文件名 -->',
      '              <div class="text-xs truncate text-muted-foreground" :title="file.path">{{ file.path }}</div>',
      '              <!-- 选择框 -->',
      '              <label class="flex items-center gap-1 mt-2 text-xs cursor-pointer">',
      '                <input type="checkbox" :checked="selectedIds.has(file.id)"',
      '                       @change="toggleFile(file.id)" class="rounded" />',
      '                <span>{{ selectedIds.has(file.id) ? "删除" : "保留" }}</span>',
      '              </label>',
      '            </div>',
      '          </div>',
      '        </MiraCardContent>',
      '      </MiraCard>',
      '    </div>',
      '  </MiraScrollArea>',

      '  <!-- 底部操作栏 -->',
      '  <div v-if="result && result.totalGroups > 0" class="flex items-center justify-between pt-4 border-t">',
      '    <button @click="selectAllDuplicates" class="text-sm text-primary hover:underline cursor-pointer">',
      '      全选重复项（每组保留 1 个）',
      '    </button>',
      '    <MiraButton variant="destructive" @click="confirmDelete" :disabled="selectedIds.size === 0">',
      '      删除选中 ({{ selectedIds.size }} 个)',
      '    </MiraButton>',
      '  </div>',

      '  <!-- 删除确认对话框 -->',
      '  <MiraDialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">',
      '    <MiraDialogContent>',
      '      <MiraDialogHeader>',
      '        <MiraDialogTitle>确认删除</MiraDialogTitle>',
      '        <MiraDialogDescription>',
      '          确定要删除 {{ selectedIds.size }} 个文件吗？此操作不可撤销。',
      '        </MiraDialogDescription>',
      '      </MiraDialogHeader>',
      '      <MiraDialogFooter>',
      '        <MiraButton variant="outline" @click="deleteDialogOpen = false">取消</MiraButton>',
      '        <MiraButton variant="destructive" @click="executeDelete" :disabled="deleting">',
      '          {{ deleting ? "删除中..." : "确认删除" }}',
      '        </MiraButton>',
      '      </MiraDialogFooter>',
      '    </MiraDialogContent>',
      '  </MiraDialog>',

      '</div>'
    ].join('\n'),
    data: function () {
      return {
        libraries: [],
        selectedLibraryId: '',
        scanMode: 'quick',
        scanning: false,
        result: null,
        error: '',
        selectedIds: new Set(),
        deleteDialogOpen: false,
        deleting: false,
      };
    },
    mounted: function () {
      this.loadLibraries();
    },
    methods: {
      loadLibraries: function () {
        var self = this;
        if (Dashboard && Dashboard.getLibraries) {
          Dashboard.getLibraries().then(function (libs) {
            self.libraries = libs || [];
            if (self.libraries.length > 0 && !self.selectedLibraryId) {
              self.selectedLibraryId = self.libraries[0].id;
            }
          }).catch(function () {
            self.libraries = [];
          });
        }
      },
      getApiBase: function () {
        return Dashboard && Dashboard.getApiBase ? Dashboard.getApiBase() : '/api';
      },
      startScan: function () {
        var self = this;
        if (!self.selectedLibraryId || self.scanning) return;
        self.scanning = true;
        self.result = null;
        self.error = '';
        self.selectedIds = new Set();

        fetch(self.getApiBase() + '/duplicate/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ libraryId: self.selectedLibraryId, mode: self.scanMode }),
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            self.result = data.data;
          } else {
            self.error = data.error || '扫描失败';
          }
        })
        .catch(function (e) {
          self.error = e.message || '网络错误';
        })
        .finally(function () {
          self.scanning = false;
        });
      },
      toggleFile: function (id) {
        var newSet = new Set(this.selectedIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        this.selectedIds = newSet;
      },
      selectAllDuplicates: function () {
        var newSet = new Set();
        if (!this.result) return;
        for (var i = 0; i < this.result.groups.length; i++) {
          var files = this.result.groups[i].files;
          for (var j = 1; j < files.length; j++) {
            newSet.add(files[j].id);
          }
        }
        this.selectedIds = newSet;
      },
      confirmDelete: function () {
        if (this.selectedIds.size === 0) return;
        this.deleteDialogOpen = true;
      },
      executeDelete: function () {
        var self = this;
        self.deleting = true;
        fetch(self.getApiBase() + '/duplicate/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            libraryId: self.selectedLibraryId,
            fileIds: Array.from(self.selectedIds),
          }),
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            self.deleteDialogOpen = false;
            self.selectedIds = new Set();
            self.startScan();
          } else {
            self.error = data.error || '删除失败';
          }
        })
        .catch(function (e) {
          self.error = e.message || '网络错误';
        })
        .finally(function () {
          self.deleting = false;
        });
      },
      getThumbUrl: function (file) {
        if (!file.thumbnail_path) return '';
        return this.getApiBase() + '/files/' + this.selectedLibraryId + '/' + file.id + '/thumb';
      },
      fileIcon: function (ext) {
        var icons = {
          jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️',
          mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', flv: '🎬', webm: '🎬',
          mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
          pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
          zip: '📦', rar: '📦', '7z': '📦',
        };
        return icons[(ext || '').toLowerCase()] || '📎';
      },
      formatSize: function (bytes) {
        if (bytes === 0) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      },
    },
  };

  window.MiraPluginComponents['mira_duplicate_scanner_components_DuplicateScanner_js'] = DuplicateScanner;
})();
```

- [ ] **Step 2: Commit**

```bash
git add plugins/plugins/mira_duplicate_scanner/components/DuplicateScanner.js
git commit -m "feat(plugin): add Dashboard DuplicateScanner frontend component"
```

---

### Task 6: 注册插件 — plugins.json

**Files:**
- Modify: `plugins/plugins/plugins.json`

- [ ] **Step 1: 在 plugins.json 中添加新条目**

在数组末尾添加：

```json
{
  "name": "mira_duplicate_scanner",
  "enabled": true,
  "path": "mira_duplicate_scanner"
}
```

完整的 `plugins.json` 将变为：

```json
[
  {
    "name": "mira_demo",
    "enabled": false,
    "path": "mira_demo"
  },
  {
    "name": "mira_n8n",
    "enabled": false,
    "path": "mira_n8n"
  },
  {
    "name": "mira_thumb",
    "enabled": false,
    "path": "mira_thumb"
  },
  {
    "name": "mira_user",
    "enabled": false,
    "path": "mira_user"
  },
  {
    "name": "upload_statistics",
    "enabled": false,
    "path": "upload_statistics"
  },
  {
    "name": "mira_thumb_imagemagick",
    "enabled": false,
    "path": "mira_thumb_imagemagick"
  },
  {
    "name": "mira_duplicate_scanner",
    "enabled": true,
    "path": "mira_duplicate_scanner"
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add plugins/plugins/plugins.json
git commit -m "feat(plugin): register mira_duplicate_scanner in plugins.json"
```

---

### Task 7: 手动集成测试

**前置条件:** 需要运行中的 Mira 服务端和 Dashboard 开发服务器。

- [ ] **Step 1: 构建核心依赖**

```bash
cd packages/mira-storage-sqlite && pnpm run build
cd ../mira-app-server && pnpm run build
```

Expected: 构建成功

- [ ] **Step 2: 安装插件依赖**

```bash
cd plugins/plugins/mira_duplicate_scanner && pnpm install
```

- [ ] **Step 3: 启动服务端**

```bash
cd packages/mira-app-server && pnpm run dev
```

Expected: 控制台输出 `[mira_duplicate_scanner] Plugin initialized for library: <libraryId>`

- [ ] **Step 4: 启动 Dashboard**

```bash
cd packages/mira-dashboard-next && pnpm run dev
```

- [ ] **Step 5: 验证 Dashboard 侧边栏出现「重复文件扫描」入口**

打开浏览器访问 Dashboard，检查侧边栏是否有新入口。

- [ ] **Step 6: 验证扫描流程**

1. 选择一个有重复文件的素材库
2. 点击「开始扫描」（快速模式）
3. 确认结果正确显示分组
4. 切换到精确模式，再次扫描
5. 勾选文件，点击删除，确认对话框弹出
6. 确认删除成功

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(plugin): complete mira_duplicate_scanner plugin with dashboard UI"
```

---

## Self-Review

### Spec Coverage

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 服务端插件 + Dashboard 动态路由 | Task 4 (registerRoute) |
| quick 模式（名称+大小） | Task 3 (findQuickDuplicates) |
| precise 模式（名称+大小+hash） | Task 3 (findPreciseDuplicates) |
| POST /api/duplicate/scan | Task 4 |
| POST /api/duplicate/delete | Task 4 |
| Dashboard 前端组件 (IIFE) | Task 5 |
| 对比查看 UI | Task 5 (template) |
| 批量删除 | Task 5 (confirmDelete + executeDelete) |
| 素材库选择 | Task 5 (loadLibraries + Select) |
| 模式切换 | Task 5 (scanMode toggle) |
| 扩展 MiraDashboardUI | Task 1 |
| plugins.json 注册 | Task 6 |

### Placeholder Scan

无 TBD/TODO/实现稍后。

### Type Consistency

- `DuplicateScanner.ts` 定义的 `DuplicateGroup` / `DuplicateFile` / `ScanResult` 在 `index.ts` 中通过 import 使用
- 前端组件通过 API JSON 获取相同结构的数据
- `registerRounter` 调用签名与 mira_n8n 模式一致：`(libraryId, path, method, handler)`
- 组件注册 key 格式 `mira_duplicate_scanner_components_DuplicateScanner_js` 遵循 `{pluginName}_{component路径替换}` 规范
