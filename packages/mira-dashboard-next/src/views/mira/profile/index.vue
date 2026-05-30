<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api'
import { getApiBaseURL } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'vue-sonner'
import { RiLockPasswordLine, RiCameraLine } from '@remixicon/vue'

const { t } = useI18n()
const auth = useAuthStore()

const form = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const loading = ref(false)
const uploadingAvatar = ref(false)

const avatarUrl = computed(() => {
  const userId = (auth.user as any)?.id
  if (!userId) return ''
  return `${getApiBaseURL()}/user/avatar/${userId}?t=${Date.now()}`
})

const avatarInitial = computed(() => {
  return (auth.user?.username || '?')[0].toUpperCase()
})

function triggerFileInput() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) handleAvatarUpload(file)
  }
  input.click()
}

async function handleAvatarUpload(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片大小不能超过 5MB')
    return
  }

  uploadingAvatar.value = true
  try {
    const reader = new FileReader()
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

    await authApi.uploadAvatar(base64)
    // 刷新头像：更新 userInfo 中的 avatar 字段让组件重渲染
    const meRes = await authApi.me()
    auth.user = meRes.data?.data || meRes.data
    localStorage.setItem('user', JSON.stringify(auth.user))
    toast.success(t('common.success'))
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.failed'))
  } finally {
    uploadingAvatar.value = false
  }
}

async function handleChangePassword() {
  if (!form.value.oldPassword || !form.value.newPassword) {
    toast.error(t('profile.fillAll'))
    return
  }
  if (form.value.newPassword.length <= 0) {
    toast.error(t('profile.passwordMin'))
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    toast.error(t('profile.passwordMismatch'))
    return
  }

  loading.value = true
  try {
    await authApi.changePassword({
      oldPassword: form.value.oldPassword,
      newPassword: form.value.newPassword,
    })
    toast.success(t('profile.passwordChanged'))
    form.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.failed'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ t('profile.title') }}</h1>

    <!-- 头像卡片 -->
    <Card class="max-w-lg">
      <CardHeader>
        <CardTitle>头像</CardTitle>
        <CardDescription>点击头像更换，支持 JPG/PNG/WebP，最大 5MB</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <div class="group relative cursor-pointer" @click="triggerFileInput">
            <Avatar class="size-20">
              <AvatarImage :src="avatarUrl" alt="avatar" />
              <AvatarFallback class="text-xl">{{ avatarInitial }}</AvatarFallback>
            </Avatar>
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <RiCameraLine class="size-6 text-white" />
            </div>
          </div>
          <div v-if="uploadingAvatar" class="text-sm text-muted-foreground">上传中...</div>
        </div>
      </CardContent>
    </Card>

    <!-- 修改密码卡片 -->
    <Card class="max-w-lg">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <RiLockPasswordLine class="size-5" />
          {{ t('profile.changePassword') }}
        </CardTitle>
        <CardDescription>{{ t('profile.changePasswordDesc') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <div class="space-y-2">
            <Label>{{ t('profile.oldPassword') }}</Label>
            <Input v-model="form.oldPassword" type="password" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('profile.newPassword') }}</Label>
            <Input v-model="form.newPassword" type="password" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('profile.confirmNewPassword') }}</Label>
            <Input v-model="form.confirmPassword" type="password" />
          </div>
          <Button type="submit" :disabled="loading">
            {{ loading ? t('common.loading') : t('common.save') }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
