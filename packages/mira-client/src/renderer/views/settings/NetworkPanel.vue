<template>
  <div class="p-4 space-y-6">
    <!-- HTTP 代理 -->
    <div>
      <p class="text-muted-foreground dark:text-muted-foreground text-sm">
        配置 HTTP 代理，对所有网络请求生效（插件下载、插件市场目录、应用自更新等）。
      </p>

      <!-- 启用代理开关 -->
      <div class="flex items-center justify-between gap-4 py-3">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">HTTP 代理</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">启用后所有网络请求将通过指定的代理服务器转发</p>
        </div>
        <Switch
          :checked="settingsStore.settings.networkProxyEnabled"
          @update:checked="(enabled: boolean) => handleSettingChange('networkProxyEnabled', enabled)"
        />
      </div>

      <!-- 代理地址 -->
      <div class="flex flex-col gap-2 py-2">
        <label class="text-foreground dark:text-muted-foreground text-base font-medium leading-normal">代理地址</label>
        <div class="flex items-center gap-2">
          <Input
            v-model="proxyUrlDraft"
            type="text"
            placeholder="http://127.0.0.1:7890"
            class="flex-1"
            :disabled="!settingsStore.settings.networkProxyEnabled"
            @blur="commitProxyUrl"
            @keydown.enter="($event.target as HTMLInputElement)?.blur()"
          />
          <Button
            variant="outline"
            size="sm"
            :disabled="!canTest"
            @click="testProxy"
          >
            <span v-if="!isTesting" class="material-icons text-base mr-1 align-middle">bolt</span>
            {{ isTesting ? '测试中...' : '测试连接' }}
          </Button>
        </div>
        <!-- 测试结果 -->
        <div
          v-if="testResult"
          :class="[
            'text-sm rounded-md px-3 py-2',
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-destructive'
          ]"
        >
          <span class="font-medium">{{ testResult.success ? '✓ 成功' : '✗ 失败' }}</span>
          <span class="ml-2">{{ testResult.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { ProxyTestResult } from '../../../shared/types'

const settingsStore = useSettingsStore()
const toast = useToast()

// 代理地址的本地草稿：失焦/回车时再落库，避免每次按键都触发保存 + IPC
const proxyUrlDraft = ref(settingsStore.settings.networkProxyUrl || '')

// 是否具备测试条件：填了地址即可测试（与开关状态无关，便于先测后存）
const canTest = computed(() => proxyUrlDraft.value.trim().length > 0 && !isTesting.value)

const isTesting = ref(false)
const testResult = ref<ProxyTestResult | null>(null)

/**
 * 失焦/回车时把代理地址草稿提交落库。
 * 落库会经由 settingsStore.updateSetting 触发 network:set-proxy，使主进程即时生效。
 */
const commitProxyUrl = async () => {
  const next = proxyUrlDraft.value.trim()
  if (next === (settingsStore.settings.networkProxyUrl || '').trim()) return
  await handleSettingChange('networkProxyUrl', next)
}

/**
 * 测试当前输入框中的代理地址连通性。
 * 即使未「保存/启用」也可以测试，便于先验证再决定是否启用。
 */
const testProxy = async () => {
  const url = proxyUrlDraft.value.trim()
  if (!url) {
    toast.add({ severity: 'warn', summary: '请输入代理地址', detail: '代理地址不能为空', life: 3000 })
    return
  }

  const network = (window as any).electronAPI?.network
  if (!network?.testProxy) {
    toast.add({ severity: 'error', summary: '不支持', detail: '当前环境不支持代理测试', life: 4000 })
    return
  }

  isTesting.value = true
  testResult.value = null
  try {
    const result = await network.testProxy({ enabled: true, url }) as ProxyTestResult
    testResult.value = result
    toast.add({
      severity: result.success ? 'success' : 'error',
      summary: result.success ? '代理可用' : '代理不可用',
      detail: result.message,
      life: result.success ? 3000 : 5000,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    testResult.value = { success: false, message }
    toast.add({ severity: 'error', summary: '测试失败', detail: message, life: 5000 })
  } finally {
    isTesting.value = false
  }
}

/**
 * 统一设置变更入口（沿用 GeneralPanel 模式）。
 * 通过 store 更新会自动 apply + save；网络代理相关 key 还会触发 IPC 推送。
 */
const handleSettingChange = async (key: string, value: any) => {
  try {
    await settingsStore.updateSetting(key as any, value)
    toast.add({
      severity: 'success',
      summary: '设置已保存',
      detail: `${key} 设置已成功更新`,
      life: 2000,
    })
  } catch (error) {
    console.error('Setting change error:', error, 'Value:', value)
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: error instanceof Error ? error.message : '保存设置时发生错误',
      life: 5000,
    })
  }
}
</script>
