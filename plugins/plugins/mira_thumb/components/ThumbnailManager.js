/**
 * 缩略图管理组件。
 * 通过 Dashboard 动态插件加载器注入，并复用宿主已注册的 shadcn-vue 组件。
 */
(function () {
  'use strict';

  if (!window.MiraPluginComponents) {
    window.MiraPluginComponents = {};
  }

  function getDashboardUiComponents() {
    const ui = window.MiraDashboardUI || {};
    return {
      MiraBadge: ui.Badge,
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      MiraCardContent: ui.CardContent,
      MiraCardDescription: ui.CardDescription,
      MiraCardHeader: ui.CardHeader,
      MiraCardTitle: ui.CardTitle,
      MiraScrollArea: ui.ScrollArea,
      MiraSeparator: ui.Separator,
    };
  }

  const ThumbnailManagerComponent = {
    name: 'ThumbnailManager',
    components: getDashboardUiComponents(),
    template: `
      <div class="space-y-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-2xl font-bold tracking-normal">缩略图管理</h1>
            <p class="mt-1 text-sm text-muted-foreground">管理和生成媒体文件缩略图</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <MiraButton variant="outline" :disabled="loading" @click="refreshStats">
              <span v-if="loading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              刷新统计
            </MiraButton>
            <MiraButton :disabled="isScanning" @click="startScan">
              <span v-if="isScanning" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              {{ isScanning ? '正在扫描...' : '开始扫描' }}
            </MiraButton>
            <MiraButton variant="destructive" :disabled="!isScanning" @click="cancelScan">
              取消扫描
            </MiraButton>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiraCard v-for="item in statItems" :key="item.label">
            <MiraCardContent class="pt-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-2xl font-semibold">{{ item.value }}</div>
                  <div class="mt-1 text-sm text-muted-foreground">{{ item.label }}</div>
                </div>
                <MiraBadge :variant="item.variant">{{ item.badge }}</MiraBadge>
              </div>
            </MiraCardContent>
          </MiraCard>
        </div>

        <MiraCard>
          <MiraCardHeader>
            <MiraCardTitle>处理进度</MiraCardTitle>
            <MiraCardDescription>当前缩略图生成任务状态</MiraCardDescription>
          </MiraCardHeader>
          <MiraCardContent>
            <div v-if="progress.totalPending > 0" class="space-y-5">
              <div class="flex items-center justify-between gap-4">
                <div class="text-sm text-muted-foreground">
                  已完成 {{ progress.completed }} / {{ progress.totalPending }}
                </div>
                <div class="text-xl font-semibold">{{ progress.progress }}%</div>
              </div>

              <div class="h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-500"
                  :style="{ width: progress.progress + '%' }"
                ></div>
              </div>

              <div class="grid gap-3 md:grid-cols-3">
                <div class="rounded-md border p-4 text-center">
                  <div class="text-lg font-semibold">{{ progress.totalPending }}</div>
                  <div class="text-xs text-muted-foreground">总任务</div>
                </div>
                <div class="rounded-md border p-4 text-center">
                  <div class="text-lg font-semibold">{{ progress.completed }}</div>
                  <div class="text-xs text-muted-foreground">已完成</div>
                </div>
                <div class="rounded-md border p-4 text-center">
                  <div class="text-lg font-semibold">{{ progress.queueLength }}</div>
                  <div class="text-xs text-muted-foreground">队列中</div>
                </div>
              </div>
            </div>

            <div v-else class="py-10 text-center">
              <div class="text-lg font-medium">暂无待处理任务</div>
              <div class="mt-1 text-sm text-muted-foreground">所有媒体文件的缩略图均已生成或尚未开始扫描</div>
            </div>
          </MiraCardContent>
        </MiraCard>

        <MiraCard>
          <MiraCardHeader class="flex flex-row items-start justify-between gap-4">
            <div>
              <MiraCardTitle>操作日志</MiraCardTitle>
              <MiraCardDescription>实时显示缩略图任务的执行结果</MiraCardDescription>
            </div>
            <MiraButton variant="outline" size="sm" @click="clearLogs">清空日志</MiraButton>
          </MiraCardHeader>
          <MiraCardContent>
            <MiraScrollArea class="h-80 rounded-md border bg-muted/40 p-4" ref="logContainer">
              <div v-if="logs.length" class="space-y-2 font-mono text-xs">
                <div v-for="(log, index) in logs" :key="index" class="flex gap-2">
                  <span class="shrink-0 text-muted-foreground">[{{ log.time }}]</span>
                  <span>{{ log.message }}</span>
                </div>
              </div>
              <div v-else class="py-12 text-center text-sm text-muted-foreground">
                暂无操作日志
              </div>
            </MiraScrollArea>
          </MiraCardContent>
        </MiraCard>
      </div>
    `,
    data() {
      return {
        loading: false,
        isScanning: false,
        stats: {
          totalFiles: 0,
          withThumbnails: 0,
          withoutThumbnails: 0,
          thumbnailRate: 0,
        },
        progress: {
          totalPending: 0,
          queueLength: 0,
          processing: false,
          completed: 0,
          progress: 0,
        },
        logs: [],
        progressTimer: null,
      };
    },
    computed: {
      statItems() {
        return [
          { label: '总文件数', value: this.stats.totalFiles, badge: 'Files', variant: 'secondary' },
          { label: '已有缩略图', value: this.stats.withThumbnails, badge: `${this.stats.thumbnailRate}%`, variant: 'default' },
          { label: '缺失缩略图', value: this.stats.withoutThumbnails, badge: 'Missing', variant: 'destructive' },
          { label: '剩余任务', value: this.progress.queueLength || this.stats.withoutThumbnails, badge: 'Queue', variant: 'outline' },
        ];
      },
    },
    mounted() {
      console.debug('ThumbnailManager mounted');
      this.refreshStats();
    },
    beforeUnmount() {
      this.stopProgressMonitoring();
    },
    methods: {
      getLibraryId() {
        const ctx = window.MiraDashboard;
        if (ctx) return ctx.getLibraryId();
        return 'default';
      },

      getApiBase() {
        const ctx = window.MiraDashboard;
        if (ctx) return ctx.getApiBase();
        return '/api';
      },

      async requestJson(path) {
        const response = await fetch(`${this.getApiBase()}${path}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      },

      addLog(message) {
        this.logs.unshift({
          time: new Date().toLocaleTimeString(),
          message,
        });
        if (this.logs.length > 50) {
          this.logs = this.logs.slice(0, 50);
        }
      },

      clearLogs() {
        this.logs = [];
        this.addLog('日志已清空');
      },

      async refreshStats() {
        this.loading = true;
        try {
          const result = await this.requestJson(`/thumb/stats?libraryId=${this.getLibraryId()}`);
          if (result.success) {
            this.stats = result.data;
            this.addLog(`统计已更新：总文件 ${this.stats.totalFiles} 个，缩略图完成率 ${this.stats.thumbnailRate}%`);
          }
        } catch (error) {
          console.error('获取缩略图统计失败:', error);
          this.addLog(`获取统计失败：${error.message}`);
        } finally {
          this.loading = false;
        }
      },

      async startScan() {
        try {
          const result = await this.requestJson(`/thumb/scan?libraryId=${this.getLibraryId()}`);
          if (result.success) {
            this.isScanning = true;
            this.addLog(result.message || '缩略图扫描已开始');
            this.startProgressMonitoring();
          }
        } catch (error) {
          console.error('开始缩略图扫描失败:', error);
          this.addLog(`开始扫描失败：${error.message}`);
        }
      },

      async cancelScan() {
        try {
          const result = await this.requestJson(`/thumb/cancel?libraryId=${this.getLibraryId()}`);
          if (result.success) {
            this.isScanning = false;
            this.stopProgressMonitoring();
            this.addLog(result.message || '缩略图扫描已取消');
          }
        } catch (error) {
          console.error('取消缩略图扫描失败:', error);
          this.addLog(`取消扫描失败：${error.message}`);
        }
      },

      startProgressMonitoring() {
        this.stopProgressMonitoring();
        this.progressTimer = setInterval(async () => {
          try {
            const result = await this.requestJson(`/thumb/progress?libraryId=${this.getLibraryId()}`);
            if (!result.success) return;

            this.progress = result.data;
            if (!this.progress.processing && this.progress.queueLength === 0) {
              this.isScanning = false;
              this.stopProgressMonitoring();
              if (this.progress.progress === 100) {
                this.addLog('缩略图扫描任务已完成');
                setTimeout(() => this.refreshStats(), 1000);
              }
            }
          } catch (error) {
            console.error('获取缩略图进度失败:', error);
            this.addLog(`获取进度失败：${error.message}`);
          }
        }, 1000);
      },

      stopProgressMonitoring() {
        if (!this.progressTimer) return;
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      },
    },
  };

  window.MiraPluginComponents.mira_thumb_components_ThumbnailManager_js = ThumbnailManagerComponent;

  if (window.Vue && window.Vue.component) {
    window.Vue.component('ThumbnailManager', ThumbnailManagerComponent);
  }

  console.debug('ThumbnailManager component loaded and registered');
})();
