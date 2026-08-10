<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PluginIcon from '@/renderer/components/common/PluginIcon.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PluginRuntime, MarketplacePluginEntry } from '@/shared/types'
import { getMarketStatus, getPluginUpdate, getInstallPercent, getInstallPhase, platformLabel } from './utils'
import { usePluginsDialog } from './context'

const props = defineProps<{
  kind: 'local' | 'server' | 'market'
  plugin: PluginRuntime | MarketplacePluginEntry
}>()

const { t } = useI18n()
const ctx = usePluginsDialog()

// 统一字段访问：把 PluginRuntime / MarketplacePluginEntry 抽象成统一形状
const isRuntime = computed(() => props.kind === 'local' || props.kind === 'server')
const runtime = computed(() => (isRuntime.value ? (props.plugin as PluginRuntime) : null))
const market = computed(() => (props.kind === 'market' ? (props.plugin as MarketplacePluginEntry) : null))

const pluginId = computed(() =>
  isRuntime.value ? runtime.value!.config.pluginId : market.value!.pluginId
)
const pluginName = computed(() =>
  isRuntime.value ? runtime.value!.config.pluginName : market.value!.pluginName
)
const description = computed(() =>
  isRuntime.value ? runtime.value!.config.description : (market.value!.description || '')
)
const author = computed(() =>
  isRuntime.value ? runtime.value!.config.author : (market.value!.author || '')
)
const version = computed(() =>
  isRuntime.value ? runtime.value!.config.version : market.value!.version
)
const directory = computed(() =>
  isRuntime.value ? runtime.value!.directory : market.value!.directory
)
const icon = computed<string | undefined>(() =>
  isRuntime.value ? runtime.value!.config.icon : (market.value!.icon || undefined)
)
const error = computed(() => (isRuntime.value ? runtime.value!.error : ''))
</script>

