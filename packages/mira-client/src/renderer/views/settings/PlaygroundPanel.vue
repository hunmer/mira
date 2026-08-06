<template>
  <div class="p-4 space-y-6">
    <div>
      <h3 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">
        Playground
      </h3>
      <p class="text-muted-foreground text-sm">各类功能的演示与调试入口，不影响正式设置。</p>
    </div>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="notification" class="flex items-center gap-2">
          <span class="material-icons text-base">notifications</span>
          通知
        </TabsTrigger>
        <TabsTrigger value="form" class="flex items-center gap-2">
          <span class="material-icons text-base">description</span>
          声明式表单
        </TabsTrigger>
      </TabsList>

      <!-- ============ 通知 Tab ============ -->
      <TabsContent value="notification" class="space-y-6 mt-4">
        <template v-if="isElectron">
          <!-- 通知类型 -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">通知类型</p>
            <p class="text-xs text-muted-foreground">不同类型对应不同左侧色条与图标，点击触发右下角通知。</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                v-for="t in typeDemos"
                :key="t.type"
                variant="outline"
                size="sm"
                @click="showByType(t.type)"
              >
                <span class="material-icons text-base" :style="{ color: t.color }">{{ t.icon }}</span>
                {{ t.label }}
              </Button>
            </div>
          </div>

          <!-- 屏幕位置 -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">屏幕位置</p>
            <p class="text-xs text-muted-foreground">通知可出现在屏幕的不同位置（默认右下角）。</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                v-for="p in positionDemos"
                :key="p.value"
                variant="outline"
                size="sm"
                @click="showByPosition(p.value)"
              >
                {{ p.label }}
              </Button>
            </div>
          </div>

          <!-- 自定义内容（结构化 + HTML）-->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">自定义内容</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" @click="showStructured">
                <span class="material-icons text-base">subject</span>
                结构化字段（带操作按钮）
              </Button>
              <Button variant="secondary" size="sm" @click="showHtml">
                <span class="material-icons text-base">code</span>
                自定义 HTML 内容
              </Button>
            </div>
          </div>

          <!-- 出现动画 -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">出现动画</p>
            <p class="text-xs text-muted-foreground">slide 会根据所在屏幕位置自动从对应方向滑入（右下角从右、左下角从左）。</p>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                v-for="a in animationDemos"
                :key="a.value"
                variant="outline"
                size="sm"
                @click="showByAnimation(a.value)"
              >
                {{ a.label }}
              </Button>
            </div>
          </div>

          <!-- 时长控制 -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">显示时长</p>
            <div class="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" @click="showWithDuration(0)">常驻（0 = 不自动关闭）</Button>
              <Button variant="outline" size="sm" @click="showWithDuration(1500)">1.5 秒</Button>
              <Button variant="outline" size="sm" @click="showWithDuration(5000)">5 秒（默认）</Button>
              <Button variant="outline" size="sm" @click="dismissCurrent">
                <span class="material-icons text-base">close</span>
                关闭当前通知
              </Button>
            </div>
          </div>

          <!-- 自定义输入 -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">自定义参数</p>
            <div class="rounded-lg border border-border p-3 space-y-3 bg-background/40">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="block">
                  <span class="text-xs text-muted-foreground">标题</span>
                  <input
                    v-model="custom.title"
                    class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                    placeholder="通知标题"
                  />
                </label>
                <label class="block">
                  <span class="text-xs text-muted-foreground">类型</span>
                  <select
                    v-model="custom.type"
                    class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="info">info</option>
                    <option value="success">success</option>
                    <option value="warning">warning</option>
                    <option value="error">error</option>
                  </select>
                </label>
              </div>
              <label class="block">
                <span class="text-xs text-muted-foreground">出现动画</span>
                <select
                  v-model="custom.animation"
                  class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                >
                  <option value="slide">slide（按位置滑入）</option>
                  <option value="fade">fade（淡入）</option>
                  <option value="zoom">zoom（缩放）</option>
                  <option value="bounce">bounce（弹跳）</option>
                  <option value="none">none（无）</option>
                </select>
              </label>
              <label class="block">
                <span class="text-xs text-muted-foreground">正文</span>
                <textarea
                  v-model="custom.body"
                  rows="2"
                  class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary resize-none"
                  placeholder="通知正文内容"
                ></textarea>
              </label>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 text-sm">
                  <span class="text-xs text-muted-foreground">时长(ms)</span>
                  <input
                    v-model.number="custom.duration"
                    type="number"
                    min="0"
                    step="500"
                    class="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <Button size="sm" @click="showCustom" :disabled="!custom.title.trim()">
                  <span class="material-icons text-base">send</span>
                  发送通知
                </Button>
              </div>
            </div>
          </div>
        </template>

        <!-- 非 Electron 环境降级提示 -->
        <div v-else class="rounded-lg border border-dashed border-border p-8 text-center">
          <span class="material-icons text-4xl text-muted-foreground mb-2 block">desktop_access_disabled</span>
          <p class="text-sm text-muted-foreground">
            通知窗口依赖 Electron 环境，当前在浏览器中运行，无法演示。
            <br />请在桌面端打开此页面。
          </p>
        </div>
      </TabsContent>

      <!-- ============ 声明式表单 Tab ============ -->
      <TabsContent value="form" class="space-y-4 mt-4">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">声明式表单（VeeValidate + Zod）</p>
          <p class="text-xs text-muted-foreground">
            传入一个 zod schema + 字段元数据数组，组件自动渲染、校验并提交。无需手写 errors / validateForm。
          </p>
        </div>

        <Card class="bg-background/40">
          <CardContent class="pt-6">
            <SchemaForm
              :schema="formSchema"
              :fields="formFields"
              :initial-values="formInitialValues"
              title="服务器配置示例"
              form-description="所有字段均由下方 schema 驱动校验。"
              submit-text="提交"
              :submitting="formSubmitting"
              @submit="onFormSubmit"
              @cancel="onFormCancel"
              @invalid="onFormInvalid"
            />
          </CardContent>
        </Card>

        <!-- 提交结果预览 -->
        <div v-if="formResult" class="space-y-2">
          <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">提交结果（已通过校验）</p>
          <pre class="rounded-lg border border-border bg-muted/40 p-3 text-xs overflow-auto max-h-60">{{ formResult }}</pre>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SchemaForm, type SchemaField } from '@/renderer/components/business/SchemaForm'
