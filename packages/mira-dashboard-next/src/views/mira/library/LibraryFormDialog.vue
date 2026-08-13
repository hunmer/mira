<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PathTreeSelect from '@/components/PathTreeSelect.vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

export type SyncFilterMode = 'blacklist' | 'whitelist'

export interface LibraryFormData {
  name: string
  path: string
  description: string
  icon: string
  enableHash: boolean
  enableAutoSync: boolean
  enableThumbScan: boolean
  enableAutoBackup: boolean
  enableDbMirror: boolean
  pluginsDir: string
  allowedRoles: string[]
  /** 自动同步过滤模式：黑名单（排除） / 白名单（强制包含） */
  syncFilterMode: SyncFilterMode
  /** 黑名单，多行文本，每行一个 glob（类似 .gitignore） */
  syncBlacklist: string
  /** 白名单，多行文本，每行一个 glob，强制包含（覆盖黑名单 / 默认规则） */
  syncWhitelist: string
}

const props = defineProps<{
  open: boolean
  isEdit: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: []
}>()

const { t } = useI18n()

const form = defineModel<LibraryFormData | null>({ required: true })

const ROLES = ['super', 'admin', 'user'] as const

const toggleRole = (role: string) => {
  if (!form.value) return
  const roles = new Set(form.value.allowedRoles || [])
  if (roles.has(role)) roles.delete(role)
  else roles.add(role)
  form.value.allowedRoles = [...roles]
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? t('library.editLibrary') : t('library.createLibrary') }}</DialogTitle>
      </DialogHeader>
      <div v-if="form" class="space-y-4">
        <div class="space-y-2">
          <Label>{{ t('common.name') }}</Label>
          <Input v-model="form.name" :placeholder="t('library.namePlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.path') }}</Label>
          <PathTreeSelect v-model="form.path" :placeholder="t('library.pathPlaceholder')" />
        </div>
        <!-- <div class="space-y-2">
          <Label>{{ t('library.icon') }}</Label>
          <Input v-model="form.icon" :placeholder="t('library.iconPlaceholder')" />
        </div> -->
        <div class="flex items-center gap-2">
          <input id="enableHash" v-model="form.enableHash" type="checkbox" class="size-4 rounded border-input" />
          <Label for="enableHash">{{ t('library.enableHash') }}</Label>
        </div>
        <div class="flex items-center gap-2">
          <input id="enableAutoSync" v-model="form.enableAutoSync" type="checkbox" class="size-4 rounded border-input" />
          <Label for="enableAutoSync">{{ t('library.enableAutoSync') }}</Label>
        </div>
        <!-- 同步过滤规则（仅当开启自动同步时显示） -->
        <div v-if="form.enableAutoSync" class="space-y-2">
          <Label>{{ t('library.syncFilterTitle') }}</Label>
          <p class="text-muted-foreground text-xs leading-relaxed">{{ t('library.syncFilterHint') }}</p>
          <Tabs v-model="form.syncFilterMode">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="blacklist">{{ t('library.syncBlacklist') }}</TabsTrigger>
              <TabsTrigger value="whitelist">{{ t('library.syncWhitelist') }}</TabsTrigger>
            </TabsList>
            <TabsContent value="blacklist" class="mt-2 space-y-1">
              <p class="text-muted-foreground text-xs">{{ t('library.syncBlacklistHint') }}</p>
              <Textarea
                v-model="form.syncBlacklist"
                :placeholder="t('library.syncBlacklistPlaceholder')"
                rows="6"
                class="font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="whitelist" class="mt-2 space-y-1">
              <p class="text-muted-foreground text-xs">{{ t('library.syncWhitelistHint') }}</p>
              <Textarea
                v-model="form.syncWhitelist"
                :placeholder="t('library.syncWhitelistPlaceholder')"
                rows="6"
                class="font-mono text-xs"
              />
            </TabsContent>
          </Tabs>
        </div>
        <div class="flex items-center gap-2">
          <input id="enableThumbScan" v-model="form.enableThumbScan" type="checkbox" class="size-4 rounded border-input" />
          <Label for="enableThumbScan">{{ t('library.enableThumbScan') }}</Label>
        </div>
        <div class="flex items-center gap-2">
          <input id="enableAutoBackup" v-model="form.enableAutoBackup" type="checkbox" class="size-4 rounded border-input" />
          <Label for="enableAutoBackup">{{ t('library.enableAutoBackup') }}</Label>
        </div>
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <input id="enableDbMirror" v-model="form.enableDbMirror" type="checkbox" class="size-4 rounded border-input" />
            <Label for="enableDbMirror">{{ t('library.enableDbMirror') }}</Label>
          </div>
          <p class="pl-6 text-xs text-muted-foreground">{{ t('library.enableDbMirrorHint') }}</p>
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.pluginsDir') }}</Label>
          <PathTreeSelect v-model="form.pluginsDir" :placeholder="t('library.pluginsDirPlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('common.description') }}</Label>
          <Textarea
            v-model="form.description"
            :placeholder="t('library.descriptionPlaceholder')"
            rows="3"
          />
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.allowedRoles') }}</Label>
          <div class="flex gap-4">
            <label v-for="role in ROLES" :key="role" class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="form.allowedRoles?.includes(role)"
                @change="toggleRole(role)"
                class="size-4 rounded border-input"
              />
              <span class="text-sm">{{ role }}</span>
            </label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</Button>
        <Button @click="emit('save')">{{ t('common.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
