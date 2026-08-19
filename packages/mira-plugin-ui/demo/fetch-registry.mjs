// 从 shadcn-vue 官方 registry 拉取组件源码写入 src/components/ui/<name>/
// npx shadcn-vue add 在本机因代理 fetch 失败时的替代通道，改 names 后运行
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const names = ['select', 'dialog', 'button', 'input', 'label']
const base = 'https://shadcn-vue.com/r/styles/new-york-v4'

for (const name of names) {
  const res = await fetch(`${base}/${name}.json`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const item = await res.json()
  for (const file of item.files) {
    // registry path 形如 registry/new-york-v4/ui/select/Select.vue → src/components/ui/select/Select.vue
    const rel = file.path.replace(/^.*\/ui\//, '')
    const target = join(root, 'src/components/ui', rel)
    mkdirSync(dirname(target), { recursive: true })
    let content = file.content
    // registry 内部引用重写为项目 alias（CLI add 会做的同款处理）
    content = content.replace(/@?\/?registry\/new-york-v4\/ui\//g, '@/components/ui/').replace(/@\/@\/components\//g, '@/components/')
    writeFileSync(target, content)
    console.log('wrote', target.slice(root.length + 1), `(${content.length} bytes)`)
  }
  console.log(`${name}: deps=${(item.dependencies || []).join(',') || '-'} registryDeps=${(item.registryDependencies || []).join(',') || '-'}`)
}