import type { NotificationPayload, FloatingWindowPosition, NotificationAnimation } from '@/shared/types'

const activeTab = ref('notification')

// 是否处于 Electron 环境（通知窗口仅桌面端可用）
const isElectron = computed(() => !!window.electronAPI?.notificationWindow)

// 通知类型演示数据
const typeDemos = [
  { type: 'info', label: 'Info', icon: 'info', color: '#3b82f6' },
  { type: 'success', label: 'Success', icon: 'check_circle', color: '#10b981' },
  { type: 'warning', label: 'Warning', icon: 'warning', color: '#f59e0b' },
  { type: 'error', label: 'Error', icon: 'error', color: '#ef4444' },
] as const

// 屏幕位置演示数据
const positionDemos = [
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
  { value: 'top', label: '顶部居中' },
  { value: 'bottom', label: '底部居中' },
  { value: 'center', label: '屏幕居中' },
] as const

// 出现动画演示数据
const animationDemos = [
  { value: 'slide', label: 'Slide（默认，按位置滑入）' },
  { value: 'fade', label: 'Fade（淡入）' },
  { value: 'zoom', label: 'Zoom（缩放）' },
  { value: 'bounce', label: 'Bounce（弹跳）' },
  { value: 'none', label: 'None（无动画）' },
] as const

// 自定义参数表单
const custom = ref<NotificationPayload>({
  title: '自定义通知',
  body: '这是通过 Playground 自定义参数发送的通知。',
  type: 'info',
  duration: 5000,
  animation: 'slide',
})

/**
 * 发送通知的统一封装（带错误处理）
 */
async function notify(payload: NotificationPayload) {
  try {
    await window.electronAPI?.notificationWindow?.show(payload)
  } catch (err) {
    console.error('[Playground] 通知发送失败:', err)
  }
}

// ============ 演示动作 ============

function showByType(type: NotificationPayload['type']) {
  const map: Record<string, NotificationPayload> = {
    info: { title: '提示通知', body: '这是一条普通的提示信息。', type: 'info' },
    success: { title: '操作成功', body: '文件已成功导入到媒体库。', type: 'success' },
    warning: { title: '注意', body: '存储空间不足，建议清理临时文件。', type: 'warning' },
    error: { title: '发生错误', body: '无法连接到服务器，请检查网络。', type: 'error' },
  }
  notify(map[type || 'info'])
}

