<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { Input, message, Modal, TreeSelect } from 'ant-design-vue';

import { miraApiClient } from '#/api/mira/client';

interface TreeNode {
  label: string;
  value: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: '',
    placeholder: '请选择路径',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const selectedPath = ref<string | undefined>(props.modelValue || undefined);
const treeData = ref<TreeNode[]>([]);
const mkdirVisible = ref(false);
const mkdirLoading = ref(false);
const mkdirParent = ref('');
const mkdirParentLabel = ref('');
const newFolderName = ref('');

watch(
  () => props.modelValue,
  (val) => {
    selectedPath.value = val || undefined;
  },
);

async function fetchDirs(dirPath?: string) {
  const response = await miraApiClient.get('/fs/dirs', {
    params: { path: dirPath || '' },
  });
  return (response.data || []) as TreeNode[];
}

function onLoadData(treeNode: any): Promise<void> {
  return new Promise(async (resolve) => {
    const dataRef = treeNode.dataRef;
    if (!dataRef || dataRef.value === undefined) {
      resolve();
      return;
    }
    try {
      const children = await fetchDirs(dataRef.value);
      if (children.length > 0) {
        dataRef.children = children;
      } else {
        dataRef.isLeaf = true;
      }
    } catch {
      dataRef.isLeaf = true;
    }
    resolve();
  });
}

function onChange(value: string) {
  emit('update:modelValue', value || '');
}

function findNode(nodes: TreeNode[], value: string): null | TreeNode {
  for (const node of nodes) {
    if (node.value === value) return node;
    if (node.children) {
      const found = findNode(node.children, value);
      if (found) return found;
    }
  }
  return null;
}

function openMkdir(nodeValue: string, label: string) {
  mkdirParent.value = nodeValue;
  mkdirParentLabel.value = label;
  newFolderName.value = '';
  mkdirVisible.value = true;
}

async function handleMkdir() {
  const name = newFolderName.value.trim();
  if (!name) {
    message.warning('请输入文件夹名称');
    return;
  }

  mkdirLoading.value = true;
  try {
    const response = await miraApiClient.post('/fs/mkdir', {
      path: mkdirParent.value,
      name,
    });
    const newNode = response.data as TreeNode;

    const parentNode = findNode(treeData.value, mkdirParent.value);
    if (parentNode) {
      if (!parentNode.children) parentNode.children = [];
      parentNode.children.push(newNode);
      parentNode.children.sort((a, b) => a.label.localeCompare(b.label));
      parentNode.isLeaf = false;
      treeData.value = [...treeData.value];
    }

    newFolderName.value = '';
    mkdirVisible.value = false;
    selectedPath.value = newNode.value;
    emit('update:modelValue', newNode.value);
    message.success(`文件夹 "${name}" 创建成功`);
  } catch (error: any) {
    message.error(error.response?.data?.error || '创建文件夹失败');
  } finally {
    mkdirLoading.value = false;
  }
}

onMounted(async () => {
  try {
    treeData.value = await fetchDirs();
  } catch (error) {
    console.error('Failed to load root directories:', error);
  }
});
</script>

<template>
  <TreeSelect
    v-model:value="selectedPath"
    style="width: 100%"
    :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
    :placeholder="placeholder"
    allow-clear
    :tree-data="treeData"
    tree-node-filter-prop="label"
    tree-node-label-prop="value"
    :load-data="onLoadData"
    @change="onChange"
  >
    <template #title="{ value: nodeValue, label }">
      <div class="inline-flex w-full items-center justify-between pr-1">
        <span class="truncate">{{ label }}</span>
        <span
          class="ml-2 inline-flex shrink-0 cursor-pointer opacity-40 hover:opacity-100"
          title="在此目录下新建文件夹"
          @click.stop="openMkdir(nodeValue, label)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </span>
      </div>
    </template>
  </TreeSelect>

  <Modal
    v-model:open="mkdirVisible"
    :title="`在 ${mkdirParentLabel} 下新建文件夹`"
    :confirm-loading="mkdirLoading"
    @ok="handleMkdir"
  >
    <div class="py-2">
      <Input
        v-model:value="newFolderName"
        placeholder="请输入文件夹名称"
        @press-enter="handleMkdir"
      />
    </div>
  </Modal>
</template>
