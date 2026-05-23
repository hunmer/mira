<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import { Button, Card, message, Select, Steps, Upload } from 'ant-design-vue';

import miraApiClient from '#/api/mira/client';

defineOptions({ name: 'MiraFileUpload' });

interface Library {
  id: string;
  name: string;
  path: string;
  type: string;
  description?: string;
  status: string;
}

interface UploadLog {
  error?: string;
  fileName: string;
  fileSize: number;
  id: string;
  success: boolean;
  timestamp: Date;
}

const currentStep = ref(0);
const loadingLibraries = ref(false);
const libraries = ref<Library[]>([]);
const selectedLibraryId = ref<string>('');
const selectedLibrary = ref<Library | null>(null);
const fileList = ref<UploadFile[]>([]);
const folderInputRef = ref<HTMLInputElement>();
const uploadLogs = ref<UploadLog[]>([]);

const successCount = computed(
  () => uploadLogs.value.filter((l) => l.success).length,
);
const failCount = computed(
  () => uploadLogs.value.filter((l) => !l.success).length,
);

const libraryOptions = computed(() =>
  libraries.value
    .filter((lib) => lib.status === 'active')
    .map((lib) => ({ label: lib.name, value: lib.id })),
);

const loadLibraries = async () => {
  loadingLibraries.value = true;
  try {
    const response = await miraApiClient.get('/libraries');
    libraries.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    message.error('加载素材库列表失败');
    console.error('Failed to load libraries:', error);
    libraries.value = [];
  } finally {
    loadingLibraries.value = false;
  }
};

const onLibraryChange = (libraryId: any) => {
  if (!libraryId) return;
  selectedLibrary.value =
    libraries.value.find((lib) => lib.id === libraryId) || null;
  fileList.value = [];
};

const beforeUpload = (file: File) => {
  const isLt2G = file.size / 1024 / 1024 / 1024 < 2;
  if (!isLt2G) {
    message.error('文件大小不能超过 2GB!');
    return false;
  }
  return true;
};

const customUpload = async (options: any) => {
  const { file, onSuccess, onError, onProgress } = options;

  if (!selectedLibraryId.value) {
    message.error('请先选择目标素材库');
    onError(new Error('No library selected'));
    return;
  }

  try {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('libraryId', selectedLibraryId.value);
    formData.append(
      'payload',
      JSON.stringify({ data: { tags: [], folder_id: null } }),
    );

    const response = await miraApiClient.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress({ percent });
        }
      },
    });

    const results = response.data.results || [];
    const result = results[0] || {};

    const uploadLog: UploadLog = {
      error: result.success ? undefined : result.error || '未知错误',
      fileName: file.name,
      fileSize: file.size,
      id: Date.now().toString(),
      success: result.success || false,
      timestamp: new Date(),
    };
    uploadLogs.value.unshift(uploadLog);

    if (result.success) {
      message.success(`文件 ${file.name} 上传成功`);
      onSuccess(response.data);
      const idx = fileList.value.findIndex((item) => item.uid === file.uid);
      if (idx !== -1) fileList.value.splice(idx, 1);
    } else {
      message.error(
        `文件 ${file.name} 上传失败: ${result.error || '未知错误'}`,
      );
      onError(new Error('Upload failed'));
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    const errorMessage =
      error.response?.data?.message || error.message || '上传失败';

    uploadLogs.value.unshift({
      error: errorMessage,
      fileName: file.name,
      fileSize: file.size,
      id: Date.now().toString(),
      success: false,
      timestamp: new Date(),
    });

    message.error(`文件 ${file.name} 上传失败: ${errorMessage}`);
    onError(error);
  }
};

const selectFolder = () => {
  folderInputRef.value?.click();
};

const handleFolderSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = [...(target.files || [])];
  if (files.length === 0) return;

  message.info(`选择了 ${files.length} 个文件，开始上传...`);

  const newFiles: any[] = files.map((file, index) => ({
    uid: `folder-${Date.now()}-${index}`,
    name: file.webkitRelativePath || file.name,
    status: 'uploading',
    originFileObj: file,
  }));

  fileList.value.push(...newFiles);

  newFiles.forEach((fileItem) => {
    customUpload({
      file: fileItem.originFileObj,
      onSuccess: () => {
        fileItem.status = 'done';
        const idx = fileList.value.findIndex(
          (item) => item.uid === fileItem.uid,
        );
        if (idx !== -1) fileList.value.splice(idx, 1);
      },
      onError: () => {
        fileItem.status = 'error';
      },
      onProgress: (progress: any) => {
        fileItem.percent = progress.percent;
      },
    });
  });

  target.value = '';
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const formatTime = (date: Date) =>
  date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

onMounted(() => {
  loadLibraries();
});
</script>

