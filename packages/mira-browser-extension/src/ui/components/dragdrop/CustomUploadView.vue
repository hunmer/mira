<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Library } from 'mira-app-core/shared/sdk';
import type { CustomUploadSession } from '@/shared/messages';
import { dbg } from '@/shared/debug';
import { readCachedLibraries, readCachedTree, writeCachedLibraries } from '@/shared/library-cache';
import { useBackground } from '@/ui/composables/useBackground';
import { useSettings } from '@/ui/composables/useSettings';
import { flattenTree, sortTree, useLibraryTree } from '@/ui/composables/useLibraryTree';
import { useLibraryTreeActions } from '@/ui/composables/useLibraryTreeActions';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';
import { ContextMenu, CreateNodeDialog, LibraryTree, ROOT_ID } from 'mira-plugin-ui/library';
import type { LibraryTreeCreatePayload } from 'mira-plugin-ui/library';
import type { LibraryTreeNode } from '@/shared/types';

const props = defineProps<{ session: CustomUploadSession }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const bg = useBackground();
const { settings } = useSettings();

// 文件夹树 / 标签树:复用 useLibraryTree(getAll → buildTree)
const {
  tree: folderTree,
  loading: folderLoading,
  error: folderError,
  load: loadFolders,
  seed: seedFolders,
} = useLibraryTree('folder');
const {
  tree: tagTree,
  loading: tagLoading,
  error: tagError,
  load: loadTags,
  seed: seedTags,
} = useLibraryTree('tag');

const loading = computed(() => folderLoading.value || tagLoading.value);
const loadError = computed(() => folderError.value || tagError.value || '');

// ---- 顶部素材库列表:hover 切换当前库,下方树/新建/删除/上传都作用于它 ----
const libraries = ref<Library[]>([]);
// 初始库优先用浮层打开时选中的(session.libraryId),否则设置里的当前库
const activeLibraryId = ref(props.session.libraryId || settings.value.libraryId || '');
// 占位已渲染(缓存命中):刷新期间不再整屏显示「加载中」,避免闪烁
const seeded = ref(false);

const cacheScope = () => settings.value.activeServerId || settings.value.serverURL || 'default';

/** 缓存占位:命中则立即渲染;未命中 seed 空数组,清掉旧库残留展示 */
async function seedFromCache(libId: string) {
  if (!libId) return;
  const scope = cacheScope();
  const [folders, tags] = await Promise.all([
    readCachedTree(scope, 'folder', libId),
    readCachedTree(scope, 'tag', libId),
  ]);
  dbg.log('dragdrop', 'seed from cache', { libId, scope, folders: folders?.length ?? 0, tags: tags?.length ?? 0 });
  seedFolders(libId, folders ?? []);
  seedTags(libId, tags ?? []);
  seeded.value = true;
  folderExpanded.value = folders ? expandAllIds(folderTree.value) : new Set();
  tagExpanded.value = tags ? expandAllIds(tagTree.value) : new Set();
}

let hoverTimer: number | undefined;
/** hover 防抖:鼠标快速划过 chips 不触发加载 */
function hoverLibrary(libId: string) {
  clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => switchLibrary(libId), 120);
}
onUnmounted(() => clearTimeout(hoverTimer));

async function switchLibrary(libId: string) {
  if (!libId || libId === activeLibraryId.value) return;
  activeLibraryId.value = libId;
  // 不同库的节点 id 空间不同:清掉旧库的选中;展开状态清空后由 watch 在新树到达时补齐
  selectedFolderId.value = undefined;
  selectedTags.value = new Map();
  folderExpanded.value = new Set();
  tagExpanded.value = new Set();
  await seedFromCache(libId);
  await Promise.all([loadFolders(libId), loadTags(libId)]);
  if (activeLibraryId.value !== libId) return;
  folderExpanded.value = expandAllIds(folderTree.value);
  tagExpanded.value = expandAllIds(tagTree.value);
}

// 展示排序:与快捷导入面板树一致,按设置的文件夹/标签默认排序(含「最后使用」)
const folderTreeSorted = computed(() => sortTree(folderTree.value, settings.value.libraryFolderSort));
const tagTreeSorted = computed(() => sortTree(tagTree.value, settings.value.libraryTagSort));

// ---- 展开/折叠(两棵树各自持有) ----
const folderExpanded = ref(new Set<number>());
const tagExpanded = ref(new Set<number>());

function toggleIn(set: typeof folderExpanded, id: number) {
  const next = new Set(set.value);
  next.has(id) ? next.delete(id) : next.add(id);
  set.value = next;
}
const toggleFolderNode = (id: number) => toggleIn(folderExpanded, id);
const toggleTagNode = (id: number) => toggleIn(tagExpanded, id);

