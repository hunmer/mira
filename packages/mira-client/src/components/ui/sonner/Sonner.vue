<script lang="ts" setup>
import type { ToasterProps } from "vue-sonner"
import { CheckIcon, CircleCheckIcon, CopyIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from "@lucide/vue"
import { Toaster as Sonner } from "vue-sonner"
import { h, render } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<ToasterProps>()

const COPY_BTN = "sonner-copy-btn"

// vue-sonner 未提供往 toast 右上角加内容的插槽，error-icon 插槽会在每个 error toast 内渲染一次，
// 借其 ref 定位所属的 li，向右上角注入复制消息按钮（样式对齐内置 close button）
function onErrorIconRef(el: unknown) {
  if (!(el instanceof HTMLElement)) return
  const li = el.closest<HTMLElement>("li[data-sonner-toast]")
  if (!li || li.querySelector(`.${COPY_BTN}`)) return

  const btn = document.createElement("button")
  btn.type = "button"
  btn.className = COPY_BTN
  btn.title = "复制错误信息"
  btn.setAttribute("aria-label", "复制错误信息")

  const setIcon = (icon: typeof CopyIcon) => render(h(icon, { class: "size-3.5" }), btn)
  setIcon(CopyIcon)

  btn.addEventListener("click", async () => {
    const title = li.querySelector("[data-title]")?.textContent?.trim() ?? ""
    const description = li.querySelector("[data-description]")?.textContent?.trim() ?? ""
    const text = title && description ? `${title}\n${description}` : title || description
    if (!text || !(await copyText(text))) return
    setIcon(CheckIcon)
    setTimeout(() => setIcon(CopyIcon), 1500)
  })

  li.appendChild(btn)
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.cssText = "position:fixed;opacity:0"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    textarea.remove()
    return ok
  }
}
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
    v-bind="props"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <span class="contents" :ref="onErrorIconRef">
        <OctagonXIcon class="size-4" />
      </span>
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>

<style>
/* 注入的复制按钮，非 scoped 才能作用到动态插入的 DOM；样式与 vue-sonner 内置 close button 对齐 */
[data-sonner-toast] .sonner-copy-btn {
  position: absolute;
  right: 0;
  top: 0;
  transform: translate(35%, -35%);
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  color: var(--gray12);
  background: var(--normal-bg);
  border: 1px solid var(--gray4);
  border-radius: 50%;
  cursor: pointer;
  z-index: 1;
  transition: opacity 100ms, background 200ms, border-color 200ms;
}

[data-sonner-toast] .sonner-copy-btn:hover {
  background: var(--gray2);
  border-color: var(--gray5);
}
</style>

