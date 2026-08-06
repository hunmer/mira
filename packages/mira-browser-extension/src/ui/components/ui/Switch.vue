<script setup lang="ts">
defineProps<{ modelValue?: boolean }>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>
<template>
  <button
    class="switch"
    :class="{ on: modelValue }"
    @click="$emit('update:modelValue', !modelValue)"
  />
</template>
<style scoped>
.switch {
  width: 36px; height: 20px; border-radius: 999px;
  background: var(--border); border: none; cursor: pointer;
  position: relative; transition: background .15s;
}
.switch.on { background: var(--primary); }
.switch::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform .15s;
}
.switch.on::after { transform: translateX(16px); }
</style>
