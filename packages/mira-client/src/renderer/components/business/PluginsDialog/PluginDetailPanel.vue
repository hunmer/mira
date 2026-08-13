<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PluginIcon from '@/renderer/components/common/PluginIcon.vue'
import { usePluginsDialog } from './context'
import { getMarketStatus, getPluginUpdate, getInstallPercent, getInstallPhase, platformLabel } from './utils'

const { t } = useI18n()
const ctx = usePluginsDialog()
</script>

<template>
  <aside
    v-if="ctx.selectedDetail.value"
    class="w-full shrink-0 max-h-[45vh] min-h-0 flex flex-col border border-border dark:border-border rounded-lg overflow-hidden lg:w-80 lg:max-h-none"
  >
    <!-- 详情头部 -->
    <div class="flex items-start justify-between gap-2 p-4 border-b border-border dark:border-border">
      <div class="flex items-start gap-2 min-w-0">
        <!-- 本地/服务器插件图标 -->
        <PluginIcon
          v-if="ctx.selectedRuntime.value"
          :plugin-id="ctx.selectedRuntime.value.config.pluginId"
          :directory="ctx.selectedRuntime.value.directory"
          :icon="ctx.selectedRuntime.value.config.icon"
          :name="ctx.selectedRuntime.value.config.pluginName"
          :size="36"
          rounded="md"
          class="mt-0.5"
        />
        <!-- 市场插件图标 -->
        <PluginIcon
          v-else-if="ctx.selectedMarket.value"
          :plugin-id="ctx.selectedMarket.value.pluginId"
          :base-url="ctx.marketplaceUrl.value"
          :directory="ctx.selectedMarket.value.directory"
          :icon="ctx.selectedMarket.value.icon || undefined"
          :name="ctx.selectedMarket.value.pluginName"
          :size="36"
          rounded="md"
          class="mt-0.5"
        />
        <div class="min-w-0">
          <h3 class="font-medium text-foreground dark:text-muted-foreground truncate">
            {{ ctx.selectedRuntime.value?.config.pluginName || ctx.selectedMarket.value?.pluginName }}
          </h3>
          <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5 truncate">
            v{{ ctx.selectedRuntime.value?.config.version || ctx.selectedMarket.value?.version }} · {{ ctx.selectedRuntime.value?.config.author || ctx.selectedMarket.value?.author }}
          </p>
        </div>
      </div>
      <button
        @click="ctx.clearSelection()"
        class="p-1 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors text-muted-foreground dark:text-muted-foreground shrink-0"
      >
        <span class="material-icons text-base">close</span>
      </button>
    </div>

    <!-- 详情内容（滚动） -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
      <!-- 描述 -->
      <div>
        <label class="block text-xs font-medium mb-1 text-muted-foreground dark:text-muted-foreground">{{ t('business.pluginsDialog.description') }}</label>
        <p class="text-foreground dark:text-muted-foreground">{{ ctx.selectedRuntime.value?.config.description || ctx.selectedMarket.value?.description }}</p>
      </div>

      <!-- 操作按钮 -->
      <div v-if="ctx.selectedRuntime.value" class="flex flex-wrap items-center gap-2 pt-1">
        <button
          v-if="ctx.selectedKind.value === 'local'"
          @click="ctx.togglePlugin(ctx.selectedRuntime.value)"
          :class="[
            'px-3 py-1.5 rounded text-xs font-medium transition-colors',
            ctx.selectedRuntime.value.status !== 'disabled'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-accent dark:bg-muted text-foreground dark:text-muted-foreground hover:bg-muted'
          ]"
        >
          {{ ctx.selectedRuntime.value.status !== 'disabled' ? t('business.pluginsDialog.disable') : t('business.pluginsDialog.enable') }}
        </button>
        <button
          v-if="ctx.selectedKind.value === 'server'"
          @click="ctx.toggleServerPlugin(ctx.selectedRuntime.value)"
          :class="[
            'px-3 py-1.5 rounded text-xs font-medium transition-colors',
            ctx.selectedRuntime.value.status !== 'disabled'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-accent dark:bg-muted text-foreground dark:text-muted-foreground hover:bg-muted'
          ]"
        >
          {{ ctx.selectedRuntime.value.status !== 'disabled' ? t('business.pluginsDialog.disable') : t('business.pluginsDialog.enable') }}
        </button>
        <button
          v-if="ctx.selectedKind.value === 'local'"
          @click="ctx.reloadPlugin(ctx.selectedRuntime.value)"
          class="px-3 py-1.5 rounded text-xs bg-muted dark:bg-muted text-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
        >
          {{ t('business.pluginsDialog.reload') }}
        </button>
        <button
          v-if="ctx.selectedKind.value === 'local' && getPluginUpdate(ctx.selectedRuntime.value.config.pluginId)"
          @click="ctx.updateLocalPlugin(ctx.selectedRuntime.value.config.pluginId)"
          :disabled="ctx.isInstalling(ctx.selectedRuntime.value.config.pluginId)"
          class="px-3 py-1.5 rounded text-xs bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {{ ctx.isInstalling(ctx.selectedRuntime.value.config.pluginId) ? t('business.pluginsDialog.updating') : t('business.pluginsDialog.update') }}
        </button>
        <button
          v-if="ctx.selectedKind.value === 'local'"
          @click="ctx.removePlugin(ctx.selectedRuntime.value)"
          class="px-3 py-1.5 rounded text-xs bg-destructive/10 text-destructive dark:text-destructive hover:bg-destructive/20 transition-colors"
        >
          {{ t('business.pluginsDialog.uninstall') }}
        </button>
      </div>

      <!-- 市场操作 -->
      <div v-if="ctx.selectedMarket.value" class="flex flex-wrap items-center gap-2 pt-1">
        <!-- 安装中 -->
        <template v-if="ctx.isInstalling(ctx.selectedMarket.value.pluginId)">
          <div class="flex-1 flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-muted dark:bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-150 rounded-full"
                :style="{ width: getInstallPercent(ctx.selectedMarket.value.pluginId) + '%' }"
              ></div>
            </div>
            <span class="text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap tabular-nums">
              {{ getInstallPhase(ctx.selectedMarket.value.pluginId) === 'verifying' ? t('business.pluginsDialog.verifying') : getInstallPercent(ctx.selectedMarket.value.pluginId) + '%' }}
            </span>
          </div>
          <button
            @click="ctx.cancelInstall(ctx.selectedMarket.value)"
            class="p-1 rounded text-destructive dark:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <span class="material-icons text-base">close</span>
          </button>
        </template>
        <template v-else>
          <button
            v-if="getMarketStatus(ctx.selectedMarket.value, t).action === 'install'"
            @click="ctx.installMarketplacePlugin(ctx.selectedMarket.value)"
            class="px-3 py-1.5 rounded text-xs bg-primary text-white hover:bg-primary transition-colors"
          >
            {{ t('business.pluginsDialog.install') }}
          </button>
          <button
            v-else-if="getMarketStatus(ctx.selectedMarket.value, t).action === 'update'"
            @click="ctx.installMarketplacePlugin(ctx.selectedMarket.value)"
            class="px-3 py-1.5 rounded text-xs bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            {{ t('business.pluginsDialog.update') }}
          </button>
          <span
            v-else
            class="px-3 py-1.5 rounded text-xs bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground"
          >
            {{ t('business.pluginsDialog.installed') }}
          </span>
        </template>
      </div>

      <!-- 字段表 -->
      <div class="space-y-2 pt-1">
        <div class="flex justify-between gap-2">
          <span class="text-muted-foreground dark:text-muted-foreground shrink-0">{{ t('business.pluginsDialog.pluginId') }}</span>
          <span class="text-foreground dark:text-muted-foreground text-right break-all">{{ ctx.selectedRuntime.value?.config.pluginId || ctx.selectedMarket.value?.pluginId }}</span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-muted-foreground dark:text-muted-foreground shrink-0">{{ t('business.pluginsDialog.author') }}</span>
          <span class="text-foreground dark:text-muted-foreground text-right truncate">{{ ctx.selectedRuntime.value?.config.author || ctx.selectedMarket.value?.author }}</span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-muted-foreground dark:text-muted-foreground shrink-0">{{ t('business.pluginsDialog.homepage') }}</span>
          <a
            v-if="(ctx.selectedRuntime.value?.config.homepage || ctx.selectedMarket.value?.homepage)"
            :href="ctx.selectedRuntime.value?.config.homepage || ctx.selectedMarket.value?.homepage"
            target="_blank"
            class="text-primary hover:underline text-right truncate"
          >{{ ctx.selectedRuntime.value?.config.homepage || ctx.selectedMarket.value?.homepage }}</a>
          <span v-else class="text-muted-foreground">{{ t('business.pluginsDialog.none') }}</span>
        </div>
        <div v-if="ctx.selectedRuntime.value?.directory || ctx.selectedMarket.value?.directory" class="flex justify-between gap-2">
          <span class="text-muted-foreground dark:text-muted-foreground shrink-0">{{ t('business.pluginsDialog.directory') }}</span>
          <span class="text-foreground dark:text-muted-foreground text-right break-all text-xs">{{ ctx.selectedRuntime.value?.directory || ctx.selectedMarket.value?.directory }}</span>
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="ctx.detailTags.value.length" class="pt-1">
        <label class="block text-xs font-medium mb-1 text-muted-foreground dark:text-muted-foreground">{{ t('business.pluginsDialog.dependencies') }}</label>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="tag in ctx.detailTags.value"
            :key="tag"
            class="px-2 py-0.5 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground rounded text-xs"
          >{{ tag }}</span>
        </div>
      </div>

      <!-- 平台支持（市场） -->
      <div v-if="ctx.selectedMarket.value?.platform?.length" class="pt-1">
        <label class="block text-xs font-medium mb-1 text-muted-foreground dark:text-muted-foreground">{{ t('business.pluginsDialog.platform') }}</label>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="p in ctx.selectedMarket.value.platform"
            :key="p"
            class="px-2 py-0.5 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground rounded text-xs"
          >{{ platformLabel(p) }}</span>
        </div>
      </div>

      <!-- 错误信息（本地/服务器） -->
      <div v-if="ctx.selectedRuntime.value?.error" class="pt-1">
        <label class="block text-xs font-medium mb-1 text-destructive dark:text-destructive">{{ t('business.pluginsDialog.errorMessage') }}</label>
        <div class="text-xs text-destructive dark:text-destructive bg-destructive/10 p-2 rounded break-words">{{ ctx.selectedRuntime.value.error }}</div>
      </div>
    </div>
  </aside>
</template>
