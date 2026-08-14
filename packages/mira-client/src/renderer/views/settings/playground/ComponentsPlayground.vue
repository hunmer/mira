<template>
  <!-- ============ 组件库 Tab ============ -->
  <TabsContent value="components" class="space-y-6 mt-4">
    <div class="space-y-1">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.componentsTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.componentsDesc') }}</p>
    </div>

    <!-- NotificationList：折叠堆叠，悬停展开 -->
    <div class="py-4">
      <NotificationList />
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { TabsContent } from '@/components/ui/tabs'
import { NotificationList } from '@/components/ui/notification-list'
</script>
