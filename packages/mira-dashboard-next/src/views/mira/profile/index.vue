<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'
import { RiLockPasswordLine } from '@remixicon/vue'

const { t } = useI18n()
const auth = useAuthStore()

const form = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const loading = ref(false)

async function handleChangePassword() {
  if (!form.value.oldPassword || !form.value.newPassword) {
    toast.error(t('profile.fillAll'))
    return
  }
  if (form.value.newPassword.length < 6) {
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
