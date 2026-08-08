<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[760px] grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle>设置封面</DialogTitle>
        <DialogDescription>{{ item?.name }}</DialogDescription>
      </DialogHeader>

      <div class="min-h-0 overflow-hidden rounded-md border bg-muted/30">
        <VueCropper
          v-if="imageUrl"
          ref="cropperRef"
          :img="imageUrl"
          :wrapper="{ width: '100%', height: 480 }"
          :crop-layout="{ width: '80%', height: '80%' }"
          :center-box="true"
          output-type="png"
          :max-side-length="1024"
        />
        <button
          v-else
          type="button"
          class="flex h-[420px] w-full flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-muted/50"
          @click="chooseImage"
        >
          <ImagePlus class="size-10" />
          <span>选择图片</span>
        </button>
      </div>

      <DialogFooter class="sm:justify-between">
        <div class="flex gap-1">
          <Button v-if="imageUrl" variant="outline" size="sm" @click="chooseImage">更换图片</Button>
          <Button v-if="imageUrl" variant="ghost" size="icon-sm" title="向左旋转" @click="cropperRef?.rotateLeft()"><RotateCcw /></Button>
          <Button v-if="imageUrl" variant="ghost" size="icon-sm" title="向右旋转" @click="cropperRef?.rotateRight()"><RotateCw /></Button>
          <Button v-if="imageUrl" variant="ghost" size="icon-sm" title="缩小" @click="cropperRef?.zoomOut()"><ZoomOut /></Button>
          <Button v-if="imageUrl" variant="ghost" size="icon-sm" title="放大" @click="cropperRef?.zoomIn()"><ZoomIn /></Button>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="uploading" @click="emit('update:open', false)">取消</Button>
          <Button :disabled="!imageUrl || uploading" @click="saveCover">
            {{ uploading ? '上传中...' : '保存封面' }}
          </Button>
        </div>
      </DialogFooter>

      <input ref="fileInput" class="hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange">
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { ImagePlus, RotateCcw, RotateCw, ZoomIn, ZoomOut } from '@lucide/vue'
import { VueCropper } from 'cropper-next-vue'
import 'cropper-next-vue/style.css'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { FileInfo } from '../../../shared/types'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'

const props = defineProps<{ open: boolean; item: FileInfo | null }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()
const cropperRef = ref<InstanceType<typeof VueCropper>>()
const fileInput = ref<HTMLInputElement>()
const imageUrl = ref('')
const uploading = ref(false)
const libraryStore = useLibraryStore()

const releaseImage = () => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

watch(() => props.open, open => {
  if (!open) releaseImage()
})
onBeforeUnmount(releaseImage)

const chooseImage = () => fileInput.value?.click()

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  releaseImage()
  imageUrl.value = URL.createObjectURL(file)
}

const saveCover = async () => {
  if (!props.item || !cropperRef.value) return
  const libraryId = props.item.libraryId || libraryStore.currentLibrary?.id
  if (!libraryId) {
    toast.error('无法确定素材库')
    return
  }

  uploading.value = true
  try {
    const blob = await cropperRef.value.getCropBlob()
    await miraSDKService.setFileCover(libraryId, props.item.id, blob)
    toast.success('封面已更新')
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to set media cover:', error)
    toast.error('设置封面失败')
  } finally {
    uploading.value = false
  }
}
</script>
