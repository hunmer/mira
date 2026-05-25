<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const router = useRouter()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const email = ref('')
const loading = ref(false)

async function handleRegister() {
  if (!username.value || !password.value) return
  if (password.value !== confirmPassword.value) {
    toast.error(t('auth.registerFailed'))
    return
  }
  loading.value = true
  try {
    await authApi.register({ username: username.value, password: password.value, email: email.value })
    toast.success(t('auth.registerSuccess'))
    router.push('/login')
  } catch {
    toast.error(t('auth.registerFailed'))
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
        <CardDescription>{{ t('auth.register') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('auth.username') }}</label>
            <Input v-model="username" :disabled="loading" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('auth.email') }}</label>
            <Input v-model="email" type="email" :disabled="loading" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('auth.password') }}</label>
            <Input v-model="password" type="password" :disabled="loading" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('auth.confirmPassword') }}</label>
            <Input v-model="confirmPassword" type="password" :disabled="loading" />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? t('common.loading') : t('auth.register') }}
          </Button>
          <p class="text-center text-sm text-muted-foreground">
            {{ t('auth.hasAccount') }}
            <router-link to="/login" class="text-primary hover:underline">{{ t('auth.goLogin') }}</router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
