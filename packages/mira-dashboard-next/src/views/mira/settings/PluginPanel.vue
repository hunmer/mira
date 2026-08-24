<script setup lang="ts">
import { ref } from 'vue'
import { usePluginSources } from '@/composables/usePluginSources'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { RiAddLine, RiDeleteBin7Line, RiStarLine, RiStarFill } from '@remixicon/vue'

// ===== 插件源管理 (插件商店的 JSON 源, 持久化在 localStorage, 与插件页共享) =====
const {
  sources: pluginSources, activeId: pluginActiveId,
  addSource: addPluginSource, removeSource: removePluginSource, setActive: setPluginSourceActive,
} = usePluginSources()
const pluginForm = ref({ name: '', url: '' })

function addPluginSrc() {
  const url = pluginForm.value.url.trim()
  if (!url) { toast.error('请填写插件源 URL'); return }
  addPluginSource(pluginForm.value.name, url)
  pluginForm.value = { name: '', url: '' }
  toast.success('已添加插件源')
}

function removePluginSrc(id: string) {
  if (!confirm('确定删除该插件源？')) return
  removePluginSource(id)
}
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader class="flex-row items-center justify-between space-y-0">
        <CardTitle class="text-base">插件源</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- 添加表单 -->
        <div class="flex flex-col gap-2 sm:flex-row">
          <Input v-model="pluginForm.name" placeholder="源名称（可选）" class="sm:flex-1" />
          <Input v-model="pluginForm.url" placeholder="https://.../plugins.recommend.json" class="sm:flex-[2]" />
          <Button @click="addPluginSrc">
            <RiAddLine class="size-4 mr-1" /> 添加
          </Button>
        </div>

        <!-- 源列表 -->
        <div v-if="pluginSources.length" class="space-y-2">
          <div
            v-for="s in pluginSources"
            :key="s.id"
            class="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"
          >
            <button
              class="shrink-0"
              :title="s.id === pluginActiveId ? '当前应用' : '设为当前应用'"
              @click="setPluginSourceActive(s.id)"
            >
              <RiStarFill v-if="s.id === pluginActiveId" class="size-4 text-yellow-500" />
              <RiStarLine v-else class="size-4 text-muted-foreground hover:text-yellow-500" />
            </button>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium truncate">{{ s.name }}</span>
                <Badge v-if="s.id === pluginActiveId" variant="default" class="text-[10px]">当前</Badge>
              </div>
              <div class="text-xs text-muted-foreground truncate">{{ s.url }}</div>
            </div>
            <Button variant="ghost" size="icon" title="删除" @click="removePluginSrc(s.id)">
              <RiDeleteBin7Line class="size-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground py-6 text-center">暂无插件源，请添加</div>

        <p class="text-xs text-muted-foreground">
          星标选中的源将用于「插件」页的插件商店，插件商店中无需再填写地址。
        </p>
      </CardContent>
    </Card>
  </div>
</template>
