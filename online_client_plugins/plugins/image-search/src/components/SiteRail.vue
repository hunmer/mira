<script setup lang="ts">
import { t } from '@/lib/i18n'
import { SITES } from '@/lib/sites'
import { engineState, setEngine } from '@/stores/engine'

/**
 * 最右侧垂直站点栏：Pinterest（接口搜图）+ 各网页搜图站点。
 * 点击切换搜索模式；站点徽标用首字母/短字（无品牌图标依赖）。
 */
</script>

<template>
  <nav class="flex w-14 shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-l border-border bg-background py-2">
    <button
      type="button"
      class="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-[color:#e60023] transition-colors"
      :class="engineState.engine === 'pinterest' ? 'bg-primary/15 ring-1 ring-primary' : 'hover:bg-muted'"
      :title="`Pinterest · ${t('site.apiMode')}`"
      @click="setEngine('pinterest')"
    >
      P
    </button>

    <div class="my-1 h-px w-8 bg-border" />

    <button
      v-for="site in SITES"
      :key="site.id"
      type="button"
      class="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors"
      :class="engineState.engine === site.id
        ? 'bg-primary/15 text-primary ring-1 ring-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
      :title="`${site.name} · ${t('site.webMode')}`"
      @click="setEngine(site.id)"
    >
      {{ site.badge }}
    </button>
  </nav>
</template>
