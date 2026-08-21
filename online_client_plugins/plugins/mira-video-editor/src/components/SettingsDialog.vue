<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[560px]">
      <DialogHeader>
        <DialogTitle>视频剪辑器设置</DialogTitle>
        <DialogDescription>
          配置外部工具路径与默认导出参数；工具也可通过环境变量（FFMPEG_PATH / FFPROBE_PATH / SCENEDETECT_PATH）提供
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- 外部工具 -->
        <div v-for="tool in TOOLS" :key="tool.name" class="grid gap-1.5">
          <div class="flex items-center justify-between">
            <Label>{{ tool.label }}</Label>
            <span class="text-xs" :class="statusClass(tool.status)">
              {{ statusText(tool.status, tool.version) }}
            </span>
          </div>
          <div class="flex gap-2">
            <Input :model-value="tool.configured || tool.resolved" readonly class="flex-1" :placeholder="tool.placeholder" />
            <Button variant="outline" size="sm" :disabled="checking" @click="pickFile(tool.name)">选择</Button>
            <Button variant="ghost" size="sm" :disabled="checking" @click="checkTool(tool.name)">检测</Button>
          </div>
        </div>

        <!-- 默认导出参数 -->
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1.5">
            <Label>默认导出格式</Label>
            <Select v-model="settings.defaultOutputFormat">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="fmt in FORMATS" :key="fmt" :value="fmt">{{ fmt.toUpperCase() }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-1.5">
            <Label>默认导出质量</Label>
            <Select v-model="settings.defaultQuality">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="original">原质量</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1.5">
            <Label>分割灵敏度</Label>
            <Select v-model="settings.splitSensitivity">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="high">高</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-1.5">
            <Label>最短场景时长（秒）</Label>
            <Input
              :model-value="String(settings.minSceneDuration)"
              type="number"
              min="0"
              step="0.5"
              @update:model-value="(v) => (settings.minSceneDuration = Number(v) || 0)"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'mira-plugin-ui/src/components/ui/dialog'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Input } from 'mira-plugin-ui/src/components/ui/input'
import { Label } from 'mira-plugin-ui/src/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'mira-plugin-ui/src/components/ui/select'
import { toast } from '@/lib/toast'
import { getHost, isHostAvailable } from '@/lib/host'
import { loadSettings, saveSettings } from '@/lib/settings'
import { checkCommand, setBinaryPath, type CommandName } from '@/lib/exec'

const open = defineModel<boolean>('open', { default: false })

const FORMATS = ['mp4', 'webm', 'avi', 'mov'] as const

const TOOLS = [
  { name: 'ffmpeg' as CommandName, label: 'FFmpeg', placeholder: '系统 PATH 或点击选择 ffmpeg 可执行文件' },
  { name: 'ffprobe' as CommandName, label: 'FFprobe', placeholder: '系统 PATH 或点击选择 ffprobe 可执行文件' },
  { name: 'scenedetect' as CommandName, label: 'PySceneDetect', placeholder: '需自行安装（pip install scenedetect[opencv]）' },
]

interface ToolState {
  configured: string | null
  resolved: string
  status: 'unknown' | 'checking' | 'ok' | 'fail'
  version: string | null
}

const toolStates = reactive<Record<string, ToolState>>({})
for (const tool of TOOLS) {
  toolStates[tool.name] = { configured: null, resolved: '', status: 'unknown', version: null }
}
const checking = ref(false)

const settings = reactive(loadSettings())

watch(
  () => ({ ...settings }),
  (value) => saveSettings(value),
  { deep: true },
)

watch(open, (isOpen) => {
  if (isOpen) refreshToolPaths()
})

async function refreshToolPaths() {
  if (!isHostAvailable()) return
  try {
    const paths = await (await import('@/lib/settings')).listBinaryPaths()
    for (const tool of TOOLS) {
      const info = paths[tool.name]
      if (info) {
        toolStates[tool.name].configured = info.configured
        toolStates[tool.name].resolved = info.resolved
      }
    }
  } catch (error) {
    console.warn('读取工具路径失败:', error)
  }
}

async function checkTool(name: CommandName) {
  const state = toolStates[name]
  state.status = 'checking'
  checking.value = true
  try {
    const result = await checkCommand(name)
    state.status = result.available ? 'ok' : 'fail'
    state.version = result.version
    if (result.available) toast.success(`${name} 可用: ${result.version || result.command}`, '检测通过')
    else toast.error(`${name} 不可用，请在设置中配置路径或安装后重试`, '检测失败')
  } catch (error) {
    state.status = 'fail'
    toast.error(`检测失败: ${(error as Error).message}`, '错误')
  } finally {
    checking.value = false
  }
}

/** 触发对应工具的文件选择（隐藏 input） */
function pickFile(name: CommandName) {
  const host = getHost()
  if (!host) {
    toast.error('宿主环境不可用', '错误')
    return
  }
  // 动态创建 input 以避免多个隐藏 input 的 ref 管理
  const input = document.createElement('input')
  input.type = 'file'
  // 可执行文件通常无扩展名（Windows 下为 .exe），不设 accept 过滤
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const filePath = host.fs.getPathForFile(file)
    if (!filePath) {
      toast.error('无法获取所选文件路径', '错误')
      return
    }
    setBinaryPath(name, filePath)
      .then(() => {
        toolStates[name].configured = filePath
        toolStates[name].resolved = filePath
        toast.success(`${name} 路径已设置`, '成功')
        checkTool(name)
      })
      .catch((error) => {
        toast.error(`设置失败: ${(error as Error).message}`, '错误')
      })
  }
  input.click()
}

function statusText(status: ToolState['status'], version: string | null): string {
  if (status === 'ok') return `可用${version ? ` · ${version.slice(0, 40)}` : ''}`
  if (status === 'fail') return '不可用'
  if (status === 'checking') return '检测中...'
  return '未检测'
}

const statusClass = (status: ToolState['status']) =>
  computed(() =>
    status === 'ok' ? 'text-green-600 dark:text-green-400' : status === 'fail' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
  ).value
</script>
