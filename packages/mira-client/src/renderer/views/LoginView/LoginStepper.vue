<script setup lang="ts">
/**
 * 顶部三步进度条（服务器 / 认证 / 素材库）
 */
import { Stepper, StepperItem, StepperTrigger, StepperIndicator } from '@/components/ui/stepper'
import type { HealthResponse } from 'mira-app-core/shared/sdk'

defineOptions({ name: 'LoginStepper' })

defineProps<{
  currentStep: number
  healthData: HealthResponse | null
}>()
</script>

<template>
  <Stepper :model-value="currentStep" class="flex items-center justify-center gap-0 mb-6">
    <StepperItem :step="1" :completed="currentStep > 1">
      <StepperTrigger>
        <StepperIndicator>1</StepperIndicator>
      </StepperTrigger>
      <div class="text-xs text-muted-foreground dark:text-muted-foreground mt-1 text-center">{{ $t('views.loginStepper.server') }}</div>
    </StepperItem>
    <div class="flex-1 h-0.5 bg-accent dark:bg-muted mx-2 self-center -mt-4" />
    <StepperItem :step="2" :completed="currentStep > 2" :disabled="!healthData || healthData.authRequired === false">
      <StepperTrigger>
        <StepperIndicator>2</StepperIndicator>
      </StepperTrigger>
      <div class="text-xs text-muted-foreground dark:text-muted-foreground mt-1 text-center">{{ $t('views.loginStepper.auth') }}</div>
    </StepperItem>
    <div class="flex-1 h-0.5 bg-accent dark:bg-muted mx-2 self-center -mt-4" />
    <StepperItem :step="3" :disabled="currentStep < 3">
      <StepperTrigger>
        <StepperIndicator>3</StepperIndicator>
      </StepperTrigger>
      <div class="text-xs text-muted-foreground dark:text-muted-foreground mt-1 text-center">{{ $t('views.loginStepper.library') }}</div>
    </StepperItem>
  </Stepper>
</template>
