import { ref, onUnmounted } from 'vue';
import { useBackground } from './useBackground';
import { fileToStaged } from '@/shared/staged-file';
import type { UploadTask } from '@/shared/types';

const tasks = ref<UploadTask[]>([]);
const bg = useBackground();

export function useUploadQueue() {
  async function load() {
    tasks.value = await bg.uploadStatus();
  }
  async function addFiles(files: File[], libraryId: string, tags?: string[], folderId?: string) {
    const staged = await Promise.all([...files].map(fileToStaged));
    await bg.uploadFiles(staged, libraryId, tags, folderId);
    await load();
  }
  async function cancel(id: string) {
    await bg.cancelUpload(id);
    await load();
  }

  // 监听进度
  const off = bg.onUploadProgress(p => {
    const idx = tasks.value.findIndex(t => t.id === p.id);
    if (idx >= 0) {
      tasks.value[idx] = { ...tasks.value[idx], percent: p.percent, status: p.status as any };
    } else {
      // 新任务
      load();
    }
  });
  onUnmounted(off);

  return { tasks, load, addFiles, cancel };
}
