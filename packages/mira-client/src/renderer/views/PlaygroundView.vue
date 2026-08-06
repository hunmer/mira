<template>
  <div class="playground-view h-full flex flex-col bg-muted dark:bg-muted">
    <!-- 顶部标题栏 -->
    <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-slate-200 dark:border-border px-10 py-3 bg-white dark:bg-muted">
      <div class="flex items-center gap-4 text-foreground dark:text-muted-foreground">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
                @click="goBack"
              >
                <span class="material-icons text-lg">arrow_back</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">返回</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span class="material-icons text-lg">science</span>
        <h2 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em]">Playground</h2>
      </div>
    </header>

    <!-- 主内容区域 -->
    <div class="flex-1 overflow-y-auto">
      <PlaygroundPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PlaygroundPanel from './settings/PlaygroundPanel.vue'

const router = useRouter()

const goBack = () => {
  router.go(-1)
}
</script>
