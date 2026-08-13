<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Folder, Tag } from 'mira-app-core/shared/sdk';
import type { CustomUploadSession } from '@/shared/messages';
import { useBackground } from '@/ui/composables/useBackground';
import { useSettings } from '@/ui/composables/useSettings';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';

const props = defineProps<{ session: CustomUploadSession }>();
const emit = defineEmits<{ close: [] }>();
const bg = useBackground();
const { settings } = useSettings();
const folders = ref<Folder[]>([]);
const tags = ref<Tag[]>([]);
const selectedFolderId = ref<number | undefined>();
const selectedTags = ref(new Set<string>());
const showCreateFolder = ref(false);
const folderName = ref('新建文件夹');
const loading = ref(true);
const creating = ref(false);
const submitting = ref(false);
const previewFailed = ref(false);
const error = ref('');

const sourceName = computed(() => {
  try {
    return decodeURIComponent(new URL(props.session.sourceUrl).pathname.split('/').pop() || props.session.sourceUrl);
  } catch {
    return props.session.sourceUrl;
  }
});

onMounted(loadOptions);

async function loadOptions() {
  loading.value = true;
  error.value = '';
  try {
    [folders.value, tags.value] = await Promise.all([
      bg.listFolders(settings.value.libraryId),
      bg.listTags(settings.value.libraryId),
    ]);
  } catch (e: any) {
    error.value = e?.message ?? '加载文件夹或标签失败';
  } finally {
    loading.value = false;
  }
}

function toggleTag(id: number) {
  const next = new Set(selectedTags.value);
  const value = String(id);
  next.has(value) ? next.delete(value) : next.add(value);
  selectedTags.value = next;
}

function toggleFolder(id: number) {
  selectedFolderId.value = selectedFolderId.value === id ? undefined : id;
}

async function createFolder() {
  const title = folderName.value.trim();
  if (!title || creating.value) return;
  creating.value = true;
  error.value = '';
  try {
    const created: any = await bg.createNode('folder', settings.value.libraryId, title);
    const folderId = typeof created === 'number' ? created : created?.id;
    if (typeof folderId !== 'number') throw new Error('创建文件夹失败');
    folders.value = await bg.listFolders(settings.value.libraryId);
    selectedFolderId.value = folderId;
    showCreateFolder.value = false;
  } catch (e: any) {
    error.value = e?.message ?? String(e);
  } finally {
    creating.value = false;
  }
}

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  error.value = '';
  try {
    await chrome.runtime.sendMessage({
      type: 'UPLOAD_FROM_URL',
      payload: {
        url: props.session.sourceUrl,
        kind: props.session.kind,
        libraryId: settings.value.libraryId,
        folderId: selectedFolderId.value,
        tags: [...selectedTags.value],
        referrer: props.session.referrer,
      },
    });
    await close();
  } catch (e: any) {
    error.value = e?.message ?? String(e);
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
          <div class="folder-actions">
            <button type="button" class="option create" @click="showCreateFolder = true">新建文件夹</button>
          </div>
          <div v-if="showCreateFolder" class="create-form">
            <Input v-model="folderName" placeholder="文件夹名称" @keyup.enter="createFolder" />
            <Button size="sm" :disabled="creating || !folderName.trim()" @click="createFolder">{{ creating ? '…' : '创建' }}</Button>
            <Button size="sm" variant="ghost" @click="showCreateFolder = false">取消</Button>
          </div>
          <div class="folder-list">
            <button
              v-for="folder in folders"
              :key="folder.id"
              type="button"
              class="option folder"
              :class="{ selected: selectedFolderId === folder.id }"
              @click="toggleFolder(folder.id)"
            >{{ folder.title }}</button>
            <p v-if="!folders.length" class="status">暂无文件夹</p>
          </div>
        </section>

        <section class="field">
          <div class="field-title"><span>标签</span><span>可多选</span></div>
          <div class="tag-list">
            <button
              v-for="tag in tags"
              :key="tag.id"
              type="button"
              class="tag"
              :class="{ selected: selectedTags.has(String(tag.id)) }"
              @click="toggleTag(tag.id)"
            >#{{ tag.title }}</button>
            <p v-if="!tags.length" class="status">暂无标签</p>
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
.folder-actions { display: grid; grid-template-columns: 1fr; gap: 6px; }
.folder-list { display: flex; flex-direction: column; gap: 5px; max-height: 168px; overflow-y: auto; }
.option { min-height: 34px; padding: 6px 9px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elev); color: var(--fg); cursor: pointer; text-align: left; }
.option.create { color: var(--primary); }
.option.selected, .tag.selected { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 14%, var(--bg-elev)); color: var(--primary); }
.create-form { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 150px; overflow-y: auto; }
.tag { min-height: 30px; padding: 4px 9px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg-elev); color: var(--muted); cursor: pointer; }
.status { margin: 6px 0; color: var(--muted); font-size: 12px; }
.error { margin: 0; color: var(--danger); font-size: 12px; }
.footer { display: flex; align-items: center; justify-content: space-between; min-height: 54px; padding: 8px 12px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; }
.actions { display: flex; gap: 8px; }
</style>
