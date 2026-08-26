(function () {
  if (!window.MiraPluginComponents) window.MiraPluginComponents = {};
  var ui = window.MiraDashboardUI || {};
  var Dashboard = window.MiraDashboard || {};

  // MiraDashboardUI 未暴露 Empty 组件，按 mira-plugin-ui 的 empty 样式内联复刻
  var AiEmpty = {
    template: '<div class="flex min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center md:p-12"><slot /></div>',
  };
  var AiEmptyMedia = {
    template: '<div class="mb-2 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><slot /></div>',
  };
  var AiEmptyTitle = {
    template: '<div class="text-lg font-medium tracking-tight"><slot /></div>',
  };
  var AiEmptyDescription = {
    template: '<p class="max-w-sm text-sm leading-relaxed text-muted-foreground"><slot /></p>',
  };

  var AiSdkManager = {
    name: 'AiSdkManager',
    components: {
      AiEmpty: AiEmpty,
      AiEmptyMedia: AiEmptyMedia,
      AiEmptyTitle: AiEmptyTitle,
      AiEmptyDescription: AiEmptyDescription,
      MiraBadge: ui.Badge,
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      MiraCardContent: ui.CardContent,
      MiraCardHeader: ui.CardHeader,
      MiraCardTitle: ui.CardTitle,
      MiraCombobox: ui.Combobox,
      MiraComboboxAnchor: ui.ComboboxAnchor,
      MiraComboboxEmpty: ui.ComboboxEmpty,
      MiraComboboxInput: ui.ComboboxInput,
      MiraComboboxItem: ui.ComboboxItem,
      MiraComboboxItemIndicator: ui.ComboboxItemIndicator,
      MiraComboboxList: ui.ComboboxList,
      MiraComboboxTrigger: ui.ComboboxTrigger,
      MiraComboboxViewport: ui.ComboboxViewport,
      MiraDialog: ui.Dialog,
      MiraDialogContent: ui.DialogContent,
      MiraDialogHeader: ui.DialogHeader,
      MiraDialogTitle: ui.DialogTitle,
      MiraDialogDescription: ui.DialogDescription,
      MiraDialogFooter: ui.DialogFooter,
      MiraInput: ui.Input,
      MiraLabel: ui.Label,
      MiraScrollArea: ui.ScrollArea,
      MiraSelect: ui.Select,
      MiraSelectContent: ui.SelectContent,
      MiraSelectItem: ui.SelectItem,
      MiraSelectTrigger: ui.SelectTrigger,
      MiraSelectValue: ui.SelectValue,
      MiraSeparator: ui.Separator,
      MiraTabs: ui.Tabs,
      MiraTabsContent: ui.TabsContent,
      MiraTabsList: ui.TabsList,
      MiraTabsTrigger: ui.TabsTrigger,
      MiraTagsInput: ui.TagsInput,
      MiraTagsInputInput: ui.TagsInputInput,
      MiraTagsInputItem: ui.TagsInputItem,
      MiraTagsInputItemDelete: ui.TagsInputItemDelete,
      MiraTagsInputItemText: ui.TagsInputItemText,
      MiraTextarea: ui.Textarea,
    },
    template: [
      '<div class="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 p-4 md:p-6">',
      '  <header class="flex flex-wrap items-center justify-between gap-3">',
      '    <div>',
      '      <h1 class="text-xl font-semibold">AI 服务商</h1>',
      '      <p class="text-xs text-muted-foreground">基于 Vercel AI SDK，统一管理多个 OpenAI 兼容服务商，并通过 /ai-sdk/chat 提供 AI 聊天接口</p>',
      '    </div>',
      '    <div class="flex items-center gap-2">',
      '      <MiraButton v-if="providers.length" variant="outline" @click="openTestDialog()">测试</MiraButton>',
      '      <MiraButton @click="openCreate">新建服务商</MiraButton>',
      '    </div>',
      '  </header>',

      '  <div v-if="!providers.length && !loading" class="flex flex-1 items-center justify-center">',
      '    <AiEmpty class="w-full max-w-md">',
      '      <AiEmptyMedia><span class="material-icons text-xl leading-none">smart_toy</span></AiEmptyMedia>',
      '      <AiEmptyTitle>还没有 AI 服务商</AiEmptyTitle>',
      '      <AiEmptyDescription>从 models.dev 内置预设选择，或手动填写 Base URL、API Key 与模型列表</AiEmptyDescription>',
      '      <MiraButton @click="openCreate">新建服务商</MiraButton>',
      '    </AiEmpty>',
      '  </div>',

      '  <div class="grid gap-4 lg:grid-cols-2">',
      '    <MiraCard v-for="provider in providers" :key="provider.id" size="sm">',
      '      <MiraCardHeader class="items-center border-b" style="grid-template-columns:minmax(0,1fr) auto">',
      '        <div class="flex min-w-0 items-center gap-2">',
      '          <MiraCardTitle class="truncate">{{ provider.name }}</MiraCardTitle>',
      '          <MiraBadge v-if="provider.isDefault">默认</MiraBadge>',
      '        </div>',
      '        <MiraBadge variant="secondary">{{ provider.models.length }} 个模型</MiraBadge>',
      '      </MiraCardHeader>',
      '      <MiraCardContent class="space-y-3">',
      '        <dl class="space-y-1 text-xs">',
      '          <div class="flex gap-2"><dt class="w-16 shrink-0 text-muted-foreground">Base URL</dt><dd class="min-w-0 break-all">{{ provider.baseUrl }}</dd></div>',
      '          <div class="flex gap-2"><dt class="w-16 shrink-0 text-muted-foreground">API Key</dt><dd class="min-w-0 break-all font-mono">{{ provider.hasApiKey ? provider.apiKeyMasked : \'未配置\' }}</dd></div>',
      '        </dl>',
      '        <div class="flex flex-wrap gap-1">',
      '          <MiraBadge v-for="model in provider.models" :key="model" variant="outline" class="font-mono text-[0.625rem]">{{ model }}</MiraBadge>',
      '        </div>',
      '        <div v-if="testResults[provider.id]" class="rounded-md p-2 text-xs" :class="testResults[provider.id].ok ? \'bg-green-500/10 text-green-700\' : \'bg-destructive/10 text-destructive\'">',
      '          {{ testResults[provider.id].message }}',
      '        </div>',
      '        <div class="flex flex-wrap gap-2">',
      '          <MiraButton size="sm" :disabled="testingId === provider.id" @click="testProvider(provider)">{{ testingId === provider.id ? "测试中..." : "测试连接" }}</MiraButton>',
      '          <MiraButton v-if="!provider.isDefault" size="sm" variant="outline" @click="setDefault(provider)">设为默认</MiraButton>',
      '          <MiraButton size="sm" variant="outline" @click="openEdit(provider)">编辑</MiraButton>',
      '          <MiraButton size="sm" variant="destructive" @click="deleteProvider(provider)">删除</MiraButton>',
      '        </div>',
      '      </MiraCardContent>',
      '    </MiraCard>',
      '  </div>',

      '  <MiraDialog v-model:open="testDialogOpen">',
      '    <!-- 宽高用内联 style：插件模板不在 dashboard Tailwind 扫描范围，任意值类不会生成 -->',
      '    <MiraDialogContent class="flex flex-col" style="width:80%;height:80%;max-width:none">',
      '      <MiraDialogHeader>',
      '        <MiraDialogTitle>AI 测试</MiraDialogTitle>',
      '        <MiraDialogDescription>在线测试聊天（流式）与图片生成接口</MiraDialogDescription>',
      '      </MiraDialogHeader>',
      '      <MiraTabs class="min-h-0 flex-1" :model-value="activeTestTab" @update:model-value="activeTestTab = String($event)">',
      '        <MiraTabsList>',
      '          <MiraTabsTrigger value="chat">聊天测试</MiraTabsTrigger>',
      '          <MiraTabsTrigger value="image">图片生成</MiraTabsTrigger>',
      '        </MiraTabsList>',
      '        <MiraTabsContent value="chat" class="flex min-h-0 flex-col gap-3">',
      '          <div class="flex flex-wrap items-end gap-3">',
      '            <div class="w-56 space-y-1"><MiraLabel>服务商</MiraLabel>',
      '              <MiraSelect :model-value="chatProviderId" @update:model-value="onChatProviderChange">',
      '                <MiraSelectTrigger class="w-full"><MiraSelectValue placeholder="选择服务商" /></MiraSelectTrigger>',
      '                <MiraSelectContent><MiraSelectItem v-for="provider in providers" :key="provider.id" :value="provider.id">{{ provider.name }}</MiraSelectItem></MiraSelectContent>',
      '              </MiraSelect>',
      '            </div>',
      '            <div class="w-64 space-y-1"><MiraLabel>模型</MiraLabel>',
      '              <MiraSelect :model-value="chatModel" @update:model-value="chatModel = $event" :disabled="!chatModels.length">',
      '                <MiraSelectTrigger class="w-full"><MiraSelectValue placeholder="选择模型" /></MiraSelectTrigger>',
      '                <MiraSelectContent><MiraSelectItem v-for="model in chatModels" :key="model" :value="model">{{ model }}</MiraSelectItem></MiraSelectContent>',
      '              </MiraSelect>',
      '            </div>',
      '          </div>',
      '          <div class="flex min-h-0 flex-1 flex-col rounded-md border">',
      '            <MiraScrollArea class="min-h-0 flex-1">',
      '              <div class="space-y-3 p-3">',
      '                <div v-if="!chatMessages.length" class="flex h-full items-center justify-center text-xs text-muted-foreground" style="min-height:14rem">输入消息测试聊天接口（流式）</div>',
      '                <div v-for="(message, index) in chatMessages" :key="index" class="flex" :class="message.role === \'user\' ? \'justify-end\' : \'justify-start\'">',
      '                  <div class="max-w-[85%] whitespace-pre-wrap break-words rounded-md px-3 py-2 text-xs leading-relaxed" :class="message.role === \'user\' ? \'bg-primary text-primary-foreground\' : \'bg-muted\'">{{ message.content }}<span v-if="message.cursor" class="animate-pulse">▍</span></div>',
      '                </div>',
      '              </div>',
      '            </MiraScrollArea>',
      '          </div>',
      '          <div class="flex gap-2">',
      '            <MiraInput v-model="chatInput" placeholder="输入消息，Enter 发送" :disabled="sending" @keydown.enter.prevent="sendChat" />',
      '            <MiraButton :disabled="sending || !chatModel || !chatInput.trim()" @click="sendChat">{{ sending ? "回复中..." : "发送" }}</MiraButton>',
      '            <MiraButton v-if="chatMessages.length" variant="outline" :disabled="sending" @click="clearChat">清空</MiraButton>',
      '          </div>',
      '        </MiraTabsContent>',
      '        <MiraTabsContent value="image" class="flex min-h-0 flex-col gap-3">',
      '          <div class="flex flex-wrap items-end gap-3">',
      '            <div class="w-56 space-y-1"><MiraLabel>服务商</MiraLabel>',
      '              <MiraSelect :model-value="imgProviderId" @update:model-value="onImgProviderChange">',
      '                <MiraSelectTrigger class="w-full"><MiraSelectValue placeholder="选择服务商" /></MiraSelectTrigger>',
      '                <MiraSelectContent><MiraSelectItem v-for="provider in providers" :key="provider.id" :value="provider.id">{{ provider.name }}</MiraSelectItem></MiraSelectContent>',
      '              </MiraSelect>',
      '            </div>',
      '            <div class="w-64 space-y-1"><MiraLabel>模型</MiraLabel>',
      '              <MiraSelect :model-value="imgModel" @update:model-value="imgModel = $event" :disabled="!imgModels.length">',
      '                <MiraSelectTrigger class="w-full"><MiraSelectValue placeholder="选择模型" /></MiraSelectTrigger>',
      '                <MiraSelectContent><MiraSelectItem v-for="model in imgModels" :key="model" :value="model">{{ model }}</MiraSelectItem></MiraSelectContent>',
      '              </MiraSelect>',
      '            </div>',
      '            <div class="w-40 space-y-1"><MiraLabel>尺寸</MiraLabel>',
      '              <MiraSelect :model-value="imgSize" @update:model-value="imgSize = $event">',
      '                <MiraSelectTrigger class="w-full"><MiraSelectValue /></MiraSelectTrigger>',
      '                <MiraSelectContent>',
      '                  <MiraSelectItem value="auto">自动</MiraSelectItem>',
      '                  <MiraSelectItem value="1024x1024">1024x1024 方形</MiraSelectItem>',
      '                  <MiraSelectItem value="1024x1536">1024x1536 竖版</MiraSelectItem>',
      '                  <MiraSelectItem value="1536x1024">1536x1024 横版</MiraSelectItem>',
      '                  <MiraSelectItem value="1024x1792">1024x1792 竖版</MiraSelectItem>',
      '                  <MiraSelectItem value="1792x1024">1792x1024 横版</MiraSelectItem>',
      '                </MiraSelectContent>',
      '              </MiraSelect>',
      '            </div>',
      '            <div class="w-24 space-y-1"><MiraLabel>数量</MiraLabel>',
      '              <MiraSelect :model-value="imgN" @update:model-value="imgN = Number($event)">',
      '                <MiraSelectTrigger class="w-full"><MiraSelectValue /></MiraSelectTrigger>',
      '                <MiraSelectContent>',
      '                  <MiraSelectItem v-for="count in [1, 2, 3, 4]" :key="count" :value="count">{{ count }}</MiraSelectItem>',
      '                </MiraSelectContent>',
      '              </MiraSelect>',
      '            </div>',
      '          </div>',
      '          <MiraTextarea v-model="imgPrompt" rows="2" placeholder="描述要生成的图片，如：A cat on a roof, watercolor style" :disabled="generating" />',
      '          <div class="space-y-1">',
      '            <div class="flex items-center justify-between">',
      '              <MiraLabel>参考图（{{ imgFiles.length ? "编辑模式 /images/edits" : "可选，传入后编辑图片" }}）</MiraLabel>',
      '              <button type="button" class="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" :disabled="generating || imgFiles.length >= 4" @click="pickImages">添加参考图（最多 4 张）</button>',
      '            </div>',
      '            <div v-if="imgFiles.length" class="flex flex-wrap gap-2">',
      '              <div v-for="(file, index) in imgFiles" :key="index" class="group relative">',
      '                <img :src="file.dataUrl" :alt="file.name" class="size-16 rounded-md border object-cover" />',
      '                <span class="absolute -right-1 -top-1 hidden size-4 cursor-pointer items-center justify-center rounded-full bg-destructive text-[0.625rem] leading-none text-destructive-foreground group-hover:flex" @click="removeImgFile(index)">×</span>',
      '              </div>',
      '            </div>',
      '          </div>',
      '          <input ref="imgFileInput" type="file" accept="image/*" multiple class="hidden" @change="onImageFilesChange" />',
      '          <div class="flex justify-end"><MiraButton :disabled="generating || !imgModel || !imgPrompt.trim()" @click="generateImages">{{ generating ? "生成中..." : "生成图片" }}</MiraButton></div>',
      '          <p v-if="imgError" class="text-xs text-destructive">{{ imgError }}</p>',
      '          <p v-if="imgInfo" class="text-xs text-muted-foreground">{{ imgInfo }}</p>',
      '          <div v-if="imgResults.length" class="grid grid-cols-2 gap-2 sm:grid-cols-4">',
      '            <a v-for="(image, index) in imgResults" :key="index" href="#" @click.prevent="openImage(image)" class="block overflow-hidden rounded-md border">',
      '              <img :src="image.dataUrl" class="aspect-square w-full object-cover" />',
      '            </a>',
      '          </div>',
      '        </MiraTabsContent>',
      '      </MiraTabs>',
      '    </MiraDialogContent>',
      '  </MiraDialog>',

'  <MiraDialog v-model:open="dialogOpen">',
      '    <MiraDialogContent class="max-w-lg">',
      '      <MiraDialogHeader>',
      '        <MiraDialogTitle>{{ editingId ? "编辑服务商" : "新建服务商" }}</MiraDialogTitle>',
      '        <MiraDialogDescription>配置 OpenAI 兼容接口的 Base URL、API Key 与模型列表</MiraDialogDescription>',
      '      </MiraDialogHeader>',
      '      <div class="space-y-3">',
      '        <div class="space-y-1">',
      '          <div class="flex items-center justify-between">',
      '            <MiraLabel>从预设选择（models.dev）</MiraLabel>',
      '            <button type="button" class="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" :disabled="refreshingPresets" @click="refreshPresets">{{ refreshingPresets ? "更新中..." : "更新预设目录" }}</button>',
      '          </div>',
      '          <div class="flex items-start gap-2">',
      '            <div class="min-w-0 flex-1">',
      '              <MiraCombobox :model-value="selectedPresetId" :display-value="presetLabel" ignore-filter @update:model-value="onPresetSelect">',
      '                <MiraComboboxAnchor as-child>',
      '                  <MiraComboboxTrigger as-child>',
      '                    <MiraButton variant="outline" class="w-full justify-between gap-1 font-normal">',
      '                      <span class="truncate">{{ presetLabel(selectedPresetId) || \'搜索并选择服务商（如 DeepSeek）\' }}</span>',
      '                      <span class="flex shrink-0 items-center gap-0.5">',
      '                        <span v-if="selectedPresetId" class="material-icons text-sm opacity-50 hover:opacity-100" @click.stop.prevent="clearPreset">close</span>',
      '                        <span class="material-icons text-sm opacity-50">expand_more</span>',
      '                      </span>',
      '                    </MiraButton>',
      '                  </MiraComboboxTrigger>',
      '                </MiraComboboxAnchor>',
      '                <MiraComboboxList class="z-[60]">',
      '                  <div class="p-1"><MiraComboboxInput :model-value="presetSearch" placeholder="搜索名称 / Base URL" @update:model-value="presetSearch = String($event ?? \'\')" /></div>',
      '                  <MiraComboboxEmpty>没有匹配的服务商</MiraComboboxEmpty>',
      '                  <MiraComboboxViewport>',
      '                    <MiraComboboxItem v-for="preset in filteredPresets" :key="preset.id" :value="preset.id" class="justify-between gap-2">',
      '                      <span class="min-w-0 flex-1 truncate">{{ preset.name }}<span class="ml-1 text-xs text-muted-foreground">{{ preset.baseUrl }}</span></span>',
      '                      <span class="shrink-0 text-xs text-muted-foreground">{{ preset.modelCount }}</span>',
      '                      <MiraComboboxItemIndicator><span class="material-icons text-sm">check</span></MiraComboboxItemIndicator>',
      '                    </MiraComboboxItem>',
      '                  </MiraComboboxViewport>',
      '                </MiraComboboxList>',
      '              </MiraCombobox>',
      '            </div>',
      '          </div>',
      '          <p v-if="selectedPreset" class="break-all text-xs text-muted-foreground">已选: {{ selectedPreset.name }} → {{ selectedPreset.baseUrl }}（{{ selectedPreset.modelCount }} 个模型）</p>',
      '          <p v-else-if="presetsUpdatedAt" class="text-xs text-muted-foreground">预设目录更新于 {{ presetsUpdatedAt.slice(0, 10) }}，共 {{ presets.length }} 个服务商</p>',
      '        </div>',
      '        <MiraSeparator />',
      '        <div class="space-y-1"><MiraLabel for="ai-sdk-name">名称</MiraLabel>',
      '          <MiraInput id="ai-sdk-name" v-model="form.name" placeholder="如 DeepSeek / OpenRouter / 本地 LM Studio" />',
      '        </div>',
      '        <div class="space-y-1"><MiraLabel for="ai-sdk-base-url">Base URL</MiraLabel>',
      '          <MiraInput id="ai-sdk-base-url" v-model="form.baseUrl" placeholder="https://api.deepseek.com/v1" class="font-mono" />',
      '        </div>',
      '        <div class="space-y-1"><MiraLabel for="ai-sdk-api-key">API Key</MiraLabel>',
      '          <MiraInput id="ai-sdk-api-key" v-model="form.apiKey" type="password" :placeholder="editingId ? \'留空则保持不变\' : \'sk-...\'" class="font-mono" />',
      '        </div>',
      '        <div class="space-y-1"><MiraLabel for="ai-sdk-models">模型列表</MiraLabel>',
      '          <MiraTagsInput :model-value="form.models" @update:model-value="form.models = Array.isArray($event) ? $event.map(String) : []" class="gap-1.5">',
      '            <MiraTagsInputItem v-for="model in form.models" :key="model" :value="model">',
      '              <MiraTagsInputItemText>{{ model }}</MiraTagsInputItemText>',
      '              <MiraTagsInputItemDelete />',
      '            </MiraTagsInputItem>',
      '            <MiraTagsInputInput placeholder="输入模型 id，回车添加" />',
      '          </MiraTagsInput>',
      '          <p class="text-xs text-muted-foreground">共 {{ form.models.length }} 个模型{{ importingModels ? "，正在导入预设..." : "" }}</p>',
      '        </div>',
      '        <p v-if="formError" class="text-xs text-destructive">{{ formError }}</p>',
      '      </div>',
      '      <MiraDialogFooter>',
      '        <MiraButton variant="outline" @click="dialogOpen = false">取消</MiraButton>',
      '        <MiraButton :disabled="saving" @click="saveProvider">{{ saving ? "保存中..." : "保存" }}</MiraButton>',
      '      </MiraDialogFooter>',
      '    </MiraDialogContent>',
      '  </MiraDialog>',
      '</div>',
    ].join(''),
    data: function () {
      return {
        libraryId: '',
        loading: false,
        providers: [],
        defaultProviderId: null,
        testResults: {},
        testingId: '',
        dialogOpen: false,
        editingId: '',
        saving: false,
        formError: '',
        form: { name: '', baseUrl: '', apiKey: '', models: [] },
        presets: [],
        presetsUpdatedAt: '',
        presetSearch: '',
        selectedPresetId: '',
        importingModels: false,
        refreshingPresets: false,
        chatProviderId: '',
        chatModel: '',
        chatInput: '',
        chatMessages: [],
        sending: false,
        testDialogOpen: false,
        activeTestTab: 'chat',
        imgProviderId: '',
        imgModel: '',
        imgPrompt: '',
        imgSize: 'auto',
        imgN: 1,
        imgFiles: [],
        generating: false,
        imgError: '',
        imgInfo: '',
        imgResults: [],
      };
    },
    computed: {
      chatModels: function () {
        var provider = this.providers.find(function (item) { return item.id === this.chatProviderId; }, this);
        return provider ? provider.models : [];
      },
      imgModels: function () {
        var provider = this.providers.find(function (item) { return item.id === this.imgProviderId; }, this);
        return provider ? provider.models : [];
      },
      selectedPreset: function () {
        return this.presets.find(function (item) { return item.id === this.selectedPresetId; }, this) || null;
      },
      filteredPresets: function () {
        var keyword = this.presetSearch.trim().toLowerCase();
        if (!keyword) return this.presets;
        return this.presets.filter(function (item) {
          return item.name.toLowerCase().indexOf(keyword) >= 0
            || item.id.toLowerCase().indexOf(keyword) >= 0
            || item.baseUrl.toLowerCase().indexOf(keyword) >= 0;
        });
      },
    },
    mounted: async function () {
      this.loading = true;
      try {
        var libraries = await Dashboard.getLibraries();
        var routeLibraryId = this.$route && this.$route.meta && this.$route.meta.libraryId;
        this.libraryId = libraries.some(function (lib) { return lib.id === routeLibraryId; })
          ? routeLibraryId
          : (libraries[0] && libraries[0].id) || '';
        await this.loadProviders();
      } finally {
        this.loading = false;
      }
    },
    methods: {
      authHeaders: function () {
        var headers = { 'Content-Type': 'application/json' };
        var token = localStorage.getItem('token');
        if (token) headers.Authorization = 'Bearer ' + token;
        return headers;
      },
      apiUrl: function (path, withLibraryQuery) {
        var base = String(Dashboard.getApiBase() || '/api').replace(/\/$/, '') + path;
        return withLibraryQuery ? base + '?libraryId=' + encodeURIComponent(this.libraryId) : base;
      },
      request: async function (path, options) {
        var response = await fetch(this.apiUrl(path), Object.assign({}, options, { headers: this.authHeaders() }));
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok || data.success === false) {
          throw new Error(data.error || data.message || ('HTTP ' + response.status));
        }
        return data;
      },
      loadProviders: async function () {
        var data = await this.request('/ai-sdk/providers/list' + (this.libraryId ? '?libraryId=' + encodeURIComponent(this.libraryId) : ''), { method: 'GET' });
        this.providers = data.providers || [];
        this.defaultProviderId = data.defaultProviderId || null;
        if (!this.chatProviderId) {
          var preferred = this.providers.find(function (item) { return item.isDefault; }) || this.providers[0];
          if (preferred) this.onChatProviderChange(preferred.id);
        }
        if (!this.imgProviderId && this.chatProviderId) this.onImgProviderChange(this.chatProviderId);
      },
      openCreate: function () {
        this.editingId = '';
        this.formError = '';
        this.form = { name: '', baseUrl: '', apiKey: '', models: [] };
        this.presetSearch = '';
        this.selectedPresetId = '';
        if (!this.presets.length) this.loadPresets();
        this.dialogOpen = true;
      },
      openEdit: function (provider) {
        this.editingId = provider.id;
        this.formError = '';
        this.form = {
          name: provider.name,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKeyMasked,
          models: (provider.models || []).slice(),
        };
        this.presetSearch = '';
        this.selectedPresetId = '';
        this.dialogOpen = true;
      },
      loadPresets: async function () {
        try {
          var data = await this.request('/ai-sdk/presets/list' + (this.libraryId ? '?libraryId=' + encodeURIComponent(this.libraryId) : ''), { method: 'GET' });
          this.presets = data.providers || [];
          this.presetsUpdatedAt = data.updatedAt || '';
        } catch (error) {
          this.formError = this.errorText(error);
        }
      },
      presetLabel: function (value) {
        var preset = this.presets.find(function (item) { return item.id === value; });
        return preset ? preset.name : '';
      },
      onPresetSelect: function (value) {
        this.selectedPresetId = value || '';
        var preset = this.selectedPreset;
        if (preset) {
          this.form.name = preset.name;
          this.form.baseUrl = preset.baseUrl;
          this.applyPresetModels(preset);
        }
      },
      applyPresetModels: async function (preset) {
        this.importingModels = true;
        try {
          var data = await this.request('/ai-sdk/presets/models', {
            method: 'POST',
            body: JSON.stringify({ libraryId: this.libraryId, id: preset.id }),
          });
          var ids = Array.from(new Set((data.models || []).map(function (model) { return model.id; })));
          if (!ids.length) return;
          if (this.form.models.length || ids.length > 30) {
            var message = this.form.models.length
              ? '将导入 ' + ids.length + ' 个预设模型，替换当前 ' + this.form.models.length + ' 个模型，确定？'
              : '该服务商有 ' + ids.length + ' 个模型，全部导入？';
            if (!window.confirm(message)) return;
          }
          this.form.models = ids;
        } catch (error) {
          this.formError = this.errorText(error);
        } finally {
          this.importingModels = false;
        }
      },
      clearPreset: function () {
        this.selectedPresetId = '';
        this.presetSearch = '';
      },
      refreshPresets: async function () {
        this.refreshingPresets = true;
        try {
          await this.request('/ai-sdk/presets/refresh', {
            method: 'POST',
            body: JSON.stringify({ libraryId: this.libraryId }),
          });
          await this.loadPresets();
        } catch (error) {
          this.formError = this.errorText(error);
        } finally {
          this.refreshingPresets = false;
        }
      },
      saveProvider: async function () {
        this.saving = true;
        this.formError = '';
        try {
          var payload = {
            libraryId: this.libraryId,
            name: this.form.name,
            baseUrl: this.form.baseUrl,
            apiKey: this.form.apiKey,
            models: this.form.models,
          };
          if (this.editingId) {
            payload.id = this.editingId;
            await this.request('/ai-sdk/providers/update', { method: 'POST', body: JSON.stringify(payload) });
          } else {
            await this.request('/ai-sdk/providers/create', { method: 'POST', body: JSON.stringify(payload) });
          }
          this.dialogOpen = false;
          await this.loadProviders();
        } catch (error) {
          this.formError = this.errorText(error);
        } finally {
          this.saving = false;
        }
      },
      deleteProvider: async function (provider) {
        if (!window.confirm('确定删除服务商「' + provider.name + '」？')) return;
        try {
          await this.request('/ai-sdk/providers/delete', {
            method: 'POST',
            body: JSON.stringify({ libraryId: this.libraryId, id: provider.id }),
          });
          if (this.chatProviderId === provider.id) {
            this.chatProviderId = '';
            this.chatModel = '';
          }
          if (this.imgProviderId === provider.id) {
            this.imgProviderId = '';
            this.imgModel = '';
            this.imgResults = [];
          }
          await this.loadProviders();
        } catch (error) {
          window.alert(this.errorText(error));
        }
      },
      setDefault: async function (provider) {
        try {
          await this.request('/ai-sdk/providers/default', {
            method: 'POST',
            body: JSON.stringify({ libraryId: this.libraryId, id: provider.id }),
          });
          await this.loadProviders();
        } catch (error) {
          window.alert(this.errorText(error));
        }
      },
      testProvider: async function (provider) {
        this.testingId = provider.id;
        this.$set ? this.$set(this.testResults, provider.id, null) : (this.testResults[provider.id] = null);
        try {
          var data = await this.request('/ai-sdk/providers/test', {
            method: 'POST',
            body: JSON.stringify({ libraryId: this.libraryId, id: provider.id }),
          });
          this.testResults[provider.id] = {
            ok: true,
            message: '连接成功 (' + data.latencyMs + 'ms，模型 ' + data.model + (data.reply ? '，回复: ' + data.reply : '') + ')',
          };
        } catch (error) {
          this.testResults[provider.id] = { ok: false, message: '连接失败: ' + this.errorText(error) };
        } finally {
          this.testingId = '';
        }
      },
      openTestDialog: function (tab) {
        this.activeTestTab = tab === 'image' ? 'image' : 'chat';
        this.testDialogOpen = true;
      },
      onChatProviderChange: function (value) {
        this.chatProviderId = value;
        var models = this.chatModels;
        this.chatModel = models.length ? models[0] : '';
      },
      sendChat: async function () {
        var input = this.chatInput.trim();
        if (!input || this.sending || !this.chatModel) return;
        this.chatInput = '';
        this.chatMessages.push({ role: 'user', content: input });
        this.chatMessages.push({ role: 'assistant', content: '', cursor: true });
        // Vue3 必须通过数组代理更新（原始对象引用的修改不会触发渲染）
        var replyIndex = this.chatMessages.length - 1;
        var self = this;
        this.sending = true;
        try {
          var history = this.chatMessages
            .filter(function (message) { return message.content; })
            .map(function (message) { return { role: message.role, content: message.content }; });
          var response = await fetch(this.apiUrl('/ai-sdk/chat'), {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({
              libraryId: this.libraryId,
              providerId: this.chatProviderId,
              model: this.chatModel,
              messages: history,
              stream: true,
            }),
          });
          if (!response.ok) {
            var data = await response.json().catch(function () { return {}; });
            throw new Error(data.error || ('HTTP ' + response.status));
          }
          var reader = response.body.getReader();
          var decoder = new TextDecoder();
          while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            self.chatMessages[replyIndex].content += decoder.decode(chunk.value, { stream: true });
          }
          var rest = decoder.decode();
          if (rest) self.chatMessages[replyIndex].content += rest;
        } catch (error) {
          var reply = self.chatMessages[replyIndex];
          reply.content = (reply.content || '') + (reply.content ? '\n' : '') + '[错误] ' + this.errorText(error);
        } finally {
          self.chatMessages[replyIndex].cursor = false;
          this.sending = false;
        }
      },
      clearChat: function () {
        this.chatMessages = [];
      },
      onImgProviderChange: function (value) {
        this.imgProviderId = value;
        var models = this.imgModels;
        this.imgModel = models.length ? models[0] : '';
      },
      pickImages: function () {
        var input = this.$refs.imgFileInput;
        if (input) input.click();
      },
      onImageFilesChange: function (event) {
        var target = event.target;
        var files = Array.prototype.slice.call((target && target.files) || []);
        if (target) target.value = '';
        files = files.filter(function (file) { return /^image\//.test(file.type); });
        if (!files.length) return;
        var self = this;
        files.forEach(function (file) {
          if (self.imgFiles.length >= 4) return;
          var reader = new FileReader();
          reader.onload = function () {
            var dataUrl = String(reader.result || '');
            if (dataUrl && self.imgFiles.length < 4) self.imgFiles.push({ name: file.name, dataUrl: dataUrl });
          };
          reader.readAsDataURL(file);
        });
      },
      removeImgFile: function (index) {
        this.imgFiles.splice(index, 1);
      },
      generateImages: async function () {
        var prompt = this.imgPrompt.trim();
        if (!prompt || this.generating || !this.imgModel) return;
        this.generating = true;
        this.imgError = '';
        this.imgInfo = '';
        try {
          var payload = {
            libraryId: this.libraryId,
            providerId: this.imgProviderId,
            model: this.imgModel,
            prompt: prompt,
            n: this.imgN,
            returnBase64: true,
          };
          if (this.imgSize !== 'auto') payload.size = this.imgSize;
          if (this.imgFiles.length) {
            payload.images = this.imgFiles.map(function (file) { return file.dataUrl; });
          }
          var data = await this.request('/ai-sdk/image/generate', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          this.imgResults = (data.images || []).map(function (image) {
            return {
              dataUrl: 'data:' + (image.mediaType || 'image/png') + ';base64,' + image.base64,
              url: image.url,
            };
          });
          var ignored = (data.warnings || []).map(function (warning) { return warning.feature; });
          this.imgInfo = '生成 ' + this.imgResults.length + ' 张，耗时 ' + Math.round((data.elapsed || 0) / 1000) + 's'
            + (ignored.length ? '（服务商忽略参数: ' + Array.from(new Set(ignored)).join(', ') + '）' : '');
        } catch (error) {
          this.imgError = this.errorText(error);
        } finally {
          this.generating = false;
        }
      },
      openImage: function (image) {
        var dataUrl = String(image && image.dataUrl || '');
        var match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,([\s\S]*)$/i);
        if (!match) return;
        try {
          var mediaType = match[1] || 'image/png';
          var binary = atob(match[2]);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          var objectUrl = URL.createObjectURL(new Blob([bytes], { type: mediaType }));
          window.open(objectUrl, '_blank', 'noopener,noreferrer');
          window.setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 60000);
        } catch (error) {
          this.imgError = this.errorText(error);
        }
      },
      errorText: function (error) { return error && error.message ? error.message : String(error); },
    },
  };

  window.MiraPluginComponents['mira_ai_sdk_components_AiSdkManager_js'] = AiSdkManager;
})();