/** 全部含子节点的 id 集合(加载后默认展开全部层级,与树视图一致) */
function expandAllIds(nodes: LibraryTreeNode[]): Set<number> {
  return new Set(flattenTree(nodes).filter(n => n.children.length).map(n => n.id));
}

// 首次加载可能在组件挂载后才完成;树数据到达时补齐默认展开状态。
// 仅在当前没有展开项时同步,避免覆盖用户主动折叠。
watch(folderTree, nodes => {
  if (folderExpanded.value.size === 0 && nodes.length > 0) {
    folderExpanded.value = expandAllIds(nodes);
  }
});
watch(tagTree, nodes => {
  if (tagExpanded.value.size === 0 && nodes.length > 0) {
    tagExpanded.value = expandAllIds(nodes);
  }
});

// ---- 选中:文件夹单选(可取消),标签 checkbox 多选 ----
const selectedFolderId = ref<number | undefined>();
const selectedFolderIds = computed(() =>
  selectedFolderId.value != null ? new Set([selectedFolderId.value]) : new Set<number>(),
);
// id → title:Map value 仅用于展示，提交使用 key 中的标签 ID。
const selectedTags = ref(new Map<number, string>());
const checkedTagIds = computed(() => new Set(selectedTags.value.keys()));

function selectFolder(node: LibraryTreeNode) {
  selectedFolderId.value = selectedFolderId.value === node.id ? undefined : node.id;
}

function toggleTag(node: LibraryTreeNode) {
  const next = new Map(selectedTags.value);
  next.has(node.id) ? next.delete(node.id) : next.set(node.id, node.title);
  selectedTags.value = next;
}

// ---- 重载(创建/删除后):拉数据并保持全部展开 ----
async function reloadFolders() {
  await loadFolders(activeLibraryId.value);
  folderExpanded.value = expandAllIds(folderTree.value);
}

async function reloadTags() {
  await loadTags(activeLibraryId.value);
  tagExpanded.value = expandAllIds(tagTree.value);
}

// ---- 右键菜单:新建同级/子级(底部 CreateNodeDialog) / 删除(确认框,逻辑在 composable) ----
const {
  menu: folderMenu,
  openMenu: openFolderMenu,
  closeMenu: closeFolderMenu,
  requestDelete: requestFolderDelete,
  closeDelete: closeFolderDelete,
  confirmDelete: confirmFolderDelete,
  deleteTarget: folderDeleteTarget,
  deleteFiles: folderDeleteFiles,
  deleteError: folderDeleteError,
  deleting: folderDeleting,
} = useLibraryTreeActions({
  mode: 'folder',
  libraryId: () => activeLibraryId.value,
  reload: reloadFolders,
});
const {
  menu: tagMenu,
  openMenu: openTagMenu,
  closeMenu: closeTagMenu,
  requestDelete: requestTagDelete,
  closeDelete: closeTagDelete,
  confirmDelete: confirmTagDelete,
  deleteTarget: tagDeleteTarget,
  deleteError: tagDeleteError,
  deleting: tagDeleting,
} = useLibraryTreeActions({
  mode: 'tag',
  libraryId: () => activeLibraryId.value,
  reload: reloadTags,
});

// ---- 新建节点对话框(右键「新建同级/子级」共用;父级树含根行) ----
const folderCreateOpen = ref(false);
const folderCreateParent = ref(ROOT_ID);
const tagCreateOpen = ref(false);
const tagCreateParent = ref(ROOT_ID);

const folderCreateTree = computed<LibraryTreeNode[]>(() => [
  { id: ROOT_ID, title: '根目录', parentId: ROOT_ID, level: 0, children: [] },
  ...folderTree.value,
]);
const tagCreateTree = computed<LibraryTreeNode[]>(() => [
  { id: ROOT_ID, title: '根标签', parentId: ROOT_ID, level: 0, children: [] },
  ...tagTree.value,
]);

function openFolderCreate(parentId: number) {
  folderCreateParent.value = parentId || ROOT_ID;
  closeFolderMenu();
  folderCreateOpen.value = true;
}

function openTagCreate(parentId: number) {
  tagCreateParent.value = parentId || ROOT_ID;
  closeTagMenu();
  tagCreateOpen.value = true;
}

/** CreateNodeDialog 确认 → background 创建,返回新节点 id 供选中 */
async function createViaDialog(payload: LibraryTreeCreatePayload): Promise<number | undefined> {
  const created: any = await bg.createNode(
    payload.kind,
    activeLibraryId.value,
    payload.title,
    payload.parentId || undefined,
  );
  return typeof created === 'number' ? created : created?.id;
}

