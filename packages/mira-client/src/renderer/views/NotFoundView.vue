<template>
  <div class="flex items-center justify-center min-h-screen p-8 bg-[#f8f9fa]">
    <div class="text-center max-w-[500px]">
      <div class="text-[4rem] text-[#dc3545] mb-4">
        <span class="material-icons">warning</span>
      </div>

      <h1 class="text-[2rem] text-[#333] mb-4">页面未找到</h1>
      <p class="text-[1.1rem] text-[#666] mb-8">抱歉，您访问的页面不存在或已被移动。</p>

      <div class="flex gap-4 justify-center mb-8 max-sm:flex-col max-sm:items-center">
        <Button
          @click="$router.push('/')"
        >
          <span class="material-icons mr-2">home</span>
          返回主页
        </Button>
        <Button
          variant="secondary"
          @click="$router.go(-1)"
        >
          <span class="material-icons mr-2">arrow_back</span>
          返回上一页
        </Button>
      </div>

      <div class="text-left bg-white p-6 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.1)] max-sm:text-center">
        <h3 class="mt-0 mb-4 text-[#333]">您可以尝试：</h3>
        <ul class="m-0 pl-6 max-sm:text-left">
          <li class="mb-2 text-[#666]">检查 URL 是否正确</li>
          <li class="mb-2 text-[#666]">使用导航菜单浏览其他页面</li>
          <li class="mb-2 text-[#666]">联系管理员获取帮助</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>
