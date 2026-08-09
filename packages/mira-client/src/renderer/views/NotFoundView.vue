<template>
  <div class="flex items-center justify-center min-h-screen p-8 bg-[#f8f9fa]">
    <div class="text-center max-w-[500px]">
      <div class="text-[4rem] text-[#dc3545] mb-4">
        <span class="material-icons">warning</span>
      </div>

      <h1 class="text-[2rem] text-[#333] mb-4">{{ $t('views.notFoundView.title') }}</h1>
      <p class="text-[1.1rem] text-[#666] mb-8">{{ $t('views.notFoundView.desc') }}</p>

      <div class="flex gap-4 justify-center mb-8 max-sm:flex-col max-sm:items-center">
        <Button
          @click="$router.push('/')"
        >
          <span class="material-icons mr-2">home</span>
          {{ $t('views.notFoundView.backHome') }}
        </Button>
        <Button
          variant="secondary"
          @click="$router.go(-1)"
        >
          <span class="material-icons mr-2">arrow_back</span>
          {{ $t('views.notFoundView.backPrevious') }}
        </Button>
      </div>

      <div class="text-left bg-white p-6 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.1)] max-sm:text-center">
        <h3 class="mt-0 mb-4 text-[#333]">{{ $t('views.notFoundView.suggestions') }}</h3>
        <ul class="m-0 pl-6 max-sm:text-left">
          <li class="mb-2 text-[#666]">{{ $t('views.notFoundView.checkUrl') }}</li>
          <li class="mb-2 text-[#666]">{{ $t('views.notFoundView.useNav') }}</li>
          <li class="mb-2 text-[#666]">{{ $t('views.notFoundView.contactAdmin') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>
