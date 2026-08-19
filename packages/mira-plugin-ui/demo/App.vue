<script setup lang="ts">
import { ref } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'
import { SaveLocationDialog, type SaveLocation } from '@/index'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const dark = ref(false)
function toggleDark () {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
}

// SaveLocationDialog 演示数据
const showSave = ref(false)
const saved = ref('')
const libraries = [
  { id: 1, name: '我的素材库' },
  { id: 2, name: '设计灵感' },
]
const folders = [
  { id: 101, title: '文档' },
  { id: 102, title: '笔记' },
  { id: 103, title: '草稿' },
]
function handleSave (location: SaveLocation) {
  saved.value = JSON.stringify(location)
}

// 基础 Dialog 演示
const showBasic = ref(false)
const basicName = ref('')

// Select 演示
const framework = ref('vue')
</script>

<template>
  <main class="bg-background text-foreground min-h-screen p-8">
    <div class="mx-auto flex max-w-3xl flex-col gap-10">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">mira-plugin-ui Demo</h1>
          <p class="text-muted-foreground mt-1 text-sm">shadcn-vue 组件库 · dist 可经 CDN 独立引入</p>
        </div>
        <Button variant="outline" size="icon" @click="toggleDark">
          <Sun v-if="dark" class="size-4" />
          <Moon v-else class="size-4" />
        </Button>
      </header>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">Button</h2>
        <div class="flex flex-wrap items-center gap-3">
          <Button>默认</Button>
          <Button variant="secondary">次要</Button>
          <Button variant="outline">描边</Button>
          <Button variant="ghost">幽灵</Button>
          <Button variant="destructive">危险</Button>
          <Button size="sm">小尺寸</Button>
          <Button size="lg">大尺寸</Button>
          <Button disabled>禁用</Button>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">Input / Label / Select</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-2">
            <Label for="demo-input">文本输入</Label>
            <Input id="demo-input" v-model="basicName" placeholder="请输入内容" />
          </div>
          <div class="grid gap-2">
            <Label>框架选择</Label>
            <Select v-model="framework">
              <SelectTrigger>
                <SelectValue placeholder="选择框架" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vue">Vue</SelectItem>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="svelte">Svelte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">Dialog</h2>
        <Button class="w-fit" variant="outline" @click="showBasic = true">打开基础 Dialog</Button>
        <Dialog :open="showBasic" @update:open="value => showBasic = value">
          <DialogContent class="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>基础弹窗</DialogTitle>
              <DialogDescription>来自 mira-plugin-ui 的 shadcn-vue Dialog 组件。</DialogDescription>
            </DialogHeader>
            <div class="grid gap-2">
              <Label for="dialog-input">名称</Label>
              <Input id="dialog-input" v-model="basicName" placeholder="输入名称" />
            </div>
            <DialogFooter>
              <Button variant="outline" @click="showBasic = false">取消</Button>
              <Button @click="showBasic = false">确定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">SaveLocationDialog</h2>
        <Button class="w-fit" @click="showSave = true">保存文档到…</Button>
        <p v-if="saved" class="bg-muted text-muted-foreground rounded-md p-3 font-mono text-sm">{{ saved }}</p>
        <SaveLocationDialog
          v-model:open="showSave"
          :libraries="libraries"
          :folders="folders"
          initial-library-id="1"
          initial-file-name="我的文档"
          @save="handleSave"
        />
      </section>
    </div>
  </main>
</template>
