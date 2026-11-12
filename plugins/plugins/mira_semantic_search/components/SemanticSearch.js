(function () {
  if (!window.MiraPluginComponents) window.MiraPluginComponents = {};
  var ui = window.MiraDashboardUI || {};
  var Dashboard = window.MiraDashboard || {};

  var SemanticSearch = {
    name: 'SemanticSearch',
    components: {
      MiraBadge: ui.Badge,
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      MiraCardContent: ui.CardContent,
      MiraCardHeader: ui.CardHeader,
      MiraCardTitle: ui.CardTitle,
      MiraInput: ui.Input,
      MiraSelect: ui.Select,
      MiraSelectContent: ui.SelectContent,
      MiraSelectItem: ui.SelectItem,
      MiraSelectTrigger: ui.SelectTrigger,
      MiraSelectValue: ui.SelectValue,
      MiraSeparator: ui.Separator,
    },
    template: [
      '<div class="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 p-4 md:p-6">',
      '  <header>',
      '    <h1 class="text-xl font-semibold">语义搜索</h1>',
      '    <p class="text-xs text-muted-foreground">基于 Ollama embedding 模型（默认 embeddinggemma-2）对素材文本信息建立向量索引，支持自然语言语义检索</p>',
      '  </header>',

      '  <div class="grid gap-4 lg:grid-cols-2">',
      // ── 配置卡片 ──
      '    <MiraCard>',
      '      <MiraCardHeader class="border-b"><MiraCardTitle>Ollama 服务</MiraCardTitle></MiraCardHeader>',
      '      <MiraCardContent class="space-y-3">',
      '        <div class="space-y-1">',
      '          <label class="text-xs text-muted-foreground">API 地址</label>',
      '          <MiraInput v-model="form.apiUrl" placeholder="http://localhost:11434" />',
      '        </div>',
      '        <div class="grid grid-cols-2 gap-3">',
      '          <div class="space-y-1">',
      '            <label class="text-xs text-muted-foreground">模型</label>',
      '            <MiraInput v-model="form.model" placeholder="embeddinggemma-2" />',
      '          </div>',
      '          <div class="space-y-1">',
      '            <label class="text-xs text-muted-foreground">向量维度（MRL 截断）</label>',
      '            <MiraSelect v-model="form.dim">',
      '              <MiraSelectTrigger><MiraSelectValue placeholder="维度" /></MiraSelectTrigger>',
      '              <MiraSelectContent>',
      '                <MiraSelectItem v-for="d in allowedDims" :key="d" :value="String(d)">{{ d }} 维</MiraSelectItem>',
      '              </MiraSelectContent>',
      '            </MiraSelect>',
      '          </div>',
      '        </div>',
      '        <div class="space-y-1">',
      '          <label class="text-xs text-muted-foreground">KNN 加速（sqlite-vec，大库检索提速）</label>',
      '          <MiraSelect v-model="form.vecIndex">',
      '            <MiraSelectTrigger><MiraSelectValue placeholder="启用状态" /></MiraSelectTrigger>',
      '            <MiraSelectContent>',
      '              <MiraSelectItem value="1">启用（不可用时自动回退内存扫描）</MiraSelectItem>',
      '              <MiraSelectItem value="0">关闭（纯内存余弦扫描）</MiraSelectItem>',
      '            </MiraSelectContent>',
      '          </MiraSelect>',
      '        </div>',
      '        <MiraSeparator />',
      '        <div class="space-y-1">',
      '          <label class="text-xs text-muted-foreground">视觉模型（以图搜图，需支持图像输入）</label>',
      '          <MiraInput v-model="form.visionModel" placeholder="如 gemma3:4b，留空关闭图像能力" />',
      '        </div>',
      '        <div class="space-y-1">',
      '          <label class="text-xs text-muted-foreground">打标提示词（决定图片描述风格）</label>',
      '          <MiraInput v-model="form.visionPrompt" placeholder="默认：简洁中文描述主体、场景、风格与色调" />',
      '        </div>',
      '        <div v-if="testResult" class="rounded-md p-2 text-xs" :class="testResult.ok ? \'bg-green-500/10 text-green-700\' : \'bg-destructive/10 text-destructive\'">',
      '          {{ testResult.message }}',
      '        </div>',
      '        <div class="flex flex-wrap gap-2">',
      '          <MiraButton size="sm" :disabled="testing || saving" @click="saveSettings">保存配置</MiraButton>',
      '          <MiraButton size="sm" variant="outline" :disabled="testing" @click="testConnection">{{ testing ? "测试中..." : "测试嵌入" }}</MiraButton>',
      '          <MiraButton size="sm" variant="outline" :disabled="testing || !form.visionModel" @click="testVision">测试视觉模型</MiraButton>',
      '        </div>',
      '        <p class="text-[0.6875rem] leading-relaxed text-muted-foreground">提示：嵌入模型执行 <code>ollama pull embeddinggemma-2</code>；以图搜图需另 pull 视觉模型（如 <code>ollama pull gemma3:4b</code>）。修改维度或模型后需重建索引。</p>',
      '      </MiraCardContent>',
      '    </MiraCard>',

      // ── 索引卡片 ──
      '    <MiraCard>',
      '      <MiraCardHeader class="items-center border-b" style="grid-template-columns:minmax(0,1fr) auto">',
      '        <MiraCardTitle>向量索引</MiraCardTitle>',
      '        <MiraBadge :variant="taskBadgeVariant">{{ taskBadgeText }}</MiraBadge>',
      '      </MiraCardHeader>',
      '      <MiraCardContent class="space-y-3">',
      '        <dl class="grid grid-cols-4 gap-2 text-center text-xs">',
      '          <div class="rounded-md border p-2"><dt class="text-muted-foreground">素材总数</dt><dd class="mt-1 text-base font-semibold">{{ status.totalFiles }}</dd></div>',
      '          <div class="rounded-md border p-2"><dt class="text-muted-foreground">已索引</dt><dd class="mt-1 text-base font-semibold">{{ status.indexedFiles }}</dd></div>',
      '          <div class="rounded-md border p-2"><dt class="text-muted-foreground">图像描述</dt><dd class="mt-1 text-base font-semibold">{{ status.captionedFiles }}</dd></div>',
      '          <div class="rounded-md border p-2"><dt class="text-muted-foreground">失败</dt><dd class="mt-1 text-base font-semibold">{{ task.failed + task.imageFailed }}</dd></div>',
      '        </dl>',
      '        <div v-if="task.running || task.processed" class="space-y-1">',
      '          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">',
      '            <div class="h-full rounded-full bg-primary transition-all" :style="{ width: progressPercent + \'%\' }"></div>',
      '          </div>',
      '          <p class="text-xs text-muted-foreground">{{ task.processed }} / {{ task.total }}（{{ progressPercent }}%）</p>',
      '        </div>',
      '        <div v-if="task.error" class="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{{ task.error }}</div>',
      '        <dl class="space-y-1 text-xs text-muted-foreground">',
      '          <div class="flex items-center gap-2">',
      '            <dt>自动增量同步</dt>',
      '            <MiraBadge :variant="autoSync.active ? \'secondary\' : \'destructive\'">{{ autoSync.active ? "已启用（文件增删改自动更新索引）" : "不可用（eventManager 未挂载）" }}</MiraBadge>',
      '            <MiraBadge v-if="autoSync.active && autoSync.pending" variant="outline">{{ autoSync.pending }} 待同步</MiraBadge>',
      '          </div>',
      '          <div class="flex items-center gap-2">',
      '            <dt>KNN 加速</dt>',
      '            <MiraBadge v-if="vecIndex.enabled && vecIndex.available" variant="secondary">sqlite-vec 已启用</MiraBadge>',
      '            <MiraBadge v-else-if="vecIndex.enabled && !vecIndex.available" variant="destructive" :title="vecIndex.reason || \'\'">不可用，已回退内存扫描</MiraBadge>',
      '            <MiraBadge v-else variant="outline">已关闭</MiraBadge>',
      '          </div>',
      '        </dl>',
      '        <div class="flex flex-wrap gap-2">',
      '          <MiraButton size="sm" :disabled="task.running" @click="startIndex(false)">{{ task.processed && !task.running ? "继续索引" : "开始索引" }}</MiraButton>',
      '          <MiraButton size="sm" variant="outline" :disabled="task.running" @click="startIndex(true)">重建索引</MiraButton>',
      '          <MiraButton size="sm" variant="outline" :disabled="task.running || !vision.enabled" :title="vision.enabled ? \'仅为图片素材补建图像向量，不动文本索引\' : \'需先配置视觉模型\'" @click="startIndex(false, true)">补建图像索引</MiraButton>',
      '          <MiraButton size="sm" variant="destructive" v-if="task.running" @click="stopIndex">停止</MiraButton>',
      '        </div>',
      '        <p class="text-[0.6875rem] leading-relaxed text-muted-foreground">索引内容：文件名、备注、标签、网址与元数据文本；配置视觉模型后图片额外打标建图像向量。增量索引自动跳过未变更素材。</p>',
      '      </MiraCardContent>',
      '    </MiraCard>',
      '  </div>',

      // ── 搜索卡片 ──
      '  <MiraCard class="flex min-h-0 flex-1 flex-col">',
      '    <MiraCardHeader class="border-b"><MiraCardTitle>语义检索</MiraCardTitle></MiraCardHeader>',
      '    <MiraCardContent class="flex min-h-0 flex-1 flex-col gap-3">',
      '      <form class="flex gap-2" @submit.prevent="doSearch">',
      '        <MiraInput v-model="query" placeholder="用自然语言描述要找的素材，如：海边日落的风景照" class="flex-1" />',
      '        <MiraInput v-model.number="topK" type="number" min="1" max="100" style="width:5rem" title="返回条数" />',
      '        <MiraButton type="submit" :disabled="searching || !query.trim()">{{ searching ? "搜索中..." : "搜索" }}</MiraButton>',
      '      </form>',
      '      <div class="flex items-center gap-2">',
      '        <span class="material-icons text-base leading-none text-muted-foreground">image_search</span>',
      '        <label class="cursor-pointer text-sm text-primary underline-offset-2 hover:underline" :class="{ \'opacity-50 pointer-events-none\': !vision.enabled }" :title="vision.enabled ? \'选择一张图片按视觉相似度检索\' : \'需先配置视觉模型\'">',
      '          {{ searchingImage ? "打标检索中..." : "以图搜图" }}',
      '          <input ref="imageInput" type="file" accept="image/*" class="hidden" :disabled="!vision.enabled" @change="onImagePicked" />',
      '        </label>',
      '        <span v-if="queryCaption" class="min-w-0 flex-1 truncate text-xs text-muted-foreground" :title="queryCaption">查询图描述：{{ queryCaption }}</span>',
      '      </div>',
      '      <div v-if="searchError" class="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{{ searchError }}</div>',
      '      <div v-if="searchMessage" class="rounded-md bg-muted p-2 text-xs text-muted-foreground">{{ searchMessage }}</div>',
      '      <div v-if="results.length" class="min-h-0 flex-1 space-y-2 overflow-auto">',
      '        <p class="text-xs text-muted-foreground">共 {{ results.length }} 条结果 · 检索引擎：{{ engine === "sqlite-vec" ? "sqlite-vec KNN" : "内存余弦扫描" }} · 已索引 {{ indexedFiles }} 条</p>',
      '        <div v-for="(item, i) in results" :key="item.fileId" class="flex items-start gap-3 rounded-md border p-2">',
      '          <span class="mt-0.5 w-6 shrink-0 text-center text-xs text-muted-foreground">{{ i + 1 }}</span>',
      '          <div class="min-w-0 flex-1">',
      '            <div class="flex flex-wrap items-center gap-2">',
      '              <span class="truncate text-sm font-medium">{{ item.name }}</span>',
      '              <MiraBadge variant="secondary">{{ (item.score * 100).toFixed(1) }}%</MiraBadge>',
      '              <MiraBadge v-if="item.via === \'image\'" variant="outline">视觉</MiraBadge>',
      '            </div>',
      '            <p v-if="item.caption" class="mt-1 truncate text-xs text-muted-foreground" :title="item.caption">{{ item.caption }}</p>',
      '            <p v-else-if="item.notes" class="mt-1 truncate text-xs text-muted-foreground" :title="item.notes">{{ item.notes }}</p>',
      '            <div class="mt-1 flex flex-wrap items-center gap-1">',
      '              <MiraBadge v-for="tag in item.tags" :key="String(tag)" variant="outline" class="text-[0.625rem]">{{ typeof tag === "object" ? (tag.title || tag.name) : tag }}</MiraBadge>',
      '              <button v-if="item.thumb === 1 || isImageName(item.name)" class="text-[0.625rem] text-primary underline-offset-2 hover:underline" @click.prevent="searchByImage(item.fileId)">以此图搜索</button>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <p v-else-if="!searching && !searchingImage && searched" class="py-8 text-center text-sm text-muted-foreground">没有匹配的素材</p>',
      '    </MiraCardContent>',
      '  </MiraCard>',
      '</div>',
    ].join('\n'),
    data: function () {
      return {
        libraryId: '',
        allowedDims: [768, 512, 256, 128],
        form: { apiUrl: 'http://localhost:11434', model: 'embeddinggemma-2', dim: '768', vecIndex: '1', visionModel: '', visionPrompt: '' },
        saving: false,
        testing: false,
        testResult: null,
        status: { totalFiles: 0, indexedFiles: 0, captionedFiles: 0 },
        task: { running: false, processed: 0, total: 0, skipped: 0, failed: 0, imageDone: 0, imageFailed: 0, error: null },
        vecIndex: { enabled: true, available: false, reason: null },
        vision: { enabled: false, model: null },
        autoSync: { active: false, pending: 0 },
        pollTimer: null,
        query: '',
        topK: 20,
        searching: false,
        searchingImage: false,
        searched: false,
        searchError: '',
        searchMessage: '',
        queryCaption: '',
        engine: '',
        indexedFiles: 0,
        results: [],
      };
    },
    computed: {
      progressPercent: function () {
        if (!this.task.total) return 0;
        return Math.min(100, Math.round((this.task.processed / this.task.total) * 100));
      },
      taskBadgeVariant: function () {
        if (this.task.running) return 'default';
        if (this.task.error) return 'destructive';
        return 'secondary';
      },
      taskBadgeText: function () {
        if (this.task.running) return '索引中';
        if (this.task.error) return '已停止';
        return '空闲';
      },
    },
    mounted: async function () {
      // 插件路由按 libraryId 寻址，所有 API 请求必须携带（与 ai_sdk 组件一致）
      try {
        var libraries = await Dashboard.getLibraries();
        var routeLibraryId = this.$route && this.$route.meta && this.$route.meta.libraryId;
        this.libraryId = libraries.some(function (lib) { return lib.id === routeLibraryId; })
          ? routeLibraryId
          : (libraries[0] && libraries[0].id) || '';
      } catch (error) {
        console.warn('[semantic-search] getLibraries failed:', error.message);
      }
      this.loadSettings();
      this.refreshStatus();
    },
    beforeUnmount: function () {
      this.stopPolling();
    },
    methods: {
      authHeaders: function () {
        var headers = { 'Content-Type': 'application/json' };
        var token = localStorage.getItem('token');
        if (token) headers.Authorization = 'Bearer ' + token;
        return headers;
      },
      apiUrl: function (path) {
        var base = String(Dashboard.getApiBase() || '/api').replace(/\/$/, '') + path;
        return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'libraryId=' + encodeURIComponent(this.libraryId);
      },
      request: async function (path, options) {
        var response = await fetch(this.apiUrl(path), Object.assign({}, options, { headers: this.authHeaders() }));
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok || data.success === false) {
          throw new Error(data.error || data.message || 'HTTP ' + response.status);
        }
        return data;
      },
      loadSettings: async function () {
        try {
          var data = await this.request('/semantic-search/settings', { method: 'GET' });
          var s = data.data || {};
          this.form.apiUrl = s.apiUrl || this.form.apiUrl;
          this.form.model = s.model || this.form.model;
          this.form.dim = String(s.dim || 768);
          this.form.vecIndex = s.vecIndex === false ? '0' : '1';
          this.form.visionModel = s.visionModel || '';
          this.form.visionPrompt = s.visionPrompt || '';
          this.allowedDims = s.allowedDims || this.allowedDims;
        } catch (error) {
          this.testResult = { ok: false, message: '读取配置失败：' + error.message };
        }
      },
      settingsBody: function () {
        return JSON.stringify({
          apiUrl: this.form.apiUrl,
          model: this.form.model,
          dim: Number(this.form.dim),
          vecIndex: this.form.vecIndex === '1',
          visionModel: this.form.visionModel,
          visionPrompt: this.form.visionPrompt,
        });
      },
      saveSettings: async function () {
        this.saving = true;
        try {
          await this.request('/semantic-search/settings', { method: 'POST', body: this.settingsBody() });
          this.testResult = { ok: true, message: '配置已保存' };
          this.refreshStatus();
        } catch (error) {
          this.testResult = { ok: false, message: error.message };
        } finally {
          this.saving = false;
        }
      },
      testConnection: async function () {
        this.testing = true;
        this.testResult = null;
        try {
          await this.saveSettingsQuietly();
          var data = await this.request('/semantic-search/test', { method: 'POST', body: '{}' });
          var d = data.data || {};
          this.testResult = {
            ok: true,
            message: '连接成功：模型 ' + d.model + ' 输出 ' + d.modelDim + ' 维' +
              (d.truncating ? '（将截断为 ' + d.configuredDim + ' 维）' : '') +
              '，耗时 ' + d.latencyMs + 'ms',
          };
        } catch (error) {
          this.testResult = { ok: false, message: error.message };
        } finally {
          this.testing = false;
        }
      },
      saveSettingsQuietly: function () {
        return this.request('/semantic-search/settings', { method: 'POST', body: this.settingsBody() })
          .catch(function () { /* 保存失败交由显式保存/测试报告 */ });
      },
      testVision: async function () {
        this.testing = true;
        this.testResult = null;
        try {
          await this.saveSettingsQuietly();
          var data = await this.request('/semantic-search/test', { method: 'POST', body: JSON.stringify({ vision: true }) });
          var d = data.data || {};
          this.testResult = { ok: true, message: '视觉模型 ' + d.model + ' 可用（' + d.latencyMs + 'ms）' };
        } catch (error) {
          this.testResult = { ok: false, message: error.message };
        } finally {
          this.testing = false;
        }
      },
      refreshStatus: async function () {
        try {
          var data = await this.request('/semantic-search/status', { method: 'GET' });
          this.status = { totalFiles: data.data.totalFiles, indexedFiles: data.data.indexedFiles, captionedFiles: data.data.captionedFiles || 0 };
          this.task = data.data.task;
          this.vecIndex = data.data.vecIndex || { enabled: false, available: false, reason: null };
          this.vision = data.data.vision || { enabled: false, model: null };
          this.autoSync = data.data.autoSync || { active: false, pending: 0 };
          if (this.task.running) this.startPolling();
          else this.stopPolling();
        } catch (error) {
          console.warn('[semantic-search] status failed:', error.message);
        }
      },
      startPolling: function () {
        if (this.pollTimer) return;
        var self = this;
        this.pollTimer = setInterval(function () { self.refreshStatus(); }, 2000);
      },
      stopPolling: function () {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      },
      startIndex: async function (force, imagesOnly) {
        if (force && !window.confirm('重建将清空现有向量索引并全量重新嵌入，确认继续？')) return;
        if (imagesOnly && !this.form.visionModel) {
          this.task.error = '补建图像索引需先保存视觉模型配置';
          return;
        }
        try {
          await this.saveSettingsQuietly();
          await this.request('/semantic-search/index', { method: 'POST', body: JSON.stringify({ force: !!force, imagesOnly: !!imagesOnly }) });
          this.refreshStatus();
        } catch (error) {
          this.task.error = error.message;
        }
      },
      stopIndex: async function () {
        try {
          await this.request('/semantic-search/stop', { method: 'POST', body: '{}' });
          this.refreshStatus();
        } catch (error) {
          console.warn('[semantic-search] stop failed:', error.message);
        }
      },
      isImageName: function (name) {
        return /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i.test(String(name || ''));
      },
      resetSearchState: function () {
        this.searched = true;
        this.searchError = '';
        this.searchMessage = '';
        this.queryCaption = '';
        this.results = [];
      },
      doSearch: async function () {
        var q = this.query.trim();
        if (!q) return;
        this.searching = true;
        this.resetSearchState();
        try {
          var data = await this.request('/semantic-search/search', {
            method: 'POST',
            body: JSON.stringify({ query: q, topK: this.topK }),
          });
          this.results = data.data.results || [];
          this.engine = data.data.engine || '';
          this.indexedFiles = data.data.indexedFiles || 0;
          if (!this.results.length) {
            this.searchMessage = data.data.message || '没有匹配的素材（相似度阈值 5%）';
          }
        } catch (error) {
          this.searchError = error.message;
        } finally {
          this.searching = false;
        }
      },
      /** 以图搜图：本地文件上传入口 */
      onImagePicked: function (event) {
        var file = event.target.files && event.target.files[0];
        event.target.value = ''; // 允许重复选择同一文件
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) {
          this.searchError = '图片过大（超过 15MB）';
          this.searched = true;
          return;
        }
        var self = this;
        var reader = new FileReader();
        reader.onload = function () {
          var base64 = String(reader.result || '').replace(/^data:[^;]*;base64,/, '');
          self.runImageSearch({ imageBase64: base64, name: file.name });
        };
        reader.onerror = function () {
          self.searchError = '读取图片失败';
        };
        reader.readAsDataURL(file);
      },
      /** 以图搜图：库内素材入口（结果项「以此图搜索」） */
      searchByImage: function (fileId) {
        this.runImageSearch({ fileId: fileId });
      },
      runImageSearch: async function (payload) {
        this.searchingImage = true;
        this.resetSearchState();
        try {
          var data = await this.request('/semantic-search/search-image', {
            method: 'POST',
            body: JSON.stringify(Object.assign({ topK: this.topK }, payload)),
          });
          var d = data.data || {};
          this.results = d.results || [];
          this.engine = d.engine || '';
          this.queryCaption = d.caption || '';
          if (!this.results.length) {
            this.searchMessage = d.message || '没有视觉相似的素材';
          }
        } catch (error) {
          this.searchError = error.message;
        } finally {
          this.searchingImage = false;
        }
      },
    },
  };

  window.MiraPluginComponents['mira_semantic_search_components_SemanticSearch_js'] = SemanticSearch;
})();
