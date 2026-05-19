<template>
  <div class="p-4 space-y-6">
    <div>
      <h3 class="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">用户信息</h3>
      <div class="space-y-4">
        <div class="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
          <Avatar
            class="h-10 w-10"
            style="background-color: #dee9fc; color: #1D4ED8"
          >
            <AvatarFallback>
              <span class="material-icons">person</span>
            </AvatarFallback>
          </Avatar>
          <div class="flex-1">
            <h4 class="font-semibold text-slate-900">当前用户</h4>
            <p class="text-slate-600">admin@example.com</p>
          </div>
          <Button variant="secondary" size="sm">编辑</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
</script>
