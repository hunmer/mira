<script setup lang="ts">
defineProps<{ modelValue?: string; type?: string; placeholder?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    class="input"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
<style scoped>
.input {
  width: 100%; padding: 6px 10px;
  background: var(--bg); color: var(--fg);
  border: 1px solid var(--border); border-radius: var(--radius);
  font: inherit;
}
.input:focus { outline: none; border-color: var(--primary); }
</style>
