<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePluginStore } from '@renderer/stores/plugin'
import PluginCard from './PluginCard.vue'
import { usePluginsDialog } from './context'

const { t } = useI18n()
const ctx = usePluginsDialog()
const pluginStore = usePluginStore()
</script>

<template>
  <div>
    <!-- 插件源切换 -->
    <div v-if="ctx.marketplaceUrlList.value.length > 0" class="flex items-center gap-2 mb-3">
      <span class="text-sm text-muted-foreground dark:text-muted-foreground whitespace-nowrap">{{ t('business.pluginsDialog.marketSource') }}</span>
      <Select
        :model-value="ctx.marketplaceUrl.value"
        @update:model-value="ctx.switchMarketSource"
      >
        <SelectTrigger size="sm" class="w-[320px]">
          <SelectValue :placeholder="t('business.pluginsDialog.marketSourcePlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="url in ctx.marketplaceUrlList.value" :key="url" :value="url">
            {{ url }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 未配置市场源 -->
    <div v-if="!ctx.marketplaceUrl.value" class="flex flex-col items-center justify-center h-full text-center py-12">
      <span class="material-icons text-6xl text-muted-foreground dark:text-muted-foreground">cloud_off</span>
      <h3 class="text-lg font-medium text-muted-foreground dark:text-muted-foreground mt-4">{{ t('business.pluginsDialog.noMarketSourceTitle') }}</h3>
      <p class="text-muted-foreground dark:text-muted-foreground mt-2">{{ t('business.pluginsDialog.noMarketSourceDesc') }}</p>
    </div>

    <!-- 加载中 -->
    <div v-else-if="pluginStore.isMarketplaceLoading" class="flex flex-col items-center justify-center h-full text-center py-12">
      <span class="material-icons text-5xl text-muted-foreground dark:text-muted-foreground animate-spin">sync</span>
      <p class="text-muted-foreground dark:text-muted-foreground mt-4">{{ t('business.pluginsDialog.marketLoading') }}</p>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="pluginStore.marketplaceError && ctx.filteredMarketplacePlugins.value.length === 0" class="flex flex-col items-center justify-center h-full text-center py-12">
      <span class="material-icons text-6xl text-destructive dark:text-destructive">error_outline</span>
      <h3 class="text-lg font-medium text-muted-foreground dark:text-muted-foreground mt-4">{{ t('business.pluginsDialog.marketLoadFailedTitle') }}</h3>
      <p class="text-muted-foreground dark:text-muted-foreground mt-2">{{ pluginStore.marketplaceError }}</p>
      <button
        @click="ctx.loadMarketplace()"
        class="mt-4 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary transition-colors"
      >
        {{ t('business.pluginsDialog.retry') }}
      </button>
    </div>

    <!-- 市场插件列表 -->
    <div v-else class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      <PluginCard
        v-for="entry in ctx.filteredMarketplacePlugins.value"
        :key="entry.pluginId"
        kind="market"
        :plugin="entry"
      />

      <!-- 空状态 -->
      <div v-if="ctx.filteredMarketplacePlugins.value.length === 0" class="col-span-full text-center py-12">
        <span class="material-icons text-6xl text-muted-foreground dark:text-muted-foreground">store</span>
        <p class="text-muted-foreground dark:text-muted-foreground mt-4">
          {{ ctx.searchQuery.value ? t('business.pluginsDialog.noMarketMatch') : t('business.pluginsDialog.marketEmpty') }}
        </p>
      </div>
    </div>
  </div>
</template>
