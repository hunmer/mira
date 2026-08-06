<script setup lang="ts">
import type { SniffedResource } from '@/shared/types';
import ResourceItem from './ResourceItem.vue';
defineProps<{ resources: SniffedResource[]; selected: Set<string> }>();
defineEmits<{ toggle: [id: string] }>();
</script>

<template>
  <div class="list">
    <ResourceItem
      v-for="r in resources" :key="r.id" :resource="r"
      :selected="selected.has(r.id)" @toggle="$emit('toggle', r.id)"
    />
  </div>
</template>

<style scoped>
.list { flex: 1; overflow-y: auto; }
</style>
