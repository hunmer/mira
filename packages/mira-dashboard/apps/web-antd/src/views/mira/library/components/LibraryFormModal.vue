<script setup lang="ts">
interface FormData {
  name: string;
  path: string;
  type: 'local' | 'remote';
  description: string;
  icon: string;
  enableHash: boolean;
  enableAutoSync: boolean;
  useHttpFile: boolean;
  serverURL: string;
  serverPort: string;
  pluginsDir: string;
}

defineEmits<{
  submit: [];
}>();

const form = defineModel<FormData>({ required: true });
</script>

<template>
  <form @submit.prevent="$emit('submit')" class="space-y-4">
    <div>
      <label class="text-foreground mb-1 block text-sm font-medium">
        名称
      </label>
      <input
        v-model="form.name"
        type="text"
        required
        placeholder="请输入资源库名称"
        class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="text-foreground mb-1 block text-sm font-medium">
        路径
      </label>
      <input
        v-model="form.path"
        type="text"
        required
        placeholder="请输入资源库路径"
        class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="text-foreground mb-1 block text-sm font-medium">
        类型
      </label>
      <select
        v-model="form.type"
        required
        class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="local">本地</option>
        <option value="remote">远程</option>
      </select>
    </div>

    <div>
      <label class="text-foreground mb-1 block text-sm font-medium">
        图标
      </label>
      <input
        v-model="form.icon"
        type="text"
        placeholder="图标名称（默认：default）"
        class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <div class="flex items-center">
      <input
        id="enableHash"
        v-model="form.enableHash"
        type="checkbox"
        class="border-input h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
      />
      <label for="enableHash" class="text-foreground ml-2 block text-sm">
        启用文件哈希校验
      </label>
    </div>

    <div class="flex items-center">
      <input
        id="enableAutoSync"
        v-model="form.enableAutoSync"
        type="checkbox"
        class="border-input h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
      />
      <label for="enableAutoSync" class="text-foreground ml-2 block text-sm">
        启用自动同步（监控文件夹新文件）
      </label>
    </div>

    <div class="flex items-center">
      <input
        id="useHttpFile"
        v-model="form.useHttpFile"
        type="checkbox"
        class="border-input h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
      />
      <label for="useHttpFile" class="text-foreground ml-2 block text-sm">
        使用 HTTP 文件服务（远程库通过 HTTP 获取文件）
      </label>
    </div>

    <!-- 服务器配置（远程库 或 启用 HTTP 文件服务时显示） -->
    <template v-if="form.type === 'remote' || form.useHttpFile">
      <div>
        <label class="text-foreground mb-1 block text-sm font-medium">
          服务器地址
        </label>
        <input
          v-model="form.serverURL"
          type="text"
          :required="form.type === 'remote' || form.useHttpFile"
          placeholder="例如：http://127.0.0.1"
          class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="text-foreground mb-1 block text-sm font-medium">
          服务器端口
        </label>
        <input
          v-model="form.serverPort"
          type="text"
          :required="form.type === 'remote' || form.useHttpFile"
          placeholder="例如：3000"
          class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </template>

    <div>
      <label class="text-foreground mb-1 block text-sm font-medium">
        插件目录
      </label>
      <input
        v-model="form.pluginsDir"
        type="text"
        placeholder="插件目录路径（可选）"
        class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="text-foreground mb-1 block text-sm font-medium">
        描述
      </label>
      <textarea
        v-model="form.description"
        rows="3"
        placeholder="请输入描述（可选）"
        class="border-input bg-background w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      ></textarea>
    </div>
  </form>
</template>
