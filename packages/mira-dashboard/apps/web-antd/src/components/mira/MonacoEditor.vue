<template>
  <div class="editor-container">
    <textarea
      v-model="internalValue"
      :style="{ height: `${height}px` }"
      class="code-textarea"
      placeholder="请输入配置内容..."
      @input="handleInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  modelValue: string;
  language?: string;
  height?: number;
  options?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  language: 'json',
  height: 300,
  options: () => ({}),
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const internalValue = ref(props.modelValue);

const handleInput = () => {
  emit('update:modelValue', internalValue.value);
};

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (internalValue.value !== newValue) {
      internalValue.value = newValue;
    }
  },
);
</script>

<style scoped>
.editor-container {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
  background: #1e1e1e;
}

.code-textarea {
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  padding: 12px;
  line-height: 1.5;
}

.code-textarea::placeholder {
  color: #666;
}

.code-textarea:focus {
  background: #252526;
}
</style>
