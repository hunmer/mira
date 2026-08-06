<script setup lang="ts">
/**
 * 手动部署指南（ManualDeployGuide）
 *
 * 展示 mira-app-server 的安装、启动、配置、校验步骤。
 * 内容源自 packages/mira-app-server/README.md，供 LoginView 的部署对话框使用。
 */
import { ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'

interface Step {
  title: string
  desc: string
  command?: string
}

const steps: Step[] = [
  {
    title: '1. 安装 Node.js',
    desc: '需要 Node.js >= 18。安装后运行 node -v 与 npm -v 验证。',
    command: 'node -v && npm -v',
  },
  {
    title: '2. 安装 mira-app-server',
    desc: '推荐全局安装，安装后可在任意目录使用 mira-app-server 命令。',
    command: 'npm install -g mira-app-server',
  },
  {
    title: '3. 启动服务器',
    desc: '使用默认配置启动（HTTP 端口 8081 / WebSocket 端口 8018）。',
    command: 'mira-app-server start',
  },
  {
    title: '4. 自定义端口 / 数据目录',
    desc: '可选：通过参数自定义 HTTP、WebSocket 端口与数据目录。',
    command: 'mira-app-server start --http-port 8081 --ws-port 8018 --data-path ./data',
  },
  {
    title: '5. 校验健康状态',
    desc: '服务启动后，访问健康检查接口应返回 success: true。',
    command: 'curl http://localhost:8081/api/system/health',
  },
]

// Dashboard（Web 管理面板）安装步骤，源自 mira-dashboard-next/README.md
const dashboardSteps: Step[] = [
  {
    title: '1. 进入 dashboard 目录并安装依赖',
    desc: '使用 pnpm 安装依赖（Vue 3 + shadcn-vue + Tailwind CSS 4）。',
    command: 'pnpm install',
  },
  {
    title: '2. 启动开发服务器',
    desc: '默认 5173 端口，开发模式下 /api/* 自动代理到 mira-app-server（127.0.0.1:8081）。',
    command: 'pnpm dev',
  },
  {
    title: '3. 构建生产产物',
    desc: '可选：构建后用 preview 预览生产版本。',
    command: 'pnpm build && pnpm preview',
  },
]

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

const options = [
  { flag: '--http-port <port>', desc: 'HTTP 服务器端口（默认 8081）' },
  { flag: '--ws-port <port>', desc: 'WebSocket 服务器端口（默认 8018）' },
  { flag: '--data-path <path>', desc: '数据目录路径（默认 ./data）' },
  { flag: '--help', desc: '显示帮助信息' },
]
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
            title="复制"
            @click="copyCommand(step.command, 'srv-' + idx)"
          >
            <Check v-if="copied === 'srv-' + idx" class="w-3.5 h-3.5 text-emerald-500" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </li>
    </ol>

    <div class="rounded-lg border border-border dark:border-border bg-muted/40 dark:bg-muted/30 p-3">
      <p class="text-xs font-semibold text-foreground mb-2">可用选项</p>
      <ul class="flex flex-col gap-1.5">
        <li v-for="opt in options" :key="opt.flag" class="flex flex-col gap-0.5">
          <code class="font-mono text-[11px] text-primary">{{ opt.flag }}</code>
          <span class="text-[11px] text-muted-foreground">{{ opt.desc }}</span>
        </li>
      </ul>
    </div>

    <!-- Web 管理面板（Dashboard）安装 -->
    <div class="flex flex-col gap-3 pt-2 border-t border-border dark:border-border">
      <div class="flex items-center gap-2 pt-1">
        <span class="material-icons text-base text-primary">dashboard</span>
        <span class="font-semibold text-sm text-foreground">Web 管理面板（可选）</span>
      </div>
      <ol class="flex flex-col gap-3">
        <li v-for="(step, idx) in dashboardSteps" :key="'dash-' + idx" class="flex flex-col gap-1.5">
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
              title="复制"
              @click="copyCommand(step.command, 'dash-' + idx)"
            >
              <Check v-if="copied === 'dash-' + idx" class="w-3.5 h-3.5 text-emerald-500" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </li>
      </ol>
    </div>

    <p class="text-[11px] text-muted-foreground leading-relaxed">
      提示：启动后回到本页，在服务器列表点击「添加服务器」并填入对应的
      <code class="font-mono">http://&lt;主机IP&gt;:8081</code> 即可连接。
    </p>
  </div>
</template>
