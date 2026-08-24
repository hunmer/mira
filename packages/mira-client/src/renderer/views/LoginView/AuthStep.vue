<script setup lang="ts">
/**
 * 步骤 2：认证（登录 / 注册 Tab）
 */
import { computed } from 'vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'
import type { HealthResponse } from 'mira-app-core/shared/sdk'

defineOptions({ name: 'AuthStep' })

const props = defineProps<{
  loading: boolean
  healthData: HealthResponse | null
  credentials: { username: string; password: string }
  registerForm: { email: string; confirmPassword: string }
}>()

// 父组件传入 reactive 对象，这里用 computed 双向代理其字段
const username = computed({
  get: () => props.credentials.username,
  set: v => { props.credentials.username = v },
})
const password = computed({
  get: () => props.credentials.password,
  set: v => { props.credentials.password = v },
})
const email = computed({
  get: () => props.registerForm.email,
  set: v => { props.registerForm.email = v },
})
const confirmPassword = computed({
  get: () => props.registerForm.confirmPassword,
  set: v => { props.registerForm.confirmPassword = v },
})

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
        <TabsTrigger value="login">{{ $t('views.authStep.login') }}</TabsTrigger>
        <TabsTrigger v-if="healthData?.allowRegistration !== false" value="register">{{ $t('views.authStep.register') }}</TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <form @submit.prevent="emit('login')" class="space-y-4">
          <div class="flex flex-col gap-1">
            <Label>{{ $t('views.authStep.username') }}</Label>
            <Input v-model="username" type="text" :placeholder="$t('views.authStep.username')" required />
          </div>
          <div class="flex flex-col gap-1">
            <Label>{{ $t('views.authStep.password') }}</Label>
            <div class="relative">
              <Input v-model="password" :type="showPassword ? 'text' : 'password'" :placeholder="$t('views.authStep.password')" required class="pr-9" />
              <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showPassword = !showPassword">
                <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </Button>
            </div>
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            <Loader2 v-if="loading" class="animate-spin" />
            {{ loading ? $t('views.authStep.loggingIn') : $t('views.authStep.loginNext') }}
          </Button>
          <Button type="button" variant="ghost" class="w-full" @click="emit('back')" :disabled="loading">
            {{ $t('views.authStep.previous') }}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="register">
        <form @submit.prevent="emit('register')" class="space-y-4">
          <div class="flex flex-col gap-1">
            <Label>{{ $t('views.authStep.username') }}</Label>
            <Input v-model="username" type="text" :placeholder="$t('views.authStep.username')" required />
          </div>
          <div class="flex flex-col gap-1">
            <Label>{{ $t('views.authStep.emailOptional') }}</Label>
            <Input v-model="email" type="email" :placeholder="$t('views.authStep.email')" />
          </div>
          <div class="flex flex-col gap-1">
            <Label>{{ $t('views.authStep.password') }}</Label>
            <div class="relative">
              <Input v-model="password" :type="showPassword ? 'text' : 'password'" :placeholder="$t('views.authStep.passwordRule')" required class="pr-9" />
              <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showPassword = !showPassword">
                <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <Label>{{ $t('views.authStep.confirmPassword') }}</Label>
            <div class="relative">
              <Input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" :placeholder="$t('views.authStep.confirmPassword')" required class="pr-9" />
              <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showConfirmPassword = !showConfirmPassword">
                <span class="material-icons text-sm">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
              </Button>
            </div>
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            <Loader2 v-if="loading" class="animate-spin" />
            {{ loading ? $t('views.authStep.registering') : $t('views.authStep.registerSubmit') }}
          </Button>
          <Button type="button" variant="ghost" class="w-full" @click="emit('back')" :disabled="loading">
            {{ $t('views.authStep.previous') }}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  </div>
</template>
