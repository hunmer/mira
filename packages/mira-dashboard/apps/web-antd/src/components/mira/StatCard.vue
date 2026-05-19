<template>
  <div class="stat-card bg-background text-foreground rounded-lg shadow-sm p-6" :class="`stat-card--${color}`">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-foreground mb-1">{{ title }}</p>
        <p class="text-2xl font-bold">{{ value }}</p>
      </div>
      <div class="stat-icon">
        <div class="icon-wrapper">{{ iconEmoji }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const props = defineProps<Props>();

const iconEmoji = computed(() => {
  switch (props.icon) {
    case 'Folder':
      return '📁';
    case 'Grid':
      return '🧩';
    case 'User':
      return '👤';
    case 'DataBase':
      return '💾';
    default:
      return '📁';
  }
});
</script>

<style scoped>
.stat-card {
  transition: transform 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.icon-wrapper {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.stat-card--blue .stat-icon .icon-wrapper {
  background-color: #eff6ff;
}

.stat-card--green .stat-icon .icon-wrapper {
  background-color: #f0fdf4;
}

.stat-card--purple .stat-icon .icon-wrapper {
  background-color: #faf5ff;
}

.stat-card--orange .stat-icon .icon-wrapper {
  background-color: #fffbeb;
}
</style>
