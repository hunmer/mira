<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) return
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    toast.success(t('auth.loginSuccess'))
    const redirect = (route.query.redirect as string) || '/overview'
    router.push(redirect)
  } catch (e: any) {
    toast.error(t('auth.loginFailed'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-2xl">Mira</CardTitle>
        <CardDescription>{{ t('auth.login') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('auth.username') }}</label>
            <Input v-model="username" :disabled="loading" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('auth.password') }}</label>
            <Input v-model="password" type="password" :disabled="loading" />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? t('common.loading') : t('auth.login') }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
