<script setup lang="ts">
/**
 * 手动部署指南（ManualDeployGuide）
 *
 * 展示 mira-app-server 的安装、启动、配置、校验步骤。
 * 内容源自 packages/mira-app-server/README.md，供 LoginView 的部署对话框使用。
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Copy } from 'lucide-vue-next'

interface Step {
  title: string
  desc: string
  command?: string
}

const { t } = useI18n()

const steps = computed<Step[]>(() => [
  {
    title: t('business.manualDeployGuide.step1Title'),
    desc: t('business.manualDeployGuide.step1Desc'),
    command: 'node -v && npm -v',
  },
  {
    title: t('business.manualDeployGuide.step2Title'),
    desc: t('business.manualDeployGuide.step2Desc'),
    command: 'npm install -g mira-app-server',
  },
  {
    title: t('business.manualDeployGuide.step3Title'),
    desc: t('business.manualDeployGuide.step3Desc'),
    command: 'mira-app-server doctor --install',
  },
  {
    title: t('business.manualDeployGuide.step4Title'),
    desc: t('business.manualDeployGuide.step4Desc'),
    command: 'mira-app-server start',
  },
  {
    title: t('business.manualDeployGuide.step5Title'),
    desc: t('business.manualDeployGuide.step5Desc'),
    command: 'mira-app-server start --http-port 8081 --ws-port 8018 --data-path ./data',
  },
  {
    title: t('business.manualDeployGuide.step6Title'),
    desc: t('business.manualDeployGuide.step6Desc'),
    command: 'curl http://localhost:8081/api/system/health',
  },
])

const copied = ref<string | null>(null)
async function copyCommand(cmd: string, key: string) {
  try {
    await navigator.clipboard.writeText(cmd)
    copied.value = key
    setTimeout(() => {
      if (copied.value === key) copied.value = null
    }, 1500)
  } catch {
    /* 剪贴板不可用时静默失败 */
  }
}

const options = computed(() => [
  { flag: '--http-port <port>', desc: t('business.manualDeployGuide.optionHttpPort') },
  { flag: '--ws-port <port>', desc: t('business.manualDeployGuide.optionWsPort') },
  { flag: '--data-path <path>', desc: t('business.manualDeployGuide.optionDataPath') },
  { flag: '--help', desc: t('business.manualDeployGuide.optionHelp') },
])
</script>

<template>
  <div class="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
    <!-- 后端服务器部署步骤 -->
    <ol class="flex flex-col gap-3">
      <li v-for="(step, idx) in steps" :key="'srv-' + idx" class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm text-foreground">{{ step.title }}</span>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">{{ step.desc }}</p>
        <div
          v-if="step.command"
          class="group flex items-center justify-between gap-2 rounded-lg bg-muted dark:bg-muted/60 border border-border dark:border-border px-3 py-2"
        >
          <code class="font-mono text-[11px] text-foreground break-all">{{ step.command }}</code>
          <button
            type="button"
            class="shrink-0 p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border-none bg-transparent cursor-pointer"
            :title="$t('business.manualDeployGuide.copy')"
            @click="copyCommand(step.command, 'srv-' + idx)"
          >
            <Check v-if="copied === 'srv-' + idx" class="w-3.5 h-3.5 text-emerald-500" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </li>
    </ol>

    <div class="rounded-lg border border-border dark:border-border bg-muted/40 dark:bg-muted/30 p-3">
      <p class="text-xs font-semibold text-foreground mb-2">{{ $t('business.manualDeployGuide.optionsTitle') }}</p>
      <ul class="flex flex-col gap-1.5">
        <li v-for="opt in options" :key="opt.flag" class="flex flex-col gap-0.5">
          <code class="font-mono text-[11px] text-primary">{{ opt.flag }}</code>
          <span class="text-[11px] text-muted-foreground">{{ opt.desc }}</span>
        </li>
      </ul>
    </div>

    <p class="text-[11px] text-muted-foreground leading-relaxed">
      {{ $t('business.manualDeployGuide.tip') }}
    </p>
  </div>
</template>
