import { defineComponent } from 'vue'
import type { Router } from 'vue-router'
import client from '@/api/client'
import type { LibraryPlugins } from '@/api/modules/plugin'
import { ensurePluginRuntime } from '@/pluginRuntime'

export interface PluginRoute {
  name: string
  path: string
  pluginName: string
  component?: string
  builder?: () => string
  meta?: { title?: string; [k: string]: any }
}

const registeredRouteNames = new Set<string>()
let allRoutesLoading: Promise<void> | null = null

export async function registerAllPluginRoutes(router: Router) {
  if (allRoutesLoading) return allRoutesLoading

  allRoutesLoading = (async () => {
    const res = await client.get<LibraryPlugins[]>('/plugins/by-library')
    const groups = Array.isArray(res.data) ? res.data : []
    await Promise.all(groups.map(group => registerPluginRoutes(router, group.id)))
  })().finally(() => {
    allRoutesLoading = null
  })

  return allRoutesLoading
}

export async function registerPluginRoutes(router: Router, libraryId: string) {
  ensurePluginRuntime()

  const res = await client.get(`/plugin-routes/${libraryId}`)
  const routes: PluginRoute[] = Array.isArray(res.data?.data) ? res.data.data : []

  for (const route of routes) {
    const routeName = `plugin_${libraryId}_${route.name}`
    if (registeredRouteNames.has(routeName)) continue
    registeredRouteNames.add(routeName)

    const childPath = route.path.startsWith('/') ? route.path.slice(1) : route.path
    router.addRoute('MainLayout', {
      name: routeName,
      path: childPath,
      component: resolvePluginComponent(route, libraryId),
      meta: { ...route.meta, isPlugin: true, requiresAuth: true, libraryId },
    })
  }

  return routes
}

function resolvePluginComponent(route: PluginRoute, libraryId: string) {
  const mixin = {
    methods: {
      getLibraryId: () => libraryId,
    },
  }

  if (route.builder) {
    try {
      const html = route.builder()
      return defineComponent({ template: html, name: route.name, mixins: [mixin] })
    } catch (e) {
      console.error(`Plugin route builder error: ${route.name}`, e)
    }
  }

  if (route.component) {
    const comp = route.component
    const pluginName = route.pluginName || ''
    const src = `/api/plugins/${libraryId}/${pluginName}/${comp}`

    return () => new Promise<any>((resolve) => {
      ensurePluginRuntime()

      const key = `${pluginName}_${comp.replace(/[/.]/g, '_')}`
      const existing = (window as any).MiraPluginComponents?.[key]
      if (existing) return resolve(withMixin(existing, mixin))

      const script = document.createElement('script')
      script.src = src
      script.onload = () => {
        const raw = (window as any).MiraPluginComponents?.[key]
        resolve(raw ? withMixin(raw, mixin) : fallback(route))
      }
      script.onerror = () => {
        console.error(`Failed to load plugin script: ${src}`)
        resolve(fallback(route))
      }
      document.head.append(script)
    })
  }

  return fallback(route)
}

function withMixin(comp: any, mixin: any) {
  return defineComponent({ ...comp, mixins: [mixin] })
}

function fallback(route: PluginRoute) {
  return defineComponent({
    template: `<div class="p-6"><h2 class="text-lg font-semibold mb-2">{{ title }}</h2><p class="text-muted-foreground">插件页面: {{ path }}</p></div>`,
    data: () => ({ title: route.meta?.title || route.name, path: route.path }),
    name: route.name,
  })
}
