(function () {
  if (!window.MiraPluginComponents) window.MiraPluginComponents = {};
  var ui = window.MiraDashboardUI || {};
  var Dashboard = window.MiraDashboard || {};

  var GalleryDlImporter = {
    name: 'GalleryDlImporter',
    components: {
      MiraButton: ui.Button,
      MiraBadge: ui.Badge,
      MiraLibraryTreeSelect: ui.LibraryTreeSelect,
    },
    template: [
      '<div class="space-y-5 p-4 md:p-6">',
      '  <div class="flex flex-wrap items-center justify-between gap-3">',
      '    <div><h1 class="text-2xl font-bold">图库批量导入</h1><p class="text-sm text-muted-foreground">gallery-dl {{ status.version || "" }}</p></div>',
      '    <MiraBadge :variant="status.available ? \'default\' : \'destructive\'">{{ status.available ? "可用" : "不可用" }}</MiraBadge>',
      '  </div>',
      '  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">',
      '    <main class="min-w-0 space-y-4">',
      '      <section class="space-y-3 border-b pb-5">',
      '        <label class="text-sm font-medium" for="gallery-dl-urls">资源链接</label>',
      '        <textarea id="gallery-dl-urls" v-model="urlsText" rows="5" class="border-input bg-background w-full resize-y rounded-md border p-3 text-sm" placeholder="每行一条链接"></textarea>',
      '        <div class="flex items-center justify-between gap-3">',
      '          <p class="text-sm text-destructive" v-if="parseError">{{ parseError }}</p><span v-else></span>',
      '          <MiraButton :disabled="parsing || !status.available || !urlsText.trim()" @click="parseLinks">{{ parsing ? "解析中..." : "解析" }}</MiraButton>',
      '        </div>',
      '      </section>',
      '      <section class="space-y-3">',
      '        <div class="flex flex-wrap items-center justify-between gap-3">',
      '          <label class="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" class="size-4 accent-primary" :checked="allSelected" @change="toggleAll">全选</label>',
      '          <span class="text-sm text-muted-foreground">已选 {{ selectedCount }} / {{ items.length }}</span>',
      '        </div>',
      '        <div v-if="!items.length" class="flex h-52 items-center justify-center border-y text-sm text-muted-foreground">暂无图片</div>',
      '        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">',
      '          <button v-for="item in items" :key="item.id" type="button" class="group relative overflow-hidden rounded-md border bg-background text-left" :class="isSelected(item.id) ? \'ring-2 ring-primary\' : \'\'" @click="toggleItem(item.id)">',
      '            <div class="aspect-square overflow-hidden bg-muted"><img :src="item.thumbnailUrl" :alt="item.name" class="size-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy"></div>',
      '            <div class="space-y-1 p-2"><p class="truncate text-xs font-medium">{{ item.name }}</p><p class="truncate text-xs text-muted-foreground">{{ item.site || item.sourceUrl }}</p></div>',
      '            <input type="checkbox" class="absolute left-2 top-2 size-4 accent-primary" :checked="isSelected(item.id)" tabindex="-1" aria-hidden="true">',
      '            <span v-if="item.imported" class="absolute right-2 top-2 rounded bg-background/90 px-1.5 py-0.5 text-xs">已导入</span>',
      '          </button>',
      '        </div>',
      '      </section>',
      '    </main>',
      '    <aside class="h-fit space-y-4 rounded-md border p-4 xl:sticky xl:top-4">',
      '      <h2 class="text-sm font-semibold">导入目标</h2>',
      '      <div class="space-y-2"><label class="text-sm" for="gallery-dl-library">素材库</label><select id="gallery-dl-library" v-model="targetLibraryId" class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm" @change="resetTargets"><option value="" disabled>选择素材库</option><option v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option></select></div>',
      '      <div class="space-y-2"><label class="text-sm">文件夹</label><MiraLibraryTreeSelect v-if="targetLibraryId" :library-id="targetLibraryId" entity="folder" :model-value="folderId" @update:model-value="folderId = $event" /></div>',
      '      <div class="space-y-2"><label class="text-sm">标签</label><MiraLibraryTreeSelect v-if="targetLibraryId" :library-id="targetLibraryId" entity="tag" :model-value="tagIds" @update:model-value="tagIds = $event" /></div>',
      '      <div class="border-t pt-4"><MiraButton class="w-full" :disabled="importing || !targetLibraryId || !selectedCount" @click="importSelected">{{ importing ? "导入中..." : "导入所选图片" }}</MiraButton></div>',
      '      <p v-if="importMessage" class="text-sm" :class="importError ? \'text-destructive\' : \'text-green-600\'">{{ importMessage }}</p>',
      '      <div v-if="parseWarnings.length" class="space-y-1 border-t pt-3"><p class="text-xs font-medium">解析失败</p><p v-for="warning in parseWarnings" :key="warning.url" class="break-all text-xs text-muted-foreground">{{ warning.url }}: {{ warning.error }}</p></div>',
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
      selectedCount: function () { return this.selectedIds.length; },
      allSelected: function () { return this.items.length > 0 && this.selectedIds.length === this.items.length; },
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
      apiUrl: function (path) {
        return String(Dashboard.getApiBase() || '/api').replace(/\/$/, '') + path;
      },
      request: async function (path, options) {
        var response = await fetch(this.apiUrl(path), Object.assign({}, options, { headers: this.authHeaders() }));
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok || data.success === false) throw new Error(data.error || ('HTTP ' + response.status));
        return data;
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
      resetTargets: function () {
        this.folderId = null;
        this.tagIds = [];
        this.loadStatus();
      },
      parseLinks: async function () {
        var urls = this.urlsText.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        this.parsing = true;
        this.parseError = '';
        this.parseWarnings = [];
        this.importMessage = '';
        try {
          var data = await this.request('/gallery-dl/parse', { method: 'POST', body: JSON.stringify({ libraryId: this.targetLibraryId, urls: urls }) });
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
          var data = await this.request('/gallery-dl/import', {
            method: 'POST',
            body: JSON.stringify({ libraryId: this.targetLibraryId, folderId: this.folderId, tagIds: this.tagIds, items: selected }),
          });
          var successUrls = new Set((data.imported || []).map(function (item) { return item.url; }));
          this.items.forEach(function (item) { if (successUrls.has(item.url)) item.imported = true; });
          var failed = (data.errors || []).length;
          this.importMessage = '成功 ' + successUrls.size + ' 张' + (failed ? '，失败 ' + failed + ' 张' : '');
          this.importError = failed > 0;
        } catch (error) {
          this.importMessage = this.errorText(error);
          this.importError = true;
        } finally {
          this.importing = false;
        }
      },
      errorText: function (error) { return error && error.message ? error.message : String(error); },
    },
  };

  window.MiraPluginComponents['mira_gallery_dl_components_GalleryDlImporter_js'] = GalleryDlImporter;
})();