function showByPosition(position: FloatingWindowPosition) {
  notify({
    title: '位置演示',
    body: `这条通知出现在：${position}`,
    type: 'info',
    position,
    duration: 3000,
  })
}

function showByAnimation(animation: NotificationAnimation) {
  notify({
    title: '动画演示',
    body: `出现动画：${animation}`,
    type: 'info',
    animation,
    duration: 4000,
  })
}

function showStructured() {
  notify({
    title: '导入完成',
    body: '已成功导入 128 个文件，其中 3 个存在重复。',
    type: 'success',
    actions: [
      { id: 'view', label: '查看' },
      { id: 'dismiss', label: '忽略' },
    ],
    duration: 0, // 常驻，等待用户操作
  })
}

function showHtml() {
  notify({
    title: '自定义内容',
    type: 'info',
    html: '<div style="display:flex;flex-direction:column;gap:6px;">' +
      '<p style="margin:0;">这是一段 <b>自定义 HTML</b> 内容：</p>' +
      '<ul style="margin:0;padding-left:18px;color:#9ca3af;font-size:12px;">' +
      '<li>支持 <code style="background:rgba(255,255,255,.1);padding:1px 4px;border-radius:3px;">行内代码</code></li>' +
      '<li>支持 <span style="color:#10b981;">彩色</span> <span style="color:#f59e0b;">文字</span></li>' +
      '<li>支持 <a href="#" style="color:#3b82f6;">链接样式</a></li>' +
      '</ul></div>',
    duration: 6000,
  })
}

function showWithDuration(duration: number) {
  notify({
    title: duration === 0 ? '常驻通知' : `${duration}ms 后消失`,
    body: duration === 0 ? '此通知不会自动关闭，需手动点击关闭。' : `这条通知将在 ${duration} 毫秒后自动消失。`,
    type: 'info',
    duration,
  })
}

function dismissCurrent() {
  try {
    window.electronAPI?.notificationWindow?.dismiss()
  } catch (err) {
    console.error('[Playground] 关闭通知失败:', err)
  }
}

function showCustom() {
  notify({
    title: custom.value.title,
    body: custom.value.body,
    type: custom.value.type,
    duration: custom.value.duration,
    animation: custom.value.animation,
  })
}

// ============ 声明式表单 Demo ============

// zod schema：数据类型 + 校验规则的单一真源
const formSchema = z.object({
  name: z.string().min(2, '名称至少 2 个字符').max(50, '名称不能超过 50 个字符'),
  type: z.enum(['admin', 'user', 'guest'], { message: '请选择类型' }),
  level: z.number().min(0).max(100),
  enabled: z.boolean(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(200, '描述不能超过 200 个字符').optional(),
  birthday: z.date().optional(),
})

// 字段元数据：驱动渲染
const formFields: SchemaField[] = [
  { name: 'name', label: '名称', type: 'text', required: true, placeholder: '请输入名称' },
  { name: 'type', label: '类型', type: 'select', required: true, placeholder: '请选择类型',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '用户', value: 'user' },
      { label: '访客', value: 'guest' },
    ],
  },
  { name: 'level', label: '等级', type: 'slider', min: 0, max: 100, step: 1 },
  { name: 'enabled', label: '启用', type: 'switch', description: '关闭后该条目将不可用' },
  { name: 'tags', label: '标签', type: 'checkbox-group',
    options: [
      { label: '内部', value: 'internal' },
      { label: '公开', value: 'public' },
      { label: '归档', value: 'archived' },
    ],
  },
  { name: 'birthday', label: '生日', type: 'date' },
  { name: 'description', label: '描述', type: 'textarea', colSpan: 2, placeholder: '可选描述' },
]

const formInitialValues = {
  name: '',
  type: undefined,
  level: 30,
  enabled: true,
  tags: [],
  description: '',
}

const formSubmitting = ref(false)
const formResult = ref<string>('')

type FormValues = z.infer<typeof formSchema>

function onFormSubmit(values: Record<string, unknown>) {
  const data = values as FormValues
  formSubmitting.value = true
  // 模拟异步提交
  setTimeout(() => {
    formResult.value = JSON.stringify(data, null, 2)
    formSubmitting.value = false
    toast.success('表单提交成功', { description: '数据已通过 zod 校验' })
  }, 600)
}

function onFormCancel() {
  formResult.value = ''
  toast('已取消')
}

function onFormInvalid(errors: Record<string, string>) {
  const first = Object.values(errors)[0]
  toast.error('校验未通过', { description: first || '请检查表单字段' })
}
</script>
