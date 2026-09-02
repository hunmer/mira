/**
 * 批量上传对话框共享状态(模块级单例,popup / side panel 各自一份上下文)。
 *
 * 对话框 DOM 由 App.vue 挂载的 <BatchUploadHost> 消费;
 * 任意视图(header 菜单「选择文件上传」、树右键「上传到此处」)经 open() 唤起。
 * 打开时可预填文件与落点(folderId/标签 ID),提交走扩展上传队列。
 */
import { ref } from 'vue';
import { useBackground } from './useBackground';
import { useConnection } from './useConnection';
import { useSettings } from './useSettings';
import { useUploadQueue } from './useUploadQueue';

/** 与 mira-plugin-ui 的 BatchUploadPayload 对齐(exports 通配符下 types 路径解析不稳,故内联) */
export interface BatchUploadPayload {
  libraryId: string;
  folderId?: string;
  tags?: string[];
  files: File[];
}

/** 打开参数:预填文件 + 落点(与 LibraryTreeUploadTarget 对齐,folderId 为 number) */
export interface BatchUploadOpenOptions {
  files?: File[];
  folderId?: number;
  tags?: string[];
  /** 指定初始素材库(如新窗口经 URL params 传入);缺省用 settings 当前库 */
  libraryId?: string;
}

const show = ref(false);
const files = ref<File[]>([]);
const folders = ref<any[]>([]);
const tags = ref<any[]>([]);
// 对话框当前库(folders/tags 跟随);initialTagTitles 是共享组件保留的兼容属性名，值传标签 ID。
const libraryId = ref('');
const initialFolderId = ref('');
const initialTagTitles = ref<string[]>([]);

export function useBatchUpload() {
  const bg = useBackground();
  const { libraries } = useConnection();
  const { settings } = useSettings();
  const { addFiles } = useUploadQueue();

  async function loadTree() {
    const libId = libraryId.value;
    if (!libId) return;
    folders.value = await bg.listFolders(libId).catch(() => []);
    tags.value = await bg.listTags(libId).catch(() => []);
  }

  /** 打开对话框:可带预选文件(header 菜单)与落点(树右键「上传到此处」) */
  async function open(options?: BatchUploadOpenOptions) {
    files.value = options?.files ?? [];
    initialFolderId.value = options?.folderId != null ? String(options.folderId) : '';
    initialTagTitles.value = options?.tags ?? [];
    libraryId.value = options?.libraryId || settings.value.libraryId;
    await loadTree();
    show.value = true;
  }

  /** 提交:交扩展上传队列(与拖放/右键上传同一条链路) */
  async function submit(payload: BatchUploadPayload) {
    await addFiles(payload.files, payload.libraryId, payload.tags, payload.folderId);
  }

  /** 切库:刷新树数据并清初始落点 */
  async function onLibraryChange(id: string) {
    libraryId.value = id;
    initialFolderId.value = '';
    initialTagTitles.value = [];
    await loadTree();
  }

  /** 树内「新增」:走 background 创建后刷新树(无新节点 id,不自动选中) */
  async function createNode({ kind, parentId, title }: { kind: 'folder' | 'tag'; parentId: number; title: string }) {
    await bg.createNode(kind, libraryId.value, title, parentId);
    await loadTree();
  }

  return {
    show,
    files,
    folders,
    tags,
    libraries,
    libraryId,
    initialFolderId,
    initialTagTitles,
    open,
    submit,
    onLibraryChange,
    createNode,
  };
}