async function onFolderCreated(e: { id?: number; parentId: number }) {
  await reloadFolders();
  if (e.id != null) selectedFolderId.value = e.id;
}

async function onTagCreated(e: { id?: number; parentId: number }) {
  await reloadTags();
  // 新建标签默认勾上(与快速新建一致)
  if (e.id == null) return;
  const node = flattenTree(tagTree.value).find(n => n.id === e.id);
  if (!node) return;
  const next = new Map(selectedTags.value);
  next.set(node.id, node.title);
  selectedTags.value = next;
}

// ---- 快速新建(输入框常驻,创建在根级) ----
const folderName = ref('');
const tagName = ref('');
const creatingFolder = ref(false);
const creatingTag = ref(false);
const submitting = ref(false);
const previewFailed = ref(false);
const actionError = ref('');

const error = computed(() => loadError.value || actionError.value);

const sourceName = computed(() => {
  try {
    return decodeURIComponent(new URL(props.session.sourceUrl).pathname.split('/').pop() || props.session.sourceUrl);
  } catch {
    return props.session.sourceUrl;
  }
});

onMounted(async () => {
  const libId = activeLibraryId.value;
  const scope = cacheScope();
  dbg.log('dragdrop', 'custom-upload mounted', { libId, scope, settingsLibraryId: settings.value.libraryId });
  // 1) 缓存占位:内存命中(常驻 sidePanel 内再次打开)首帧即渲染;storage 命中毫秒级
  await seedFromCache(libId);
  const cachedLibs = await readCachedLibraries(scope);
  dbg.log('dragdrop', 'cached libraries', { count: cachedLibs?.length ?? 0 });
  if (cachedLibs?.length) libraries.value = cachedLibs;
  if (!libId) return;
  // 2) 后台刷新:库列表与两棵树并行,刷新成功自动写缓存(services 层)
  await Promise.all([
    bg.listLibraries().then(list => {
      dbg.log('dragdrop', 'listLibraries ok', {
        isArray: Array.isArray(list),
        count: Array.isArray(list) ? list.length : -1,
        names: Array.isArray(list) ? list.slice(0, 5).map(l => l?.name ?? l?.id) : list,
      });
      if (list?.length) {
        libraries.value = list;
        writeCachedLibraries(scope, list);
      }
    }).catch(e => dbg.warn('dragdrop', 'listLibraries failed', { message: e?.message ?? String(e) })),
    loadFolders(libId),
    loadTags(libId),
  ]);
  folderExpanded.value = expandAllIds(folderTree.value);
  tagExpanded.value = expandAllIds(tagTree.value);
});

async function createFolder() {
  const title = folderName.value.trim();
  if (!title || creatingFolder.value) return;
  creatingFolder.value = true;
  actionError.value = '';
  try {
    const created: any = await bg.createNode('folder', activeLibraryId.value, title);
    const folderId = typeof created === 'number' ? created : created?.id;
    if (typeof folderId !== 'number') throw new Error('创建文件夹失败');
    await reloadFolders();
    selectedFolderId.value = folderId;
    folderName.value = '';
  } catch (e: any) {
    actionError.value = e?.message ?? String(e);
  } finally {
    creatingFolder.value = false;
  }
}

async function createTag() {
  const title = tagName.value.trim();
  if (!title || creatingTag.value) return;
  creatingTag.value = true;
  actionError.value = '';
  try {
    const created: any = await bg.createNode('tag', activeLibraryId.value, title);
    const tagId = typeof created === 'number' ? created : created?.id;
    if (typeof tagId !== 'number') throw new Error('创建标签失败');
    await reloadTags();
    // 新建标签默认勾上
    const next = new Map(selectedTags.value);
    next.set(tagId, title);
    selectedTags.value = next;
    tagName.value = '';
  } catch (e: any) {
    actionError.value = e?.message ?? String(e);
  } finally {
    creatingTag.value = false;
  }
}

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  actionError.value = '';
  try {
    await chrome.runtime.sendMessage({
      type: 'UPLOAD_FROM_URL',
      payload: {
        url: props.session.sourceUrl,
        kind: props.session.kind,
        libraryId: activeLibraryId.value,
        folderId: selectedFolderId.value,
        tags: [...selectedTags.value.keys()].map(String),
        referrer: props.session.referrer,
      },
    });
    await close();
  } catch (e: any) {
    actionError.value = e?.message ?? String(e);
    submitting.value = false;
  }
}

async function close() {
  await bg.closeCustomUploadSession();
  emit('close');
}
</script>

