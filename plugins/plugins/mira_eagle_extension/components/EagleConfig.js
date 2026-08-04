(function () {
  if (!window.MiraPluginComponents) {
    window.MiraPluginComponents = {};
  }
  var ui = window.MiraDashboardUI || {};
  var Dashboard = window.MiraDashboard || {};

  var EagleConfig = {
    name: 'EagleConfig',
    components: {
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      MiraCardContent: ui.CardContent,
      MiraCardHeader: ui.CardHeader,
      MiraCardTitle: ui.CardTitle,
      MiraSelect: ui.Select,
      MiraSelectContent: ui.SelectContent,
      MiraSelectItem: ui.SelectItem,
      MiraSelectTrigger: ui.SelectTrigger,
      MiraSelectValue: ui.SelectValue,
      MiraSeparator: ui.Separator,
      MiraBadge: ui.Badge,
    },
    template: [
      '<div class="p-6 space-y-6 max-w-3xl mx-auto">',
      '  <div class="flex items-center justify-between">',
      '    <h1 class="text-2xl font-bold">Eagle 浏览器扩展支持</h1>',
      '    <MiraBadge :variant="config.running ? \'default\' : \'secondary\'">',
      '      {{ config.running ? "服务运行中" : "未运行" }}',
      '    </MiraBadge>',
      '  </div>',

      '  <!-- 说明 -->',
      '  <MiraCard>',
      '    <MiraCardHeader>',
      '      <MiraCardTitle>工作原理</MiraCardTitle>',
      '    </MiraCardHeader>',
      '    <MiraCardContent class="text-sm text-muted-foreground space-y-1">',
      '      <p>本插件在本地 <code>{{ config.port }}</code> / <code>{{ config.portCapture }}</code> 端口复刻 Eagle 协议，</p>',
      '      <p>Eagle 浏览器扩展保存的图片会直接进入下方选择的素材库。</p>',
      '      <p>请先安装 Eagle 浏览器扩展，并确保未同时运行 Eagle 客户端（避免端口冲突）。</p>',
      '    </MiraCardContent>',
      '  </MiraCard>',

      '  <MiraSeparator />',

      '  <!-- 目标库选择 -->',
      '  <div class="space-y-3">',
      '    <div class="text-sm font-medium">接收 Eagle 数据的素材库</div>',
      '    <div class="flex items-center gap-4">',
      '      <MiraSelect v-model="targetLibraryId" class="w-72">',
      '        <MiraSelectTrigger>',
      '          <MiraSelectValue placeholder="选择素材库" />',
      '        </MiraSelectTrigger>',
      '        <MiraSelectContent>',
      '          <MiraSelectItem v-for="lib in libraries" :key="lib.id" :value="lib.id">',
      '            {{ lib.name }}<span v-if="!lib.active" class="text-muted-foreground">（未启用）</span>',
      '          </MiraSelectItem>',
      '        </MiraSelectContent>',
      '      </MiraSelect>',
      '      <MiraButton @click="saveConfig" :disabled="saving">',
      '        {{ saving ? "保存中..." : "保存" }}',
      '      </MiraButton>',
      '    </div>',
      '    <p v-if="justSaved" class="text-sm text-green-600">✅ 已保存。Eagle 扩展保存的图片将进入所选库。</p>',
      '    <p v-if="!targetLibraryId && loaded" class="text-sm text-red-500">⚠️ 尚未选择目标库，Eagle 数据将被拒绝。</p>',
      '  </div>',

      '  <MiraSeparator />',

      '  <!-- 状态信息 -->',
      '  <div class="grid grid-cols-2 gap-4 text-sm">',
      '    <div class="flex justify-between border rounded-md p-3">',
      '      <span class="text-muted-foreground">Eagle API 端口</span><span class="font-mono">{{ config.port }}</span>',
      '    </div>',
      '    <div class="flex justify-between border rounded-md p-3">',
      '      <span class="text-muted-foreground">截图推送端口</span><span class="font-mono">{{ config.portCapture }}</span>',
      '    </div>',
      '    <div class="flex justify-between border rounded-md p-3">',
      '      <span class="text-muted-foreground">当前目标库</span>',
      '      <span>{{ targetLibraryName || "未选择" }}</span>',
      '    </div>',
      '    <div class="flex justify-between border rounded-md p-3">',
      '      <span class="text-muted-foreground">可用库数量</span><span>{{ libraries.length }}</span>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n'),

    data: function () {
      return {
        targetLibraryId: '',
        libraries: [],
        config: { running: false, port: 41595, portCapture: 41593, targetLibraryId: '' },
        loaded: false,
        saving: false,
        justSaved: false,
      };
    },

    computed: {
      targetLibraryName: function () {
        var self = this;
        var lib = this.libraries.find(function (l) { return l.id === self.targetLibraryId; });
        return lib ? lib.name : '';
      },
    },

    mounted: function () {
      this.loadLibraries();
      this.loadConfig();
    },

    methods: {
      authHeaders: function () {
        var token = localStorage.getItem('token');
        var h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        return h;
      },

      loadLibraries: function () {
        var self = this;
        // Dashboard.getLibraries() → GET /api/libraries，返回 {id, name, status}[]
        // 这是主库列表的同一来源，name 字段是真实素材库名称
        Promise.resolve(Dashboard.getLibraries ? Dashboard.getLibraries() : [])
          .then(function (libs) {
            self.libraries = (Array.isArray(libs) ? libs : []).map(function (l) {
              return { id: l.id, name: l.name, active: l.status === 'active' };
            });
          })
          .catch(function (e) {
            console.warn('[EagleConfig] getLibraries 失败，回退直接请求', e);
            // 回退：直接调 /api/libraries
            fetch((Dashboard.getApiBase ? Dashboard.getApiBase() : '/api') + '/libraries', {
              method: 'GET',
              headers: self.authHeaders(),
            })
              .then(function (r) { return r.json(); })
              .then(function (libs) {
                self.libraries = (Array.isArray(libs) ? libs : []).map(function (l) {
                  return { id: l.id, name: l.name, active: l.status === 'active' };
                });
              })
              .catch(function () { self.libraries = []; });
          });
      },

      loadConfig: function () {
        var self = this;
        fetch((Dashboard.getApiBase ? Dashboard.getApiBase() : '/api') + '/eagle/config', {
          method: 'GET',
          headers: self.authHeaders(),
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res && res.success && res.data) {
              self.config = res.data;
              self.targetLibraryId = res.data.targetLibraryId || '';
            }
            self.loaded = true;
          })
          .catch(function (e) {
            console.error('[EagleConfig] 加载配置失败', e);
            self.loaded = true;
          });
      },

      saveConfig: function () {
        var self = this;
        self.saving = true;
        self.justSaved = false;
        fetch((Dashboard.getApiBase ? Dashboard.getApiBase() : '/api') + '/eagle/config', {
          method: 'POST',
          headers: self.authHeaders(),
          body: JSON.stringify({ targetLibraryId: self.targetLibraryId }),
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res && res.success) {
              self.justSaved = true;
            } else {
              alert('保存失败：' + (res && res.error ? res.error : '未知错误'));
            }
          })
          .catch(function (e) { alert('保存失败：' + e); })
          .finally(function () { self.saving = false; });
      },
    },
  };

  window.MiraPluginComponents['mira_eagle_extension_components_EagleConfig_js'] = EagleConfig;
})();
