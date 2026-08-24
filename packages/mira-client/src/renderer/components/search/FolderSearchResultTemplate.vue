<template>
  <div class="search-result-item folder-result p-2 rounded-md flex items-center space-x-4 hover:bg-muted cursor-pointer transition-colors duration-200 border border-transparent hover:border-[#374151]">
    <!-- 文件夹图标 -->
    <div class="folder-icon flex-shrink-0">
      <div 
        class="w-12 h-12 rounded-md flex items-center justify-center"
        :style="{ backgroundColor: folderColor }"
      >
        <span class="material-icons text-white text-xl">
          {{ isRootFolder ? 'folder_special' : 'folder' }}
        </span>
      </div>
    </div>

    <!-- 文件夹信息 -->
    <div class="folder-info flex-1 min-w-0">
      <p class="font-semibold text-white truncate" :title="item.title">
        {{ item.title }}
        <span v-if="isRootFolder" class="text-xs text-primary ml-1">{{ t('search.folderSearchResult.rootFolder') }}</span>
      </p>
      <div class="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>{{ t('search.folderSearchResult.fileCount', { count: item.fileCount || 0 }) }}</span>
        <span v-if="item.path">•</span>
        <span v-if="item.path" class="truncate" :title="item.path">{{ item.path }}</span>
      </div>
      <div v-if="item.description" class="text-xs text-muted-foreground mt-1 truncate">
        {{ item.description }}
      </div>
    </div>

    <!-- 文件数量和层级指示 -->
    <div class="folder-meta flex-shrink-0 flex flex-col items-end space-y-1 transition-opacity duration-200">
      <!-- 文件数量 -->
      <span 
        v-if="item.fileCount && item.fileCount > 0" 
        class="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-medium"
      >
        {{ item.fileCount }}
      </span>
      
      <!-- 层级指示 -->
      <div v-if="folderDepth > 0" class="flex items-center space-x-1">
        <span 
          v-for="level in folderDepth" 
          :key="level"
          class="w-1 h-1 bg-muted rounded-full"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface FolderItem {
  id: number
  title: string
  parent_id?: number
  path?: string
  color?: number
  description?: string
  fileCount?: number
  createdAt?: string
  [key: string]: any
}

interface Props {
  item: FolderItem
}

const props = defineProps<Props>()

/**
 * 计算文件夹颜色（缓存）
 */
const folderColor = computed((): string => {
  if (!props.item.color) {
    return isRootFolder.value ? '#3B82F6' : '#6B7280' // 根目录蓝色，其他灰色
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

/**
 * 判断是否为根文件夹（缓存）
 */
const isRootFolder = computed((): boolean => {
  return !props.item.parent_id || props.item.parent_id === 0
})

/**
 * 获取文件夹层级深度（缓存）
 */
const folderDepth = computed((): number => {
  if (!props.item.path) return 0
  
  // 计算路径中的分隔符数量来估算深度
  const pathSeparators = (props.item.path.match(/[/\\]/g) || []).length
  return Math.min(pathSeparators, 5) // 最多显示5层
})
</script>

<style scoped>
.folder-icon {
  transition: transform 0.2s;
}

.search-result-item:hover .folder-icon {
  transform: scale(1.05);
}

.search-result-item:hover .folder-meta {
  opacity: 0.9;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .folder-result {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .folder-result > * {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .folder-icon {
    align-self: center;
  }

  .folder-info {
    text-align: center;
  }

  .folder-meta {
    align-self: center;
    flex-direction: row;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .folder-icon div {
    width: 2.5rem;
    height: 2.5rem;
  }

  .folder-info p {
    font-size: 0.875rem;
  }

  .folder-info div {
    font-size: 0.75rem;
  }
}
</style>
