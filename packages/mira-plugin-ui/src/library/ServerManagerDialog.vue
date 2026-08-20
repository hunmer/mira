<script setup lang="ts">
/**
 * 服务器管理对话框:Dialog 弹出 ServerManagerView(列表/新增/编辑/删除/测试/激活)。
 *
 * - open 受控(v-model:open);ServerManagerView 的 close(× 或激活成功)同步关闭对话框
 * - 隐藏 Dialog 默认关闭按钮,关闭入口统一走视图内顶栏 ×
 * - 视图为 absolute inset-0 铺满,DialogContent 去 padding 并提供 relative 定位父级与固定高度
 */
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog'
import { createLibraryTreeT } from './i18n'
import ServerManagerView from './ServerManagerView.vue'
import type { LibraryTreeT, ManagedServer, ServerManagerServices } from './types'

const props = withDefaults(defineProps<{
  /** 对话框开关(v-model:open) */
  open: boolean
  /** 服务器列表(宿主持久化配置,响应式) */
  servers: ManagedServer[]
  /** 当前激活服务器 id;列表对应项高亮并禁用「切换到此」 */
  activeServerId?: string
  /** 数据服务:增删改 + 测试连接 + 激活 */
  services: ServerManagerServices
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT
}>(), {
  activeServerId: '',
})

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const fallbackT = createLibraryTreeT()
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params)
  const r = props.t(key, params)
  return r === key ? fallbackT(key, params) : r
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="h-auto gap-0 overflow-hidden p-0 sm:max-w-md" :show-close-button="false">
      <DialogTitle class="sr-only">{{ tt('server.manager') }}</DialogTitle>
      <div class="relative h-[28rem]">
        <ServerManagerView
          :servers="props.servers"
          :active-server-id="props.activeServerId"
          :services="props.services"
          :t="props.t"
          @close="emit('update:open', false)"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
