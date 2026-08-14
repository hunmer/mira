(function () {
  if (!window.MiraPluginComponents) window.MiraPluginComponents = {};
  var ui = window.MiraDashboardUI || {};
  var Dashboard = window.MiraDashboard || {};

  var GalleryDlImporter = {
    name: 'GalleryDlImporter',
    components: {
      MiraBadge: ui.Badge,
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      MiraCardContent: ui.CardContent,
      MiraCardHeader: ui.CardHeader,
      MiraCardTitle: ui.CardTitle,
      MiraInput: ui.Input,
      MiraLabel: ui.Label,
      MiraLibraryTreeSelect: ui.LibraryTreeSelect,
      MiraSelect: ui.Select,
      MiraSelectContent: ui.SelectContent,
      MiraSelectItem: ui.SelectItem,
      MiraSelectTrigger: ui.SelectTrigger,
      MiraSelectValue: ui.SelectValue,
      MiraTabs: ui.Tabs,
      MiraTabsContent: ui.TabsContent,
      MiraTabsList: ui.TabsList,
      MiraTabsTrigger: ui.TabsTrigger,
      MiraTextarea: ui.Textarea,
    },
    template: [
      '<div class="min-h-[calc(100dvh-4rem)] space-y-4 p-4 md:p-6">',
      '  <header class="flex flex-wrap items-center justify-between gap-3">',
      '    <div><h1 class="text-xl font-semibold">图库批量导入</h1><p class="text-xs text-muted-foreground">gallery-dl {{ status.version || "" }}</p></div>',
      '    <MiraBadge :variant="status.available ? \'default\' : \'destructive\'">{{ status.available ? "服务可用" : "服务不可用" }}</MiraBadge>',
      '  </header>',
      '  <div class="gallery-dl-layout">',
      '    <main class="min-w-0 space-y-4">',
      '      <MiraCard size="sm">',
      '        <MiraCardHeader class="items-center border-b" style="grid-template-columns:minmax(0,1fr) auto">',
      '          <MiraCardTitle>链接列表</MiraCardTitle><MiraBadge variant="secondary">{{ linkCount }}</MiraBadge>',
      '        </MiraCardHeader>',
      '        <MiraCardContent class="space-y-3">',
      '          <MiraTextarea id="gallery-dl-urls" v-model="urlsText" rows="7" class="min-h-36 resize-y font-mono" placeholder="每行一条链接" />',
      '          <div class="flex items-center justify-between gap-3">',
      '            <p v-if="parseError" class="min-w-0 flex-1 text-xs text-destructive">{{ parseError }}</p><span v-else></span>',
      '            <MiraButton :disabled="parsing || !status.available || !targetLibraryId || !urlsText.trim()" @click="parseLinks">{{ parsing ? "解析中..." : "解析链接" }}</MiraButton>',
      '          </div>',
      '          <div v-if="parseWarnings.length" class="space-y-1 rounded-md bg-muted p-2">',
      '            <p v-for="warning in parseWarnings" :key="warning.url" class="break-all text-xs text-muted-foreground">{{ warning.url }}: {{ warning.error }}</p>',
      '          </div>',
      '        </MiraCardContent>',
      '      </MiraCard>',
      '      <MiraCard size="sm">',
      '        <MiraCardHeader class="items-center border-b" style="grid-template-columns:minmax(0,1fr) auto">',
      '          <div class="flex items-center gap-2"><MiraCardTitle>图片列表</MiraCardTitle><MiraBadge variant="secondary">{{ selectedCount }} / {{ items.length }}</MiraBadge></div>',
      '          <MiraButton variant="outline" size="sm" :disabled="!items.length" @click="toggleAll">{{ allSelected ? "取消全选" : "全选" }}</MiraButton>',
      '        </MiraCardHeader>',
      '        <MiraCardContent>',
      '          <div v-if="!items.length" class="flex h-64 items-center justify-center text-xs text-muted-foreground">暂无图片</div>',
      '          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">',
      '            <button v-for="item in items" :key="item.id" type="button" class="group relative min-w-0 overflow-hidden rounded-md border bg-background text-left outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/30" :class="isSelected(item.id) ? \'border-primary ring-1 ring-primary\' : \'\'" @click="toggleItem(item.id)">',
      '              <div class="aspect-square overflow-hidden bg-muted"><img :src="item.thumbnailUrl" :alt="item.name" class="size-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy"></div>',
      '              <div class="space-y-1 p-2"><p class="truncate text-xs font-medium">{{ item.name }}</p><p class="truncate text-[0.625rem] text-muted-foreground">{{ item.site || item.sourceUrl }}</p></div>',
      '              <MiraBadge v-if="isSelected(item.id)" class="absolute left-2 top-2">已选</MiraBadge>',
      '              <MiraBadge v-if="item.imported" variant="secondary" class="absolute right-2 top-2">已导入</MiraBadge>',
      '            </button>',
      '          </div>',
      '        </MiraCardContent>',
      '      </MiraCard>',
      '    </main>',
      '    <aside class="gallery-dl-rail space-y-4">',
      '      <MiraCard size="sm">',
      '        <MiraCardHeader class="border-b"><MiraCardTitle>设置表单</MiraCardTitle></MiraCardHeader>',
      '        <MiraCardContent>',
      '          <MiraTabs v-model="settingsTab" default-value="manual">',
      '            <MiraTabsList class="w-full"><MiraTabsTrigger value="manual">手动输入</MiraTabsTrigger><MiraTabsTrigger value="command">命令行</MiraTabsTrigger></MiraTabsList>',
      '            <MiraTabsContent value="manual" class="space-y-2 pt-2">',
      '              <MiraLabel for="gallery-dl-proxy">代理</MiraLabel>',
      '              <MiraInput id="gallery-dl-proxy" v-model="proxyUrl" placeholder="http://127.0.0.1:7890" />',
      '            </MiraTabsContent>',
      '            <MiraTabsContent value="command" class="space-y-2 pt-2">',
      '              <MiraLabel for="gallery-dl-command">gallery-dl 命令</MiraLabel>',
      '              <MiraTextarea id="gallery-dl-command" v-model="commandLine" rows="6" class="min-h-28 resize-y font-mono" />',
      '            </MiraTabsContent>',
      '          </MiraTabs>',
      '        </MiraCardContent>',
      '      </MiraCard>',
      '      <MiraCard size="sm">',
      '        <MiraCardHeader class="border-b"><MiraCardTitle>导入表单</MiraCardTitle></MiraCardHeader>',
      '        <MiraCardContent class="space-y-4">',
      '          <div class="space-y-2"><MiraLabel>素材库</MiraLabel><MiraSelect :model-value="targetLibraryId" @update:model-value="onTargetLibraryChange"><MiraSelectTrigger class="w-full"><MiraSelectValue placeholder="选择素材库" /></MiraSelectTrigger><MiraSelectContent><MiraSelectItem v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</MiraSelectItem></MiraSelectContent></MiraSelect></div>',
      '          <div class="space-y-2"><MiraLabel>文件夹</MiraLabel><MiraLibraryTreeSelect v-if="targetLibraryId" :library-id="targetLibraryId" entity="folder" :model-value="folderId" @update:model-value="folderId = $event" /></div>',
      '          <div class="space-y-2"><MiraLabel>标签</MiraLabel><MiraLibraryTreeSelect v-if="targetLibraryId" :library-id="targetLibraryId" entity="tag" :model-value="tagIds" @update:model-value="tagIds = $event" /></div>',
      '          <MiraButton class="w-full" :disabled="importing || !targetLibraryId || !selectedCount" @click="importSelected">{{ importing ? "导入中..." : "导入所选图片" }}</MiraButton>',
      '          <p v-if="importMessage" class="text-xs" :class="importError ? \'text-destructive\' : \'text-green-600\'">{{ importMessage }}</p>',
      '        </MiraCardContent>',
      '      </MiraCard>',
      '    </aside>',
      '  </div>',
      '</div>',
    ].join(''),
    data: function () {
      return {
        status: { available: false, version: '' },
        libraries: [],
        targetLibraryId: '',
        folderId: null,
        tagIds: [],
        settingsTab: 'manual',
        proxyUrl: '',
        commandLine: 'gallery-dl',
        urlsText: '',
        items: [],
        selectedIds: [],
        parseWarnings: [],
        parseError: '',
        importMessage: '',
        importError: false,
        parsing: false,
        importing: false,
      };
    },
    computed: {
      linkCount: function () { return this.getUrls().length; },
      selectedCount: function () { return this.selectedIds.length; },
      allSelected: function () { return this.items.length > 0 && this.selectedIds.length === this.items.length; },
    },
    watch: {
      proxyUrl: function (value) { this.commandLine = this.buildCommandLine(value); },
    },
    mounted: async function () {
      try {
        this.libraries = await Dashboard.getLibraries();
        var routeLibraryId = this.$route && this.$route.meta && this.$route.meta.libraryId;
        this.targetLibraryId = this.libraries.some(function (lib) { return lib.id === routeLibraryId; })
          ? routeLibraryId
          : (this.libraries[0] && this.libraries[0].id) || '';
        await this.loadStatus();
      } catch (error) {
        this.parseError = this.errorText(error);
      }
    },
    methods: {
      authHeaders: function () {
        var headers = { 'Content-Type': 'application/json' };
        var token = localStorage.getItem('token');
        if (token) headers.Authorization = 'Bearer ' + token;
        return headers;
      },
      apiUrl: function (path) { return String(Dashboard.getApiBase() || '/api').replace(/\/$/, '') + path; },
      request: async function (path, options) {
        var response = await fetch(this.apiUrl(path), Object.assign({}, options, { headers: this.authHeaders() }));
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok || data.success === false || (typeof data.code === 'number' && data.code !== 0)) {
          throw new Error(data.error || data.message || ('HTTP ' + response.status));
        }
        return data;
      },
      getUrls: function () {
        return this.urlsText.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
      },
      buildCommandLine: function (proxyUrl) {
        if (!String(proxyUrl || '').trim()) return 'gallery-dl';
        return 'gallery-dl --proxy "' + String(proxyUrl).replace(/["\\]/g, '\\$&') + '"';
      },
      loadStatus: async function () {
        if (!this.targetLibraryId) return;
        try {
          this.status = await this.request('/gallery-dl/status?libraryId=' + encodeURIComponent(this.targetLibraryId), { method: 'GET' });
        } catch (error) {
          this.status = { available: false, version: '' };
          this.parseError = this.errorText(error);
        }
      },
      onTargetLibraryChange: function (value) {
        this.targetLibraryId = value;
        this.folderId = null;
        this.tagIds = [];
        this.loadStatus();
      },
      parseLinks: async function () {
        this.parsing = true;
        this.parseError = '';
        this.parseWarnings = [];
        this.importMessage = '';
        try {
          var data = await this.request('/gallery-dl/parse', {
            method: 'POST',
            body: JSON.stringify({ libraryId: this.targetLibraryId, urls: this.getUrls(), commandLine: this.commandLine }),
          });
          this.items = data.items || [];
          this.selectedIds = this.items.map(function (item) { return item.id; });
          this.parseWarnings = data.errors || [];
        } catch (error) {
          this.parseError = this.errorText(error);
        } finally {
          this.parsing = false;
        }
      },
      isSelected: function (id) { return this.selectedIds.indexOf(id) >= 0; },
      toggleItem: function (id) {
        var index = this.selectedIds.indexOf(id);
        if (index >= 0) this.selectedIds.splice(index, 1);
        else this.selectedIds.push(id);
      },
      toggleAll: function () {
        this.selectedIds = this.allSelected ? [] : this.items.map(function (item) { return item.id; });
      },
      importSelected: async function () {
        var selected = this.items.filter(function (item) { return this.selectedIds.indexOf(item.id) >= 0; }, this);
        this.importing = true;
        this.importMessage = '';
        this.importError = false;
        try {
          var response = await this.request('/download/start', {
            method: 'POST',
            body: JSON.stringify({
              libraryId: this.targetLibraryId,
              folderId: this.folderId,
              tagIds: this.tagIds.map(String),
              urls: selected.map(function (item) { return item.url; }),
            }),
          });
          var batch = response.data || response;
          var progress = await this.waitForDownload(batch.batchId);
          if (!progress.failed) {
            var selectedIds = new Set(this.selectedIds);
            this.items.forEach(function (item) { if (selectedIds.has(item.id)) item.imported = true; });
          }
          this.importMessage = '成功 ' + progress.completed + ' 张'
            + (progress.skipped ? '，重复 ' + progress.skipped + ' 张' : '')
            + (progress.failed ? '，失败 ' + progress.failed + ' 张' : '');
          this.importError = progress.failed > 0;
        } catch (error) {
          this.importMessage = this.errorText(error);
          this.importError = true;
        } finally {
          this.importing = false;
        }
      },
      waitForDownload: async function (batchId) {
        if (!batchId) throw new Error('服务端未返回下载批次 ID');
        for (var attempt = 0; attempt < 800; attempt++) {
          var response = await this.request('/download/progress/' + encodeURIComponent(batchId), { method: 'GET' });
          var progress = response.data || response;
          this.importMessage = '正在导入 ' + (progress.completed + progress.skipped + progress.failed) + ' / ' + progress.total;
          if (progress.done) return progress;
          await new Promise(function (resolve) { setTimeout(resolve, 750); });
        }
        throw new Error('等待下载完成超时，请稍后在素材库中查看结果');
      },
      errorText: function (error) { return error && error.message ? error.message : String(error); },
    },
  };

  window.MiraPluginComponents['mira_gallery_dl_components_GalleryDlImporter_js'] = GalleryDlImporter;
})();
