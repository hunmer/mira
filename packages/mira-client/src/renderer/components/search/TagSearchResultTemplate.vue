<template>
  <div class="search-result-item tag-result p-2 rounded-md flex items-center space-x-4 hover:bg-muted cursor-pointer transition-colors duration-200 border border-transparent hover:border-[#374151]">
    <!-- 标签颜色指示器 -->
    <div class="tag-indicator flex-shrink-0">
      <div 
        class="w-12 h-12 rounded-md flex items-center justify-center"
        :style="{ backgroundColor: tagColor }"
      >
        <span class="material-icons text-white text-xl">label</span>
      </div>
    </div>

    <!-- 标签信息 -->
    <div class="tag-info flex-1 min-w-0">
      <p class="font-semibold text-white truncate" :title="item.title">
        {{ item.title }}
      </p>
      <div class="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>{{ t('search.tagSearchResult.fileCount', { count: item.fileCount || 0 }) }}</span>
        <span v-if="item.description">•</span>
        <span v-if="item.description" class="truncate">{{ item.description }}</span>
      </div>
    </div>

    <!-- 文件数量标识 -->
    <div v-if="item.fileCount && item.fileCount > 0" class="tag-count flex-shrink-0">
      <span class="text-xs bg-primary text-white px-3 py-1 rounded-full font-medium">
        {{ item.fileCount }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface TagItem {
  id: number
  title: string
  color?: number
  description?: string
  fileCount?: number
  createdAt?: string
  [key: string]: any
}

interface Props {
  item: TagItem
}

const props = defineProps<Props>()

/**
 * 计算标签颜色（缓存）
 */
const tagColor = computed((): string => {
  if (!props.item.color) {
    return '#6B7280' // 默认灰色
  }
  
  // 将数字颜色转换为16进制颜色
  const color = props.item.color
  
  // 如果是预定义的颜色索引，使用预设颜色
  const predefinedColors = [
    '#EF4444', // 红色
    '#F97316', // 橙色
    '#EAB308', // 黄色
    '#22C55E', // 绿色
    '#3B82F6', // 蓝色
    '#8B5CF6', // 紫色
    '#EC4899', // 粉色
    '#6B7280', // 灰色
  ]
  
  if (color >= 0 && color < predefinedColors.length) {
    return predefinedColors[color]
  }
  
  // 否则尝试将数字转换为十六进制颜色
  try {
    const hexColor = '#' + color.toString(16).padStart(6, '0')
    return hexColor
  } catch {
    return '#6B7280' // 默认灰色
  }
})
</script>

<style scoped>
.tag-indicator {
  transition: transform 0.2s;
}

.search-result-item:hover .tag-indicator {
  transform: scale(1.05);
}

.tag-count {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .tag-result {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .tag-result > * {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .tag-indicator {
    align-self: center;
  }

  .tag-info {
    text-align: center;
  }

  .tag-count {
    align-self: center;
  }
}

@media (max-width: 480px) {
  .tag-indicator div {
    width: 2.5rem;
    height: 2.5rem;
  }

  .tag-info p {
    font-size: 0.875rem;
  }

  .tag-info div {
    font-size: 0.75rem;
  }
}
</style>
