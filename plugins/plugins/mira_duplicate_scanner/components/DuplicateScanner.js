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

      '  <!-- Controls -->',
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

      '  <!-- Result summary -->',
      '  <div v-if="result" class="text-sm text-muted-foreground">',
      '    扫描结果: {{ result.totalGroups }} 组重复，共 {{ result.totalFiles }} 个文件',
      '    <span v-if="result.mode === \'precise\'" class="ml-2">(精确模式 - hash 校验)</span>',
      '  </div>',

      '  <!-- Error -->',
      '  <div v-if="error" class="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3">',
      '    {{ error }}',
      '  </div>',

      '  <!-- Empty state -->',
      '  <div v-if="result && result.totalGroups === 0" class="text-center py-12 text-muted-foreground">',
      '    <div class="text-lg">未发现重复文件</div>',
      '    <div class="text-sm mt-1">所有文件都是唯一的</div>',
      '  </div>',

      '  <!-- Result list -->',
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
      '              <!-- Thumbnail -->',
      '              <div class="w-full h-24 bg-muted rounded flex items-center justify-center mb-2 overflow-hidden">',
      '                <img v-if="file.thumbnail_path" :src="getThumbUrl(file)" class="w-full h-full object-cover" />',
      '                <span v-else class="text-2xl">{{ fileIcon(file.extension) }}</span>',
      '              </div>',
      '              <!-- File path -->',
      '              <div class="text-xs truncate text-muted-foreground" :title="file.path">{{ file.path }}</div>',
      '              <!-- Checkbox -->',
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

      '  <!-- Bottom actions -->',
      '  <div v-if="result && result.totalGroups > 0" class="flex items-center justify-between pt-4 border-t">',
      '    <button @click="selectAllDuplicates" class="text-sm text-primary hover:underline cursor-pointer">',
      '      全选重复项（每组保留 1 个）',
      '    </button>',
      '    <MiraButton variant="destructive" @click="confirmDelete" :disabled="selectedIds.size === 0">',
      '      删除选中 ({{ selectedIds.size }} 个)',
      '    </MiraButton>',
      '  </div>',

      '  <!-- Delete confirmation dialog -->',
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
      authHeaders: function () {
        var token = localStorage.getItem('token');
        var h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        return h;
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
          headers: self.authHeaders(),
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
          headers: self.authHeaders(),
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