<template>
  <section class="custom-upload">
    <header class="header">
      <Button variant="ghost" size="sm" title="返回" aria-label="返回" @click="close">←</Button>
      <div class="heading">
        <strong>自定义上传</strong>
        <span>{{ sourceName }}</span>
      </div>
    </header>

    <!-- 横向素材库列表:hover 切换下方文件夹/标签树(点击/聚焦等效) -->
    <nav v-if="libraries.length" class="library-bar" aria-label="素材库">
      <button
        v-for="lib in libraries"
        :key="lib.id"
        type="button"
        class="lib-chip"
        :class="{ active: lib.id === activeLibraryId }"
        @mouseenter="hoverLibrary(lib.id)"
        @focus="hoverLibrary(lib.id)"
        @click="hoverLibrary(lib.id)"
      >
        <!-- 服务端 icon 占位值为 'default'(非图标名),不渲染 -->
        <span v-if="lib.icon && lib.icon !== 'default'" class="lib-icon">{{ lib.icon }}</span>
        <span class="lib-name">{{ lib.name }}</span>
      </button>
    </nav>

    <main class="form">
      <div class="preview">
        <img v-if="!previewFailed" :src="session.sourceUrl" :alt="sourceName" @error="previewFailed = true" />
        <span v-else>图片预览加载失败</span>
      </div>

      <!-- 未占位时才整屏显示加载(占位后静默刷新,避免闪烁) -->
      <p v-if="loading && !seeded" class="status">加载中…</p>
      <template v-else>
        <section class="field">
          <div class="field-title"><span>文件夹</span><span>可选</span></div>
          <div class="create-form">
            <Input v-model="folderName" placeholder="新建文件夹名称，回车创建" @keyup.enter="createFolder" />
            <Button size="sm" :disabled="creatingFolder || !folderName.trim()" @click="createFolder">
              {{ creatingFolder ? '…' : '创建' }}
            </Button>
          </div>
          <div class="tree-wrap">
            <LibraryTree
              :nodes="folderTreeSorted"
              kind="folder"
              :expanded="folderExpanded"
              :selected-ids="selectedFolderIds"
              @toggle="toggleFolderNode"
              @select="selectFolder"
              @contextmenu="openFolderMenu"
            />
            <p v-if="!folderTree.length" class="status">{{ folderLoading ? '加载中…' : '暂无文件夹' }}</p>
          </div>
        </section>

        <section class="field">
          <div class="field-title"><span>标签</span><span>可多选</span></div>
          <div class="create-form">
            <Input v-model="tagName" placeholder="新建标签名称，回车创建" @keyup.enter="createTag" />
            <Button size="sm" :disabled="creatingTag || !tagName.trim()" @click="createTag">
              {{ creatingTag ? '…' : '创建' }}
            </Button>
          </div>
          <div class="tree-wrap">
            <LibraryTree
              :nodes="tagTreeSorted"
              kind="tag"
              :expanded="tagExpanded"
              checkable
              :checked="checkedTagIds"
              @toggle="toggleTagNode"
              @select="toggleTag"
              @contextmenu="openTagMenu"
            />
            <p v-if="!tagTree.length" class="status">{{ tagLoading ? '加载中…' : '暂无标签' }}</p>
          </div>
        </section>
      </template>

      <p v-if="error" class="error">{{ error }}</p>
    </main>

    <footer class="footer">
      <span>{{ selectedTags.size }} 个标签</span>
      <div class="actions">
        <Button variant="outline" @click="close">取消</Button>
        <Button :disabled="loading || submitting" @click="submit">{{ submitting ? '上传中…' : '上传' }}</Button>
      </div>
    </footer>

    <!-- 右键菜单:新建同级 / 新建子级 / 删除 -->
    <ContextMenu v-if="folderMenu" :x="folderMenu.x" :y="folderMenu.y" @close="closeFolderMenu">
      <button @click="openFolderCreate(folderMenu.node.parentId)">{{ t('tree.createSibling') }}</button>
      <button @click="openFolderCreate(folderMenu.node.id)">{{ t('tree.createChild', { type: t('common.folder') }) }}</button>
      <div class="sep" />
      <button class="danger" @click="requestFolderDelete">{{ t('tree.delete') }}</button>
    </ContextMenu>
    <ContextMenu v-if="tagMenu" :x="tagMenu.x" :y="tagMenu.y" @close="closeTagMenu">
      <button @click="openTagCreate(tagMenu.node.parentId)">{{ t('tree.createSibling') }}</button>
      <button @click="openTagCreate(tagMenu.node.id)">{{ t('tree.createChild', { type: t('common.tag') }) }}</button>
      <div class="sep" />
      <button class="danger" @click="requestTagDelete">{{ t('tree.delete') }}</button>
    </ContextMenu>

    <!-- 删除确认(folder 带「同时删除其中的文件」勾选;失败错误留在框内可重试) -->
    <div v-if="folderDeleteTarget" class="confirm-mask" @click.self="closeFolderDelete">
      <div class="confirm">
        <p>{{ t('tree.deleteFolderConfirm', { name: folderDeleteTarget.title }) }}</p>
        <label>
          <input v-model="folderDeleteFiles" type="checkbox" />
          {{ t('tree.deleteFilesCheck') }}
        </label>
        <p v-if="folderDeleteError" class="error">{{ folderDeleteError }}</p>
        <div class="confirm-actions">
          <Button size="sm" variant="outline" :disabled="folderDeleting" @click="closeFolderDelete">{{ t('common.cancel') }}</Button>
          <Button size="sm" variant="danger" :disabled="folderDeleting" @click="confirmFolderDelete">
            {{ folderDeleting ? '…' : t('tree.delete') }}
          </Button>
        </div>
      </div>
    </div>
    <div v-else-if="tagDeleteTarget" class="confirm-mask" @click.self="closeTagDelete">
      <div class="confirm">
        <p>{{ t('tree.deleteTagConfirm', { name: tagDeleteTarget.title }) }}</p>
        <p v-if="tagDeleteError" class="error">{{ tagDeleteError }}</p>
        <div class="confirm-actions">
          <Button size="sm" variant="outline" :disabled="tagDeleting" @click="closeTagDelete">{{ t('common.cancel') }}</Button>
          <Button size="sm" variant="danger" :disabled="tagDeleting" @click="confirmTagDelete">
            {{ tagDeleting ? '…' : t('tree.delete') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 新建节点对话框:右键「新建同级/子级」共用 -->
    <CreateNodeDialog
      v-model:open="folderCreateOpen"
      kind="folder"
      :nodes="folderCreateTree"
      :default-parent-id="folderCreateParent"
      :create-node="createViaDialog"
      @created="onFolderCreated"
    />
    <CreateNodeDialog
      v-model:open="tagCreateOpen"
      kind="tag"
      :nodes="tagCreateTree"
      :default-parent-id="tagCreateParent"
      :create-node="createViaDialog"
      @created="onTagCreated"
    />
  </section>
</template>

<style scoped>
.custom-upload { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--bg); color: var(--fg); }
.header { display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 8px; border-bottom: 1px solid var(--border); }
.library-bar { display: flex; gap: 6px; padding: 8px 12px; overflow-x: auto; border-bottom: 1px solid var(--border); scrollbar-width: thin; }
.lib-chip { display: inline-flex; flex-shrink: 0; align-items: center; gap: 4px; max-width: 160px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg-elev); color: var(--muted-foreground); font-size: 12px; line-height: 1.2; white-space: nowrap; cursor: pointer; }
.lib-chip:hover { color: var(--fg); border-color: var(--muted-foreground); }
.lib-chip.active { color: var(--fg); border-color: var(--primary); background: color-mix(in srgb, var(--primary) 14%, transparent); }
.lib-icon { font-size: 12px; }
.lib-name { overflow: hidden; text-overflow: ellipsis; }
.heading { display: flex; flex-direction: column; min-width: 0; }
.heading span { overflow: hidden; color: var(--muted-foreground); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.form { display: flex; flex: 1; flex-direction: column; gap: 16px; min-height: 0; padding: 12px; overflow-y: auto; }
.preview { display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 16 / 10; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elev); color: var(--muted-foreground); }
.preview img { width: 100%; height: 100%; object-fit: contain; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field-title { display: flex; justify-content: space-between; color: var(--muted-foreground); font-size: 12px; }
.create-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
.tree-wrap { display: flex; flex-direction: column; gap: 4px; max-height: 200px; padding: 4px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; }
.status { margin: 6px 0; color: var(--muted-foreground); font-size: 12px; }
.error { margin: 0; color: var(--danger); font-size: 12px; }
.footer { display: flex; align-items: center; justify-content: space-between; min-height: 54px; padding: 8px 12px; border-top: 1px solid var(--border); color: var(--muted-foreground); font-size: 12px; }
.actions { display: flex; gap: 8px; }
.confirm-mask { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 40%); }
.confirm { display: flex; flex-direction: column; gap: 10px; width: min(320px, 90%); padding: 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
.confirm p { margin: 0; }
.confirm label { display: flex; align-items: center; gap: 6px; color: var(--muted-foreground); font-size: 12px; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
