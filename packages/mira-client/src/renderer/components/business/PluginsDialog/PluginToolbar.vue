<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Motion, LayoutGroup } from 'motion-v'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ExpandableButton } from '@renderer/components/common'
import { usePluginStore } from '@renderer/stores/plugin'
import { usePluginsDialog } from './context'

const { t } = useI18n()
const ctx = usePluginsDialog()
const pluginStore = usePluginStore()
</script>

<template>
  <!-- 第一行：分类tab + 顶部操作栏 -->
  <div class="flex items-center gap-3 flex-wrap">
    <!-- 插件类型切换（分段控件，激活态背景随切换平滑滑动） -->
    <div class="bg-white/40 dark:bg-muted/40 rounded-lg p-1 grid grid-cols-3 border border-white/60 dark:border-border shrink-0">
      <LayoutGroup id="plugins-tab">
        <button
          v-for="tab in ctx.pluginTabs"
          :key="tab.value"
          class="relative text-xs py-2 px-3 rounded-md font-medium transition-colors whitespace-nowrap"
          :class="[
            ctx.activeTab.value === tab.value
              ? 'text-primary'
              : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground'
          ]"
          @click="ctx.activeTab.value = tab.value"
        >
          <!-- 激活态背景：共享 layoutId，切换 tab 时由 motion-v 在按钮间平滑滑动 -->
          <Motion
            v-if="ctx.activeTab.value === tab.value"
            layoutId="plugins-active-tab"
            :transition="{ type: 'spring', stiffness: 400, damping: 32 }"
            class="absolute inset-0 z-0 rounded-md bg-primary/10 shadow-sm"
          />
          <span class="relative z-[1]">{{ t(tab.labelKey) }}</span>
        </button>
      </LayoutGroup>
    </div>

    <div class="flex-1"></div>

    <!-- 操作按钮组 -->
    <div class="flex items-center space-x-2">
      <!-- 搜索栏（点击展开/折叠） -->
      <ExpandableButton
        icon="search"
        :expand-tooltip="t('business.pluginsDialog.searchPlaceholder')"
        :collapse-tooltip="t('common.close')"
        class="shrink-0"
      >
        <InputGroup class="w-64">
          <InputGroupAddon>
            <span class="material-icons text-sm">search</span>
          </InputGroupAddon>
          <InputGroupInput
            v-model="ctx.searchQuery.value"
            :placeholder="t('business.pluginsDialog.searchPlaceholder')"
          />
        </InputGroup>
      </ExpandableButton>

      <!-- 检查更新按钮（仅本地插件 tab 且配置了市场源时显示） -->
      <TooltipProvider v-if="ctx.activeTab.value === 'local' && ctx.marketplaceUrl.value" :ignore-non-keyboard-focus="true">
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              @click="ctx.checkUpdates"
              :disabled="pluginStore.isCheckingUpdates"
              class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-muted transition-colors text-muted-foreground dark:text-muted-foreground disabled:opacity-50"
            >
              <span class="material-icons text-base" :class="{ 'animate-spin': pluginStore.isCheckingUpdates }">sync</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{{ ctx.pluginUpdateCount.value > 0 ? t('business.pluginsDialog.checkUpdatesCount', { count: ctx.pluginUpdateCount.value }) : t('business.pluginsDialog.checkUpdates') }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- 添加插件按钮 -->
      <TooltipProvider :ignore-non-keyboard-focus="true">
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              @click="ctx.showAddPluginDialog.value = true"
              class="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary transition-colors"
            >
              <span class="material-icons text-base">add</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{{ t('business.pluginsDialog.addNew') }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
