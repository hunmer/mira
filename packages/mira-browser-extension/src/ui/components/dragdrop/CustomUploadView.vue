<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CustomUploadSession } from '@/shared/messages';
import { useBackground } from '@/ui/composables/useBackground';
import { useSettings } from '@/ui/composables/useSettings';
import { flattenTree, useLibraryTree } from '@/ui/composables/useLibraryTree';
import { useLibraryTreeActions } from '@/ui/composables/useLibraryTreeActions';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';
import ContextMenu from '@/ui/components/ui/ContextMenu.vue';
import LibraryTree from '@/ui/components/library/LibraryTree.vue';
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
} = useLibraryTree('folder');
const {
  tree: tagTree,
  loading: tagLoading,
  error: tagError,
  load: loadTags,
} = useLibraryTree('tag');

const loading = computed(() => folderLoading.value || tagLoading.value);
const loadError = computed(() => folderError.value || tagError.value || '');

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

// ---- 选中:文件夹单选(可取消),标签 checkbox 多选 ----
const selectedFolderId = ref<number | undefined>();
const selectedFolderIds = computed(() =>
  selectedFolderId.value != null ? new Set([selectedFolderId.value]) : new Set<number>(),
);
// id → title:提交按标题传(与树视图拖拽上传一致,服务器按名称关联标签)
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
  await loadFolders(settings.value.libraryId);
  folderExpanded.value = expandAllIds(folderTree.value);
}

async function reloadTags() {
  await loadTags(settings.value.libraryId);
  tagExpanded.value = expandAllIds(tagTree.value);
}

// ---- 右键菜单:新建同级 / 新建子级 / 删除(逻辑在 composable) ----
const {
  menu: folderMenu,
  openMenu: openFolderMenu,
  closeMenu: closeFolderMenu,
  createNode: createFolderNode,
  deleteNode: deleteFolderNode,
} = useLibraryTreeActions({
  mode: 'folder',
  libraryId: () => settings.value.libraryId,
  count: () => flattenTree(folderTree.value).length,
  reload: reloadFolders,
  expand: id => {
    const next = new Set(folderExpanded.value);
    next.add(id);
    folderExpanded.value = next;
  },
});
const {
  menu: tagMenu,
  openMenu: openTagMenu,
  closeMenu: closeTagMenu,
  createNode: createTagNode,
  deleteNode: deleteTagNode,
} = useLibraryTreeActions({
  mode: 'tag',
  libraryId: () => settings.value.libraryId,
  count: () => flattenTree(tagTree.value).length,
  reload: reloadTags,
  expand: id => {
    const next = new Set(tagExpanded.value);
    next.add(id);
    tagExpanded.value = next;
  },
});

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
  const libId = settings.value.libraryId;
  if (!libId) return;
  await Promise.all([loadFolders(libId), loadTags(libId)]);
  folderExpanded.value = expandAllIds(folderTree.value);
  tagExpanded.value = expandAllIds(tagTree.value);
});

async function createFolder() {
  const title = folderName.value.trim();
  if (!title || creatingFolder.value) return;
  creatingFolder.value = true;
  actionError.value = '';
  try {
    const created: any = await bg.createNode('folder', settings.value.libraryId, title);
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
    const created: any = await bg.createNode('tag', settings.value.libraryId, title);
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
        libraryId: settings.value.libraryId,
        folderId: selectedFolderId.value,
        tags: [...selectedTags.value.values()],
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

    <main class="form">
      <div class="preview">
        <img v-if="!previewFailed" :src="session.sourceUrl" :alt="sourceName" @error="previewFailed = true" />
        <span v-else>图片预览加载失败</span>
      </div>

      <p v-if="loading" class="status">加载中…</p>
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
              :nodes="folderTree"
              kind="folder"
              :expanded="folderExpanded"
              :selected-ids="selectedFolderIds"
              @toggle="toggleFolderNode"
              @select="selectFolder"
              @contextmenu="openFolderMenu"
            />
            <p v-if="!folderTree.length" class="status">暂无文件夹</p>
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
              :nodes="tagTree"
              kind="tag"
              :expanded="tagExpanded"
              checkable
              :checked="checkedTagIds"
              @toggle="toggleTagNode"
              @select="toggleTag"
              @contextmenu="openTagMenu"
            />
            <p v-if="!tagTree.length" class="status">暂无标签</p>
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
      <button @click="createFolderNode('sibling')">{{ t('tree.createSibling') }}</button>
      <button @click="createFolderNode('child')">{{ t('tree.createChild', { type: t('common.folder') }) }}</button>
      <div class="sep" />
      <button class="danger" @click="deleteFolderNode">{{ t('tree.delete') }}</button>
    </ContextMenu>
    <ContextMenu v-if="tagMenu" :x="tagMenu.x" :y="tagMenu.y" @close="closeTagMenu">
      <button @click="createTagNode('sibling')">{{ t('tree.createSibling') }}</button>
      <button @click="createTagNode('child')">{{ t('tree.createChild', { type: t('common.tag') }) }}</button>
      <div class="sep" />
      <button class="danger" @click="deleteTagNode">{{ t('tree.delete') }}</button>
    </ContextMenu>
  </section>
</template>

<style scoped>
.custom-upload { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--bg); color: var(--fg); }
.header { display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 8px; border-bottom: 1px solid var(--border); }
.heading { display: flex; flex-direction: column; min-width: 0; }
.heading span { overflow: hidden; color: var(--muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.form { display: flex; flex: 1; flex-direction: column; gap: 16px; min-height: 0; padding: 12px; overflow-y: auto; }
.preview { display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 16 / 10; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elev); color: var(--muted); }
.preview img { width: 100%; height: 100%; object-fit: contain; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field-title { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; }
.create-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
.tree-wrap { display: flex; flex-direction: column; gap: 4px; max-height: 200px; padding: 4px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; }
.status { margin: 6px 0; color: var(--muted); font-size: 12px; }
.error { margin: 0; color: var(--danger); font-size: 12px; }
.footer { display: flex; align-items: center; justify-content: space-between; min-height: 54px; padding: 8px 12px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; }
.actions { display: flex; gap: 8px; }
</style>
