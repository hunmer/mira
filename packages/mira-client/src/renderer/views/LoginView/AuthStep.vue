<script setup lang="ts">
/**
 * 步骤 2：认证（登录 / 注册 Tab）
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'
import type { HealthResponse } from 'mira-app-core/shared/sdk'

defineOptions({ name: 'AuthStep' })

defineProps<{
  loading: boolean
  healthData: HealthResponse | null
  credentials: { username: string; password: string }
  registerForm: { email: string; confirmPassword: string }
}>()

// 密码可见性开关通过 v-model 与父级双向绑定
const showPassword = defineModel<boolean>('showPassword', { required: true })
const showConfirmPassword = defineModel<boolean>('showConfirmPassword', { required: true })

const emit = defineEmits<{
  login: []
  register: []
  back: []
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <Tabs default-value="login" class="justify-center">
      <TabsList>
        <TabsTrigger value="login">登录</TabsTrigger>
        <TabsTrigger v-if="healthData?.allowRegistration !== false" value="register">注册</TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <form @submit.prevent="emit('login')" class="space-y-4">
          <div class="flex flex-col gap-1">
            <Label>用户名</Label>
            <Input v-model="credentials.username" type="text" placeholder="用户名" required />
          </div>
          <div class="flex flex-col gap-1">
            <Label>密码</Label>
            <div class="relative">
              <Input v-model="credentials.password" :type="showPassword ? 'text' : 'password'" placeholder="密码" required class="pr-9" />
              <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showPassword = !showPassword">
                <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </Button>
            </div>
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            <Loader2 v-if="loading" class="animate-spin" />
            {{ loading ? '登录中...' : '下一步' }}
          </Button>
          <Button type="button" variant="ghost" class="w-full" @click="emit('back')" :disabled="loading">
            上一步
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="register">
        <form @submit.prevent="emit('register')" class="space-y-4">
          <div class="flex flex-col gap-1">
            <Label>用户名</Label>
            <Input v-model="credentials.username" type="text" placeholder="用户名" required />
          </div>
          <div class="flex flex-col gap-1">
            <Label>邮箱（选填）</Label>
            <Input v-model="registerForm.email" type="email" placeholder="邮箱" />
          </div>
          <div class="flex flex-col gap-1">
            <Label>密码</Label>
            <div class="relative">
              <Input v-model="credentials.password" :type="showPassword ? 'text' : 'password'" placeholder="至少6位，含字母和数字" required class="pr-9" />
              <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showPassword = !showPassword">
                <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <Label>确认密码</Label>
            <div class="relative">
              <Input v-model="registerForm.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="确认密码" required class="pr-9" />
              <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showConfirmPassword = !showConfirmPassword">
                <span class="material-icons text-sm">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
              </Button>
            </div>
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            <Loader2 v-if="loading" class="animate-spin" />
            {{ loading ? '注册中...' : '注册' }}
          </Button>
          <Button type="button" variant="ghost" class="w-full" @click="emit('back')" :disabled="loading">
            上一步
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  </div>
</template>
