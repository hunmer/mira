<script setup lang="ts">
defineProps<{
  installForm: {
    name: string;
    npmSource: string;
    proxy: string;
    version: string;
  };
  installTab: string;
  selectedFile: File | null;
}>();

const emit = defineEmits<{
  fileSelect: [event: Event];
  'update:installTab': [value: string];
}>();
</script>

<template>
  <div>
    <!-- 安装方式选择 -->
    <div class="mb-4">
      <div class="flex border-b">
        <button
          class="px-4 py-2 text-sm font-medium"
          :class="[installTab === 'local' ? 'border-b-2 border-blue-500' : '']"
          @click="emit('update:installTab', 'local')"
        >
          从本地安装
        </button>
        <button
          class="px-4 py-2 text-sm font-medium"
          :class="[
            installTab === 'repository' ? 'border-b-2 border-blue-500' : '',
          ]"
          @click="emit('update:installTab', 'repository')"
        >
          从仓库安装
        </button>
      </div>
    </div>

    <!-- 本地安装 -->
    <div v-if="installTab === 'local'" class="space-y-4">
      <div>
        <label class="mb-2 block text-sm font-medium">选择插件包</label>
        <input
          type="file"
          accept=".zip,.tar.gz"
          class="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-blue-100"
          @change="emit('fileSelect', $event)"
        />
        <p class="mt-1 text-xs">支持 .zip 和 .tar.gz 格式的插件包</p>
      </div>
      <div v-if="selectedFile" class="text-sm">
        已选择: {{ selectedFile.name }}
      </div>
    </div>

    <!-- 仓库安装 -->
    <div v-if="installTab === 'repository'" class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium">插件名称</label>
        <input
          :value="installForm.name"
          type="text"
          placeholder="请输入npm包名称，如：mira-plugin-example"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          @input="installForm.name = ($event.target as HTMLInputElement).value"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">版本</label>
        <input
          :value="installForm.version"
          type="text"
          placeholder="latest"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          @input="
            installForm.version = ($event.target as HTMLInputElement).value
          "
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">NPM 源</label>
        <select
          :value="installForm.npmSource"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          @change="
            installForm.npmSource = ($event.target as HTMLSelectElement).value
          "
        >
          <option value="npmmirror">npmmirror（默认）</option>
          <option value="npm">npm</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">代理地址</label>
        <input
          :value="installForm.proxy"
          type="text"
          placeholder="可选，如：http://proxy.example.com:8080"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          @input="installForm.proxy = ($event.target as HTMLInputElement).value"
        />
        <p class="mt-1 text-xs text-gray-500">
          如果网络环境需要代理才能访问npm仓库，请填写代理地址
        </p>
      </div>
    </div>
  </div>
</template>
