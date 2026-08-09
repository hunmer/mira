<template>
  <div class="empty-search-state text-center py-12">
    <div class="empty-icon mb-6 flex justify-center">
      <StatusImage name="no_result" size="large" />
    </div>
    
    <div class="empty-content">
      <h3 class="text-muted-foreground text-lg font-medium mb-2">
        {{ getEmptyTitle() }}
      </h3>
      <p class="text-muted-foreground text-sm mb-4">
        {{ getEmptyDescription() }}
      </p>
      
      <!-- 搜索建议 -->
      <div v-if="suggestions.length > 0" class="search-suggestions">
        <p class="text-muted-foreground text-xs mb-2">{{ t('search.emptySearchState.suggestionsLabel') }}</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            class="px-3 py-1 bg-muted hover:bg-muted text-muted-foreground text-xs rounded-full transition-colors hover:-translate-y-px"
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
import { useI18n } from 'vue-i18n'
import StatusImage from '@renderer/components/common/StatusImage.vue'

const { t } = useI18n()

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

defineEmits<Emits>()

/**
 * 获取空状态标题
 */
const getEmptyTitle = (): string => {
  return t('search.emptySearchState.notFound', { title: props.serviceTitle })
}

/**
 * 获取空状态描述
 */
const getEmptyDescription = (): string => {
  // 根据关键词长度和服务类型给出不同建议
  if (props.keyword.length < 2) {
    return t('search.emptySearchState.descTooShort')
  }

  if (props.keyword.length > 20) {
    return t('search.emptySearchState.descTooLong')
  }

  const descriptions = [
    t('search.emptySearchState.descTryDifferentKeywords'),
    t('search.emptySearchState.descCheckSpelling'),
    t('search.emptySearchState.descUseShorter'),
    t('search.emptySearchState.descUseSynonyms')
  ]

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
    return [
      t('search.emptySearchState.suggestionImage'),
      t('search.emptySearchState.suggestionVideo'),
      t('search.emptySearchState.suggestionPdf'),
      t('search.emptySearchState.suggestionDocument')
    ]
  } else if (serviceTitle.includes('标签')) {
    return [
      t('search.emptySearchState.suggestionImportant'),
      t('search.emptySearchState.suggestionWork'),
      t('search.emptySearchState.suggestionPersonal'),
      t('search.emptySearchState.suggestionProject')
    ]
  } else if (serviceTitle.includes('文件夹')) {
    return [
      t('search.emptySearchState.suggestionDownload'),
      t('search.emptySearchState.suggestionDocument'),
      t('search.emptySearchState.suggestionImage'),
      t('search.emptySearchState.suggestionVideo')
    ]
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
