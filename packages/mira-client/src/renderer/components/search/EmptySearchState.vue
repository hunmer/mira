<template>
  <div class="empty-search-state text-center py-12">
    <div class="empty-icon mb-6">
      <span class="material-icons text-6xl text-gray-500">{{ getEmptyIcon() }}</span>
    </div>
    
    <div class="empty-content">
      <h3 class="text-gray-400 text-lg font-medium mb-2">
        {{ getEmptyTitle() }}
      </h3>
      <p class="text-gray-500 text-sm mb-4">
        {{ getEmptyDescription() }}
      </p>
      
      <!-- 搜索建议 -->
      <div v-if="suggestions.length > 0" class="search-suggestions">
        <p class="text-gray-500 text-xs mb-2">建议尝试：</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-full transition-colors hover:-translate-y-px"
            @click="$emit('search', suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  keyword: string
  serviceTitle: string
  showSuggestions?: boolean
}

interface Emits {
  search: [keyword: string]
}

const props = withDefaults(defineProps<Props>(), {
  showSuggestions: true
})

const emit = defineEmits<Emits>()

/**
 * 获取空状态图标
 */
const getEmptyIcon = (): string => {
  const serviceTitle = props.serviceTitle.toLowerCase()
  
  if (serviceTitle.includes('文档') || serviceTitle.includes('文件')) {
    return 'description_off'
  } else if (serviceTitle.includes('标签')) {
    return 'label_off'
  } else if (serviceTitle.includes('文件夹')) {
    return 'folder_off'
  } else {
    return 'search_off'
  }
}

/**
 * 获取空状态标题
 */
const getEmptyTitle = (): string => {
  return `未找到相关${props.serviceTitle}`
}

/**
 * 获取空状态描述
 */
const getEmptyDescription = (): string => {
  const descriptions = [
    '尝试使用不同的关键词',
    '检查拼写是否正确',
    '使用更短的搜索词',
    '尝试使用同义词'
  ]
  
  // 根据关键词长度和服务类型给出不同建议
  if (props.keyword.length < 2) {
    return '请输入至少2个字符进行搜索'
  }
  
  if (props.keyword.length > 20) {
    return '搜索词过长，请尝试使用更短的关键词'
  }
  
  // 随机返回一个建议
  return descriptions[Math.floor(Math.random() * descriptions.length)]
}

/**
 * 获取搜索建议
 */
const suggestions = computed((): string[] => {
  if (!props.showSuggestions) return []
  
  const serviceTitle = props.serviceTitle.toLowerCase()
  
  if (serviceTitle.includes('文档') || serviceTitle.includes('文件')) {
    return ['图片', '视频', 'PDF', '文档']
  } else if (serviceTitle.includes('标签')) {
    return ['重要', '工作', '个人', '项目']
  } else if (serviceTitle.includes('文件夹')) {
    return ['下载', '文档', '图片', '视频']
  } else {
    return []
  }
})
</script>

<style scoped>
.empty-search-state {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
