<script setup lang="ts">
import { Motion, LayoutGroup } from 'motion-v'
import { usePluginsDialog } from './context'

const ctx = usePluginsDialog()
</script>

<template>
  <!-- 第二行：类别横向滚动按钮栏（激活态背景随切换平滑滑动） -->
  <div class="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
    <LayoutGroup id="plugins-category">
      <button
        v-for="cat in ctx.categories.value"
        :key="cat.value"
        class="relative flex items-center px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap shrink-0 border border-transparent"
        :class="[
          ctx.selectedCategory.value === cat.value
            ? 'text-primary'
            : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-muted/60'
        ]"
        @click="ctx.selectedCategory.value = cat.value"
      >
        <!-- 激活态背景：共享 layoutId，切换类别时由 motion-v 在按钮间平滑滑动 -->
        <Motion
          v-if="ctx.selectedCategory.value === cat.value"
          layoutId="plugins-active-category"
          :transition="{ type: 'spring', stiffness: 400, damping: 32 }"
          class="absolute inset-0 z-0 rounded-full bg-primary/10 ring-1 ring-primary/30"
        />
        <span class="relative z-[1] flex items-center">
          <span class="material-icons text-base mr-1.5">{{ cat.icon }}</span>
          {{ cat.label }}
        </span>
      </button>
    </LayoutGroup>
  </div>
</template>