<template>
  <div
    @click="ctx.selectPlugin({ kind, pluginId })"
    :class="[
      'border rounded-lg p-4 hover:shadow-md cursor-pointer transition-all',
      ctx.isSelected(kind, pluginId)
        ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
        : 'border-border dark:border-border'
    ]"
  >
    <!-- 顶部：图标 + 名称/描述 + 右侧开关/badge -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1 flex items-start gap-2 min-w-0">
        <PluginIcon
          :plugin-id="pluginId"
          :directory="directory"
          :icon="icon"
          :name="pluginName"
          :base-url="kind === 'market' ? ctx.marketplaceUrl.value : undefined"
          :size="32"
          rounded="md"
          class="mt-0.5"
        />
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-medium text-foreground dark:text-muted-foreground truncate">{{ pluginName }}</h3>
            <!-- 本地：可更新徽章 -->
            <span
              v-if="kind === 'local' && getPluginUpdate(pluginId)"
              class="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
            >
              {{ getPluginUpdate(pluginId)?.fileMismatch && !getPluginUpdate(pluginId)?.versionOutdated ? t('business.pluginsDialog.updatableFileChanged') : t('business.pluginsDialog.updatable') }}
            </span>
            <!-- 市场：安装状态徽章 -->
            <span
              v-else-if="kind === 'market' && getMarketStatus(market!, t).badge"
              :class="[
                'px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
                getMarketStatus(market!, t).badgeClass
              ]"
            >
              {{ getMarketStatus(market!, t).badge }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{{ description }}</p>
        </div>
      </div>

      <!-- 右侧：本地/服务器开关；市场无开关 -->
      <button
        v-if="kind === 'local'"
        @click.stop="ctx.togglePlugin(runtime!)"
        :class="[
          'ml-3 w-10 h-6 rounded-full relative transition-colors',
          runtime!.status !== 'disabled' ? 'bg-green-500' : 'bg-accent dark:bg-muted'
        ]"
      >
        <span
          :class="[
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            runtime!.status !== 'disabled' ? 'left-5' : 'left-1'
          ]"
        ></span>
      </button>
      <button
        v-else-if="kind === 'server'"
        @click.stop="ctx.toggleServerPlugin(runtime!)"
        :class="[
          'ml-3 w-10 h-6 rounded-full relative transition-colors shrink-0',
          runtime!.status !== 'disabled' ? 'bg-green-500' : 'bg-accent dark:bg-muted'
        ]"
        :aria-label="runtime!.status !== 'disabled' ? t('business.pluginsDialog.disableServerPlugin') : t('business.pluginsDialog.enableServerPlugin')"
      >
        <span
          :class="[
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            runtime!.status !== 'disabled' ? 'left-5' : 'left-1'
          ]"
        ></span>
      </button>
    </div>

    <!-- 作者 + 版本 -->
    <div class="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
      <span>{{ author }}</span>
      <span>v{{ version }}</span>
    </div>

    <!-- 错误信息（本地/服务器） -->
    <div
      v-if="error"
      :class="[
        'mt-2 text-xs text-destructive dark:text-destructive p-2 rounded',
        kind === 'local' ? 'bg-destructive dark:bg-destructive/20' : 'bg-destructive/10'
      ]"
    >
      {{ error }}
    </div>

    <!-- 平台支持（市场） -->
    <div v-if="kind === 'market' && market!.platform && market!.platform.length" class="flex items-center gap-1 mt-2">
      <span
        v-for="p in market!.platform"
        :key="p"
        class="px-1.5 py-0.5 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground rounded text-[10px]"
      >
        {{ platformLabel(p) }}
      </span>
    </div>

    <!-- 底部操作区（按 kind 分支） -->
    <div class="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-border dark:border-border" @click.stop>
      <!-- 本地：详情 / 重载 / 更新 / 卸载 -->
      <template v-if="kind === 'local'">
        <button
          @click="ctx.selectPlugin({ kind: 'local', pluginId })"
          class="text-xs text-primary dark:text-primary hover:text-primary dark:hover:text-primary"
        >
          {{ t('business.pluginsDialog.details') }}
        </button>
        <button
          @click="ctx.reloadPlugin(runtime!)"
          class="text-xs text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground"
        >
          {{ t('business.pluginsDialog.reload') }}
        </button>
        <button
          v-if="getPluginUpdate(pluginId)"
          @click="ctx.updateLocalPlugin(pluginId)"
          :disabled="ctx.isInstalling(pluginId)"
          class="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
        >
          {{ ctx.isInstalling(pluginId) ? t('business.pluginsDialog.updating') : t('business.pluginsDialog.update') }}
        </button>
        <button
          @click="ctx.removePlugin(runtime!)"
          class="text-xs text-destructive dark:text-destructive hover:text-destructive dark:hover:text-destructive"
        >
          {{ t('business.pluginsDialog.uninstall') }}
        </button>
      </template>

      <!-- 服务器：详情 / 服务器提供 -->
      <template v-else-if="kind === 'server'">
        <button
          @click="ctx.selectPlugin({ kind: 'server', pluginId })"
          class="text-xs text-primary dark:text-primary hover:text-primary"
        >
          {{ t('business.pluginsDialog.details') }}
        </button>
        <span class="text-xs text-muted-foreground">{{ t('business.pluginsDialog.providedByServer') }}</span>
      </template>

      <!-- 市场：安装 / 更新 / 已安装 + 进度条 -->
      <template v-else>
        <!-- 安装中：进度条 + 取消 -->
        <div v-if="ctx.isInstalling(pluginId)" class="flex items-center justify-end w-full gap-2">
          <div class="flex-1 flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-muted dark:bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-150 rounded-full"
                :style="{ width: getInstallPercent(pluginId) + '%' }"
              ></div>
            </div>
            <span class="text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap tabular-nums">
              {{ getInstallPhase(pluginId) === 'verifying' ? t('business.pluginsDialog.verifying') : getInstallPercent(pluginId) + '%' }}
            </span>
          </div>
          <TooltipProvider :ignore-non-keyboard-focus="true">
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  @click="ctx.cancelInstall(market!)"
                  class="p-1 rounded text-destructive dark:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <span class="material-icons text-base">close</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{{ t('business.pluginsDialog.cancelInstall') }}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <!-- 非安装中：常规按钮 -->
        <template v-else>
          <button
            v-if="getMarketStatus(market!, t).action === 'install'"
            @click="ctx.installMarketplacePlugin(market!)"
            class="text-xs px-3 py-1 rounded bg-primary text-white hover:bg-primary transition-colors"
          >
            {{ t('business.pluginsDialog.install') }}
          </button>
          <button
            v-else-if="getMarketStatus(market!, t).action === 'update'"
            @click="ctx.installMarketplacePlugin(market!)"
            class="text-xs px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            {{ t('business.pluginsDialog.update') }}
          </button>
          <button
            v-else
            disabled
            class="text-xs px-3 py-1 rounded bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground cursor-default"
          >
            {{ t('business.pluginsDialog.installed') }}
          </button>
        </template>
      </template>
    </div>
  </div>
</template>
