<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4">
    <h1 class="text-6xl font-bold text-muted-foreground">404</h1>
    <p class="text-lg text-muted-foreground">Page not found</p>
    <Button @click="router.push('/')">Go Home</Button>
  </div>
</template>
