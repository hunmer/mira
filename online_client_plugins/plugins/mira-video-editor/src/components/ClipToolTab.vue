<template>
  <div v-if="selectedVideo" class="clip-form-container">
    <div class="form-content">
      <div class="time-inputs-row">
        <div class="time-input-group">
          <label class="form-label">起点时间 (秒)</label>
          <div class="input-group">
            <Input
              :model-value="clipStartTime"
              @update:model-value="$emit('update:clipStartTime', $event)"
              type="number"
              :min="0"
              step="0.1"
              placeholder="0.0"
              @input="$emit('validateClipTime')"
            />
            <Button @click="$emit('setClipStartToZero')" variant="outline" size="sm">
              <TrackPreviousIcon style="width: 12px; height: 12px" /> 开始
            </Button>
            <Button @click="$emit('setClipStartToCurrent')" variant="outline" size="sm" :title="`设置为当前播放时间 ${formatTime(currentPlayTime)}`">
              <ClockIcon style="width: 12px; height: 12px" /> 当前
            </Button>
          </div>
        </div>

        <div class="time-input-group">
          <label class="form-label">终点时间 (秒)</label>
          <div class="input-group">
            <Input
              :model-value="clipEndTime"
              @update:model-value="$emit('update:clipEndTime', $event)"
              type="number"
              :min="0"
              step="0.1"
              placeholder="0.0"
              @input="$emit('validateClipTime')"
            />
            <Button @click="$emit('setClipEndToMax')" variant="outline" size="sm">
              <TrackNextIcon style="width: 12px; height: 12px" /> 结束
            </Button>
            <Button @click="$emit('setClipEndToCurrent')" variant="outline" size="sm" :title="`设置为当前播放时间 ${formatTime(currentPlayTime)}`">
              <ClockIcon style="width: 12px; height: 12px" /> 当前
            </Button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">描述 (可选)</label>
        <Input
          ref="descriptionInputRef"
          :model-value="clipDescription"
          @update:model-value="$emit('update:clipDescription', $event)"
          type="text"
          placeholder="输入片段描述"
        />
      </div>

      <div class="form-group">
        <label class="form-label">标签 (可选，逗号分隔)</label>
        <Input
          :model-value="clipTags"
          @update:model-value="$emit('update:clipTags', $event)"
          type="text"
          placeholder="例如: 精彩,重点"
        />
      </div>

      <div class="form-actions">
        <Button
          @click="$emit('createClip')"
          :disabled="!isValidClipTime"
          variant="default"
          class="w-full"
        >
          <PlusIcon style="width: 14px; height: 14px" /> 创建片段
        </Button>
      </div>
    </div>
  </div>
  <div v-else class="empty-state">
    请先选择一个视频
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Input } from 'mira-plugin-ui/src/components/ui/input'
import { TrackPreviousIcon, ClockIcon, TrackNextIcon, PlusIcon } from '@radix-icons/vue'
import { formatTime } from '../utils/formatters'

defineProps<{
  selectedVideo: any
  clipStartTime: number
  clipEndTime: number
  clipDescription: string
  clipTags: string
  currentPlayTime: number
  isValidClipTime: boolean
}>()

defineEmits<{
  'update:clipStartTime': [value: number]
  'update:clipEndTime': [value: number]
  'update:clipDescription': [value: string]
  'update:clipTags': [value: string]
  createClip: []
  setClipStartToZero: []
  setClipStartToCurrent: []
  setClipEndToMax: []
  setClipEndToCurrent: []
  validateClipTime: []
}>()

const descriptionInputRef = ref<InstanceType<typeof Input>>()

defineExpose({
  focusDescriptionInput: () => {
    const inputEl = descriptionInputRef.value?.$el as HTMLInputElement | undefined
    inputEl?.focus()
  }
})
</script>

<style scoped>
.clip-form-container {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-inputs-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-group :deep(input) {
  width: auto !important;
  flex: 1;
  min-width: 0;
}

.form-actions {
  margin-top: 8px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
}
</style>
