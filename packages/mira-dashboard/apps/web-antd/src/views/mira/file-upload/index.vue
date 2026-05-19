<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import { Button, Card, message, Select, Upload } from 'ant-design-vue';

import miraApiClient from '#/api/mira/client';

defineOptions({ name: 'MiraFileUpload' });

// 接口定义
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

// 响应式数据
const loadingLibraries = ref(false);
const libraries = ref<Library[]>([]);
const selectedLibraryId = ref<string>('');
const selectedLibrary = ref<Library | null>(null);
const fileList = ref<UploadFile[]>([]);
const folderInputRef = ref<HTMLInputElement>();
const uploadLogs = ref<UploadLog[]>([]);

// 计算属性
const libraryOptions = computed(() => {
  return libraries.value
    .filter((lib) => lib.status === 'active')
    .map((lib) => ({
      label: lib.name,
      value: lib.id,
    }));
});

// 方法
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
  // 清空之前的文件列表
  fileList.value = [];
};

const beforeUpload = (file: File) => {
  // 这里可以添加文件类型和大小验证
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

    // 可以添加额外的字段
    const payload = {
      data: {
        tags: [],
        folder_id: null,
      },
    };
    formData.append('payload', JSON.stringify(payload));

    const response = await miraApiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress({ percent });
        }
      },
    });

    // 处理上传结果
    const results = response.data.results || [];
    const result = results[0] || {};

    // 添加上传日志
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

      // 上传成功后从文件列表中移除
      const fileIndex = fileList.value.findIndex(
        (item) => item.uid === file.uid,
      );
      if (fileIndex !== -1) {
        fileList.value.splice(fileIndex, 1);
      }
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

    // 添加错误日志
    const uploadLog: UploadLog = {
      error: errorMessage,
      fileName: file.name,
      fileSize: file.size,
      id: Date.now().toString(),
      success: false,
      timestamp: new Date(),
    };
    uploadLogs.value.unshift(uploadLog);

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

  // 批量添加文件到上传列表
  const newFiles: any[] = files.map((file, index) => ({
    uid: `folder-${Date.now()}-${index}`,
    name: file.webkitRelativePath || file.name,
    status: 'uploading',
    originFileObj: file,
  }));

  fileList.value.push(...newFiles);

  // 自动开始上传每个文件
  newFiles.forEach((fileItem) => {
    customUpload({
      file: fileItem.originFileObj,
      onSuccess: () => {
        fileItem.status = 'done';
        // 上传成功后从文件列表中移除
        const fileIndex = fileList.value.findIndex(
          (item) => item.uid === fileItem.uid,
        );
        if (fileIndex !== -1) {
          fileList.value.splice(fileIndex, 1);
        }
      },
      onError: () => {
        fileItem.status = 'error';
      },
      onProgress: (progress: any) => {
        fileItem.percent = progress.percent;
      },
    });
  });

  // 清空input
  target.value = '';
};

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 生命周期
onMounted(() => {
  loadLibraries();
});
</script>

<template>
  <div class="p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">文件上传</h1>
      <p class="mt-1 text-sm text-gray-600">
        选择素材库并上传文件到指定的素材库中
      </p>
    </div>

    <!-- 主要内容卡片 -->
    <Card class="w-full">
      <template #title>
        <div class="flex items-center justify-between">
          <span>文件上传管理</span>
          <Button
            v-if="selectedLibraryId"
            @click="selectFolder"
            type="dashed"
            size="small"
          >
            📁 选择文件夹
          </Button>
        </div>
      </template>

      <!-- 素材库选择区域 -->
      <div class="mb-6 rounded-lg bg-gray-50 p-4">
        <div class="mb-3">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            目标素材库
          </label>
          <Select
            v-model:value="selectedLibraryId"
            placeholder="请选择目标素材库"
            :loading="loadingLibraries"
            :options="libraryOptions"
            class="w-full"
            @change="onLibraryChange"
          />
        </div>

        <div v-if="selectedLibrary" class="mt-3">
          <div
            class="flex items-center space-x-3 rounded-md border bg-white p-3"
          >
            <div class="text-xl">📁</div>
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
            <div class="text-xs text-gray-400">{{ selectedLibrary.type }}</div>
          </div>
        </div>
      </div>

      <!-- 文件上传区域 -->
      <div v-if="selectedLibraryId">
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
            class="w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center transition-colors hover:border-blue-400"
          >
            <div class="mb-4 text-5xl">📤</div>
            <p class="mb-2 text-xl font-medium text-gray-700">
              点击上传或拖拽文件到此区域
            </p>
            <p class="text-base text-gray-500">
              支持单个或批量上传，最大文件大小 2GB
            </p>
          </div>
        </Upload>
      </div>

      <div v-else class="py-12 text-center">
        <div class="mb-4 text-6xl">📋</div>
        <h3 class="mb-2 text-lg font-medium text-gray-900">
          请先选择目标素材库
        </h3>
        <p class="text-sm text-gray-500">选择一个素材库后即可开始上传文件</p>
      </div>

      <!-- 隐藏的文件夹选择器 -->
      <input
        ref="folderInputRef"
        type="file"
        webkitdirectory
        multiple
        class="hidden"
        @change="handleFolderSelect"
      />
    </Card>

    <!-- 上传日志卡片 -->
    <Card v-if="uploadLogs.length > 0" title="上传日志" class="mt-6">
      <div class="max-h-96 overflow-y-auto">
        <div
          v-for="log in uploadLogs"
          :key="log.id"
          class="mb-3 flex items-center justify-between rounded-lg border p-3"
          :class="{
            'border-green-200 bg-green-50': log.success,
            'border-red-200 bg-red-50': !log.success,
          }"
        >
          <div class="flex items-center space-x-3">
            <div class="text-lg">
              {{ log.success ? '✅' : '❌' }}
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ log.fileName }}</p>
              <p class="text-sm text-gray-600">
                {{ formatFileSize(log.fileSize) }} •
                {{ formatTime(log.timestamp) }}
              </p>
              <p v-if="!log.success && log.error" class="text-sm text-red-600">
                {{ log.error }}
              </p>
            </div>
          </div>
          <div class="flex-shrink-0">
            <span
              class="rounded-full px-2 py-1 text-xs font-medium"
              :class="{
                'bg-green-100 text-green-800': log.success,
                'bg-red-100 text-red-800': !log.success,
              }"
            >
              {{ log.success ? '成功' : '失败' }}
            </span>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.p-4 {
  padding: 1rem;
}

.header-section {
  margin-bottom: 1.5rem;
}

.page-title {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 2rem;
}

.page-description {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #6b7280;
}

.library-selection {
  padding: 1rem 0;
}

.library-info {
  margin-top: 1rem;
}

.upload-section {
  padding: 1rem 0;
}

.upload-area {
  padding: 2rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  transition: border-color 0.2s ease;
}

.upload-area:hover,
.upload-area.drag-over {
  background-color: #f8fafc;
  border-color: #3b82f6;
}

.upload-dragger {
  width: 100%;
}

.no-library-selected {
  padding: 2rem;
  color: #6b7280;
  text-align: center;
}

.upload-results {
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  margin-bottom: 0.5rem;
}

.result-item.success {
  border-left: 3px solid #10b981;
}

.result-item.error {
  border-left: 3px solid #ef4444;
}

.result-icon {
  font-size: 1.25rem;
}

.result-status {
  flex-shrink: 0;
}

.error-message {
  padding-left: 2rem;
  margin-top: 0.5rem;
}

.folder-upload {
  padding: 1rem 0;
}

.folder-input {
  margin-top: 1rem;
}

.hidden {
  display: none;
}
</style>
