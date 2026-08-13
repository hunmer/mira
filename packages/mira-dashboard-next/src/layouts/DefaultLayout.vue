<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme, type ThemeMode } from '@/composables/useTheme'
import { useLibrary } from '@/composables/useLibrary'

const SIDEBAR_COOKIE = 'sidebar_state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarInset, SidebarTrigger, SidebarRail,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import PageLoading from '@/components/common/PageLoading.vue'
import { toast } from 'vue-sonner'
import { Toaster } from '@/components/ui/sonner'
import {
  RiHome4Line, RiFolderLine, RiPuzzleLine, RiUserSettingsLine,
  RiDatabase2Line, RiSmartphoneLine,
  RiBarChart2Line, RiImageLine, RiFolderOpenLine,
  RiSunLine, RiMoonLine, RiComputerLine, RiGlobalLine,
  RiLogoutBoxRLine, RiUser3Line, RiArrowGoBackLine, RiSettings3Line,
} from '@remixicon/vue'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

// 返回上一级：仅当存在历史记录时可返回
const canGoBack = typeof window !== 'undefined' && window.history.length > 1
function goBack() {
  router.back()
}
const auth = useAuthStore()
const { mode: themeMode } = useTheme()
const { libraries, selectedId, loading: libsLoading, ensureLoaded } = useLibrary()

const LIBRARY_QUERY_PARAM = 'library'

const navItems = [
  { path: '/overview', icon: RiHome4Line, key: 'overview', roles: [] },
  { path: '/library', icon: RiFolderLine, key: 'library', roles: ['super', 'admin'] },
  { path: '/plugin', icon: RiPuzzleLine, key: 'plugin', roles: ['super', 'admin'] },
  { path: '/admin', icon: RiUserSettingsLine, key: 'admin', roles: ['super'] },
  { path: '/database', icon: RiDatabase2Line, key: 'database', roles: ['super', 'admin'] },
  { path: '/device', icon: RiSmartphoneLine, key: 'device', roles: ['super', 'admin'] },
  { path: '/file-manager', icon: RiFolderOpenLine, key: 'fileManager', roles: ['super', 'admin'] },
  { path: '/statistics', icon: RiBarChart2Line, key: 'statistics', roles: ['super', 'admin', 'user'] },
  { path: '/media', icon: RiImageLine, key: 'media', roles: ['super', 'admin'] },
  { path: '/settings', icon: RiSettings3Line, key: 'settings', roles: [] },
]

const visibleNavItems = navItems.filter(
  (item) => !item.roles.length || item.roles.includes(auth.userRole),
)

function setTheme(m: ThemeMode) { themeMode.value = m }
function setLocale(l: string) { locale.value = l; localStorage.setItem('locale', l) }

const hideSideParam = route.query.hideSide
const sidebarDefaultOpen = hideSideParam !== undefined ? false : undefined

onMounted(() => {
  // 优先从 URL 参数恢复选中的素材库（显式入口/可分享链接优先级最高）
  const urlLib = route.query[LIBRARY_QUERY_PARAM]
  if (typeof urlLib === 'string' && urlLib) {
    selectedId.value = urlLib
  }
  if (hideSideParam !== undefined) {
    document.cookie = `${SIDEBAR_COOKIE}=false; path=/; max-age=${60 * 60 * 24 * 365}`
    const { hideSide, ...rest } = route.query
    router.replace({ query: rest })
  }
  ensureLoaded()
})

// 选中素材库变化时同步到 URL 参数
watch(selectedId, (id) => {
  if (!id) return
  if (route.query[LIBRARY_QUERY_PARAM] === id) return
  router.replace({ query: { ...route.query, [LIBRARY_QUERY_PARAM]: id } })
})

function handleLogout() {
  auth.logout()
  toast.success(t('auth.logout'))
  router.push('/login')
}
</script>

<template>
  <Toaster />
  <SidebarProvider :default-open="sidebarDefaultOpen">
    <Sidebar collapsible="icon">
      <SidebarHeader class="p-4">
        <SidebarMenu>
          <SidebarMenuButton size="lg" tooltip="Mira">
            <img src="/logo.png" alt="Mira" class="size-6 shrink-0" />
            <span class="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">Mira</span>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in visibleNavItems" :key="item.path">
                <SidebarMenuButton as-child :is-active="route.path === item.path || route.path.startsWith(item.path + '/')" :tooltip="t(`nav.${item.key}`)">
                  <router-link :to="item.path">
                    <component :is="item.icon" class="size-4" />
                    <span>{{ t(`nav.${item.key}`) }}</span>
                  </router-link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter class="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <SidebarMenuButton size="lg">
                  <Avatar class="size-8">
                    <AvatarImage :src="`/api/user/avatar/${auth.user?.id}`" />
                    <AvatarFallback>{{ auth.user?.username?.charAt(0)?.toUpperCase() || 'U' }}</AvatarFallback>
                  </Avatar>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-semibold">{{ auth.user?.username }}</span>
                    <span class="truncate text-xs text-muted-foreground">{{ auth.userRole }}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" class="w-56" align="start">
                <DropdownMenuItem @click="router.push('/profile')">
                  <RiUser3Line class="mr-2 size-4" />
                  {{ t('profile.title') }}
                </DropdownMenuItem>
                <DropdownMenuItem @click="handleLogout">
                  <RiLogoutBoxRLine class="mr-2 size-4" />
                  {{ t('auth.logout') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>

    <SidebarInset>
      <header class="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Button
          v-if="canGoBack"
          variant="ghost"
          size="icon"
          class="size-8"
          :title="t('common.back')"
          @click="goBack"
        >
          <RiArrowGoBackLine class="size-4" />
        </Button>
        <div class="flex-1" />
        <!-- Library selector -->
        <Select v-model="selectedId" :disabled="libsLoading || !libraries.length">
          <SelectTrigger class="w-52 h-8 text-xs">
            <SelectValue placeholder="选择素材库" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</SelectItem>
          </SelectContent>
        </Select>
        <!-- Locale switcher -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon">
              <RiGlobalLine class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="setLocale('zh-CN')">中文</DropdownMenuItem>
            <DropdownMenuItem @click="setLocale('en')">English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <!-- Theme switcher -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon">
              <RiSunLine v-if="themeMode === 'light'" class="size-4" />
              <RiMoonLine v-else-if="themeMode === 'dark'" class="size-4" />
              <RiComputerLine v-else class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="setTheme('light')">
              <RiSunLine class="mr-2 size-4" /> {{ t('theme.light') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="setTheme('dark')">
              <RiMoonLine class="mr-2 size-4" /> {{ t('theme.dark') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="setTheme('system')">
              <RiComputerLine class="mr-2 size-4" /> {{ t('theme.system') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main class="flex-1 p-6">
        <router-view v-slot="{ Component }">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <PageLoading />
            </template>
          </Suspense>
        </router-view>
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
