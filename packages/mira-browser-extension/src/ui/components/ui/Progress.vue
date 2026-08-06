<script setup lang="ts">
defineProps<{ value: number }>(); // 0-100
</script>
<template>
  <div class="progress"><div class="bar" :style="{ width: value + '%' }" /></div>
</template>
<style scoped>
.progress { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.bar { height: 100%; background: var(--primary); transition: width .2s; }
</style>