<template>
  <div class="p-6">
    <!-- 标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">文件上传</h1>
      <p class="mt-1 text-sm text-gray-600">选择素材库，上传文件并查看结果</p>
    </div>

    <!-- 步骤条 -->
    <Steps :current="currentStep" class="mb-8">
      <Steps.Step title="选择素材库" />
      <Steps.Step title="上传文件" />
    </Steps>

    <!-- Step 0: 选择素材库 -->
    <Card v-show="currentStep === 0">
      <div class="mx-auto max-w-lg py-8">
        <div class="mb-6 text-center">
          <div class="mb-3 text-5xl">📁</div>
          <h3 class="text-lg font-medium text-gray-900">选择目标素材库</h3>
          <p class="mt-1 text-sm text-gray-500">
            上传的文件将保存到所选素材库中
          </p>
        </div>

        <Select
          v-model:value="selectedLibraryId"
          placeholder="请选择素材库"
          :loading="loadingLibraries"
          :options="libraryOptions"
          class="w-full"
          size="large"
          @change="onLibraryChange"
        />

        <div
          v-if="selectedLibrary"
          class="mt-4 flex items-center space-x-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div class="text-2xl">📁</div>
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">
              {{ selectedLibrary.name }}
            </h4>
            <p class="text-sm text-gray-600">{{ selectedLibrary.path }}</p>
            <p
              v-if="selectedLibrary.description"
              class="mt-1 text-xs text-gray-500"
            >
              {{ selectedLibrary.description }}
            </p>
          </div>
          <span class="text-xs text-gray-400">
            {{ selectedLibrary.type }}
          </span>
        </div>

        <div class="mt-8 text-center">
          <Button
            type="primary"
            size="large"
            :disabled="!selectedLibraryId"
            @click="currentStep = 1"
          >
            下一步：上传文件
          </Button>
        </div>
      </div>
    </Card>

    <!-- Step 1: 上传文件（左右分栏） -->
    <Card v-show="currentStep === 1">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <span class="font-medium text-gray-900">
            目标库: {{ selectedLibrary?.name }}
          </span>
          <span class="ml-3 text-sm text-gray-500">
            成功 {{ successCount }} / 失败 {{ failCount }}
          </span>
        </div>
        <div class="space-x-2">
          <Button @click="currentStep = 0">更换素材库</Button>
          <Button type="dashed" @click="selectFolder">📁 选择文件夹</Button>
        </div>
      </div>

      <div class="flex gap-6">
        <!-- 左侧：上传区域 -->
        <div class="min-w-0 flex-1">
          <Upload
            v-model:file-list="fileList"
            name="files"
            multiple
            :before-upload="beforeUpload"
            :custom-request="customUpload"
            :show-upload-list="true"
            list-type="text"
            class="w-full"
          >
            <div
              class="w-full rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400"
            >
              <div class="mb-2 text-4xl">📤</div>
              <p class="mb-1 text-base font-medium text-gray-700">
                点击或拖拽文件上传
              </p>
              <p class="text-xs text-gray-500">最大 2GB，支持批量上传</p>
            </div>
          </Upload>
        </div>

        <!-- 右侧：上传结果 -->
        <div class="w-72 flex-shrink-0">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">上传结果</span>
            <span v-if="uploadLogs.length > 0" class="text-xs text-gray-400">
              共 {{ uploadLogs.length }} 条
            </span>
          </div>

          <div
            v-if="uploadLogs.length === 0"
            class="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400"
          >
            暂无上传记录
          </div>

          <div v-else class="max-h-80 space-y-2 overflow-y-auto">
            <div
              v-for="log in uploadLogs"
              :key="log.id"
              class="flex items-center justify-between rounded-lg border p-2.5 text-sm"
              :style="{
                borderColor: log.success ? '#86efac' : '#fecaca',
                backgroundColor: log.success ? '#dcfce7' : '#fef2f2',
              }"
            >
              <div class="flex min-w-0 flex-1 items-center space-x-2">
                <span class="flex-shrink-0">
                  {{ log.success ? '✅' : '❌' }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium text-gray-900">
                    {{ log.fileName }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ formatFileSize(log.fileSize) }} ·
                    {{ formatTime(log.timestamp) }}
                  </p>
                  <p
                    v-if="!log.success && log.error"
                    class="truncate text-xs text-red-600"
                  >
                    {{ log.error }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input
        ref="folderInputRef"
        type="file"
        webkitdirectory
        multiple
        class="hidden"
        @change="handleFolderSelect"
      />
    </Card>
  </div>
</template>

<style scoped>
:deep(.ant-upload) {
  display: block;
}
:deep(.ant-upload-list) {
  display: block;
}
</style>
