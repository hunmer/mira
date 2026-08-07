<script setup lang="ts">
/**
 * SidebarLayoutDialog —— 自定义左侧栏模块布局对话框。
 *
 * 两个 VueDraggable 区：「已启用」「未启用」，同 group 名实现跨区拖拽与区内排序。
 * v-model:open 控制显隐，由 HomeSidebar 通过 ref 控制开关。
 *
 * 数据流：VueDraggable 直接 v-model 绑定本地 ref 镜像；拖拽导致本地列表变化时，
 * watch 把结果写回 homeSidebarLayout store 并持久化（所见即所得，无额外保存按钮）。
 */
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useHomeSidebarLayoutStore } from '@renderer/stores/homeSidebarLayout'
import { getModuleDef, type SidebarModuleId } from './sidebarModules'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const store = useHomeSidebarLayoutStore()

/** 对话框需要的列表项结构（带可读文案，供模板渲染） */
interface ModuleItem {
  id: SidebarModuleId
  title: string
  icon: string
  description: string
}

// 本地镜像：VueDraggable 通过 v-model 直接操作这两个数组
const enabledList = ref<SidebarModuleId[]>([])
const disabledList = ref<SidebarModuleId[]>([])

// 每次 dialog 打开时，用 store 当前值初始化本地镜像
watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      enabledList.value = [...store.enabledIds]
      disabledList.value = [...store.disabledIds]
    }
  },
)

// 本地列表变化（拖拽导致）→ 写回 store 持久化
watch(
  [enabledList, disabledList],
  () => {
    if (!props.modelValue) return
    store.setEnabled(enabledList.value)
  },
  { deep: true },
)

function toItem(id: SidebarModuleId): ModuleItem | null {
  const d = getModuleDef(id)
  if (!d) return null
  return { id: d.id, title: d.title, icon: d.icon, description: d.description }
}

const enabledView = computed<ModuleItem[]>(() =>
  enabledList.value.map(toItem).filter((x): x is ModuleItem => !!x),
)
const disabledView = computed<ModuleItem[]>(() =>
  disabledList.value.map(toItem).filter((x): x is ModuleItem => !!x),
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>自定义侧边栏布局</DialogTitle>
        <DialogDescription>
          拖拽调整左侧栏模块顺序；把模块拖到「未启用」可隐藏，拖回「已启用」即可恢复。
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-2 gap-3 py-2">
        <!-- 已启用 -->
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground">
            <span class="material-icons text-sm text-primary">check_circle</span>
            <span>已启用</span>
          </div>
          <VueDraggable
            v-model="enabledList"
            :animation="180"
            group="sidebar-modules"
            class="flex flex-col gap-1.5 min-h-[120px] p-1.5 rounded-xl border border-dashed border-border/70 bg-muted/30"
            :fallback-tolerance="4"
          >
            <div
              v-for="item in enabledView"
              :key="item.id"
              class="group flex items-center gap-2 p-2 rounded-lg bg-background border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-grab active:cursor-grabbing"
            >
              <span class="material-icons text-base text-muted-foreground group-hover:text-primary">drag_indicator</span>
              <span class="material-icons text-base text-primary">{{ item.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-foreground truncate">{{ item.title }}</div>
                <div class="text-[11px] text-muted-foreground truncate">{{ item.description }}</div>
              </div>
            </div>
          </VueDraggable>
        </div>

        <!-- 未启用 -->
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground">
            <span class="material-icons text-sm">remove_circle_outline</span>
            <span>未启用</span>
          </div>
          <VueDraggable
            v-model="disabledList"
            :animation="180"
            group="sidebar-modules"
            class="flex flex-col gap-1.5 min-h-[120px] p-1.5 rounded-xl border border-dashed border-border/70 bg-muted/20"
            :fallback-tolerance="4"
          >
            <div
              v-for="item in disabledView"
              :key="item.id"
              class="group flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-grab active:cursor-grabbing"
            >
              <span class="material-icons text-base text-muted-foreground group-hover:text-primary">drag_indicator</span>
              <span class="material-icons text-base text-muted-foreground">{{ item.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-foreground/80 truncate">{{ item.title }}</div>
                <div class="text-[11px] text-muted-foreground truncate">{{ item.description }}</div>
              </div>
            </div>
            <div v-if="disabledView.length === 0" class="text-[11px] text-muted-foreground/60 text-center py-4">
              所有模块均已启用
            </div>
          </VueDraggable>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" @click="open = false">完成</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
