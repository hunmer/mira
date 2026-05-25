<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { setApiBaseURL, getApiBaseURL, getDefaultBaseURL } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const route = useRoute()
const showSetting = computed(() => !route.meta.requiresAuth)

const dialogOpen = ref(false)
const inputUrl = ref('')

function openDialog() {
  inputUrl.value = getApiBaseURL()
  dialogOpen.value = true
}

function saveUrl() {
  setApiBaseURL(inputUrl.value.trim())
  dialogOpen.value = false
}

function resetDefault() {
  inputUrl.value = getDefaultBaseURL()
}
</script>

<template>
  <router-view />
  <Button
    v-if="showSetting"
    variant="outline"
    size="icon-lg"
    class="fixed bottom-4 right-4 z-50 rounded-full opacity-60 hover:opacity-100"
    @click="openDialog"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
  </Button>

  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>API Base URL</DialogTitle>
      </DialogHeader>
      <Input v-model="inputUrl" placeholder="http://localhost:8081" @keydown.enter="saveUrl" />
      <DialogFooter class="flex-row justify-between gap-2">
        <Button variant="outline" @click="resetDefault">Default</Button>
        <Button @click="saveUrl">Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
