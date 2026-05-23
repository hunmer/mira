<template>
  <a-tree-select
    v-model:value="selectedPath"
    style="width: 100%"
    :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
    :placeholder="placeholder"
    allow-clear
    :tree-data="treeData"
    tree-node-filter-prop="label"
    :load-data="onLoadData"
    @change="onChange"
  />
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';

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
      if (children.length) {
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

onMounted(async () => {
  try {
    treeData.value = await fetchDirs();
  } catch (e) {
    console.error('Failed to load root directories:', e);
  }
});
</script>
