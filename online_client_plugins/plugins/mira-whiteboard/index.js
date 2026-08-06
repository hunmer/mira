/**
 * 自由白板插件（mira-whiteboard）
 *
 * 架构（双进程侧）：
 *   1. 本文件 index.js —— 宿主侧脚本，被注入到 Mira 主窗口 document。
 *      职责：注册插件实例工厂 + 注册 UI 贡献（右侧栏画板入口）。
 *   2. dist/ —— 独立 Vue SPA（@woven-canvas/vue），由插件窗口加载。
 *      职责：真正渲染无限画布；通过 location.search 的 projectId 区分工程。
 *
 * 数据持久化：
 *   工程列表通过 api.storage（localStorage，key=plugin_<pluginId>_projects）保存。
 *
 * 契约：渲染贡献（registerContribution）见宿主 renderer/plugins/types.ts。
 */
;(function () {
  const PLUGIN_ID = 'c3f4a5b6-7d8e-4f90-8a1b-2c3d4e5f6a7b'
  const CONTRIBUTION_ID = 'mira-whiteboard:projects'

  /**
   * 生成简易唯一 id
   */
  function uid() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }

  /**
   * 当前时间格式化（用于展示「更新于」）
   */
  function nowLabel() {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  /**
   * 白板插件实例
   */
  class WhiteboardPlugin {
    constructor(context) {
      this.context = context
      this.api = context.api
      this.contributionRegistered = false
    }

    async initialize() {
      this.api.log.info('自由白板插件初始化')
      this.registerContribution()
    }

    /**
     * 读取工程列表
     * api.storage.get 是异步的（PluginService 实现为 Promise），这里统一 await。
     */
    async getProjects() {
      try {
        const list = await this.api.storage.get('projects')
        return Array.isArray(list) ? list : []
      } catch (e) {
        console.error('[whiteboard] getProjects failed', e)
        return []
      }
    }

    async saveProjects(projects) {
      try {
        await this.api.storage.set('projects', projects)
      } catch (e) {
        console.error('[whiteboard] saveProjects failed', e)
        this.api.ui.showNotification('保存工程失败', 'error')
      }
    }

    /**
     * 注册右侧栏 UI 贡献
     */
    registerContribution() {
      const ps = typeof window !== 'undefined' ? window.pluginSystem : null
      if (!ps?.contributions?.register) {
        // 插件系统未就绪，延迟重试
        setTimeout(() => this.registerContribution(), 500)
        return
      }

      ps.contributions.register({
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: '自由画板',
        description: '管理画布工程，点击打开独立画布窗口',
        icon: { type: 'material', value: 'dashboard_customize' },
        // 宿主提供 container(HTMLElement) 与 ctx={ api, openPluginWindow }
        render: (container, ctx) => {
          return this.renderProjectList(container, ctx)
        },
      })
      this.contributionRegistered = true
      this.api.log.info('自由白板贡献已注册')
    }

    /**
     * 渲染工程列表（原生 DOM）。
     * 返回 cleanup 函数。
     */
    renderProjectList(container, ctx) {
      // 局部状态：popover 每次打开会重新 render，因此这里每次都是全新 DOM。
      let currentProjects = []
      let disposed = false

      // ---- 构建 DOM 骨架 ----
      container.innerHTML = ''

      const header = document.createElement('div')
      header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;'

      const title = document.createElement('div')
      title.style.cssText = 'font-size:13px;color:var(--muted-foreground, #888);flex:1;'
      title.textContent = '画布工程'

      const createBtn = document.createElement('button')
      createBtn.className = 'wb-btn wb-btn-primary'
      createBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">add</span><span>新建</span>'

      header.appendChild(title)
      header.appendChild(createBtn)
      container.appendChild(header)

      const listEl = document.createElement('div')
      listEl.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-height:40px;'
      container.appendChild(listEl)

      const emptyEl = document.createElement('div')
      emptyEl.style.cssText = 'padding:16px 8px;text-align:center;color:var(--muted-foreground,#999);font-size:12px;'
      container.appendChild(emptyEl)

      // ---- 注入局部样式（幂等，按 data 标记避免重复） ----
      const STYLE_ID = 'mira-whiteboard-popover-style'
      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = `
          .wb-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:8px;font-size:12px;border:1px solid var(--border,#e5e7eb);background:var(--background,#fff);color:var(--foreground,#333);cursor:pointer;transition:all .15s;}
          .wb-btn:hover{background:var(--primary,#6366f1);color:#fff;border-color:var(--primary,#6366f1);}
          .wb-btn-primary{background:var(--primary,#6366f1);color:#fff;border-color:var(--primary,#6366f1);}
          .wb-btn-primary:hover{filter:brightness(1.08);}
          .wb-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--border,#e5e7eb);background:var(--background,#fff);cursor:pointer;transition:all .15s;}
          .wb-item:hover{border-color:var(--primary,#6366f1);box-shadow:0 2px 8px rgba(99,102,241,.12);}
          .wb-item-icon{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--primary,#6366f1),var(--primary,#8b5cf6));color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
          .wb-item-info{flex:1;min-width:0;}
          .wb-item-name{font-size:13px;font-weight:500;color:var(--foreground,#333);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .wb-item-meta{font-size:11px;color:var(--muted-foreground,#999);}
          .wb-item-actions{display:flex;gap:2px;opacity:0;transition:opacity .15s;}
          .wb-item:hover .wb-item-actions{opacity:1;}
          .wb-icon-btn{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;background:transparent;color:var(--muted-foreground,#888);cursor:pointer;}
          .wb-icon-btn:hover{background:var(--muted,#f3f4f6);color:var(--foreground,#333);}
          .wb-icon-btn.danger:hover{background:rgba(239,68,68,.12);color:#ef4444;}
        `
        document.head.appendChild(style)
      }

      // ---- 渲染列表 ----
      const render = () => {
        listEl.innerHTML = ''
        if (currentProjects.length === 0) {
          emptyEl.style.display = 'block'
          emptyEl.textContent = '暂无工程，点击「新建」创建你的第一个画布'
          return
        }
        emptyEl.style.display = 'none'

        currentProjects.forEach((p) => {
          const item = document.createElement('div')
          item.className = 'wb-item'

          const icon = document.createElement('div')
          icon.className = 'wb-item-icon'
          icon.innerHTML = '<span class="material-icons" style="font-size:16px;">dashboard</span>'

          const info = document.createElement('div')
          info.className = 'wb-item-info'
          const name = document.createElement('div')
          name.className = 'wb-item-name'
          name.textContent = p.name
          const meta = document.createElement('div')
          meta.className = 'wb-item-meta'
          meta.textContent = `更新于 ${p.updatedAt || '—'}`
          info.appendChild(name)
          info.appendChild(meta)

          const actions = document.createElement('div')
          actions.className = 'wb-item-actions'

          const editBtn = document.createElement('button')
          editBtn.className = 'wb-icon-btn'
          editBtn.title = '重命名'
          editBtn.innerHTML = '<span class="material-icons" style="font-size:14px;">edit</span>'
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.renameProject(p, render)
          })

          const delBtn = document.createElement('button')
          delBtn.className = 'wb-icon-btn danger'
          delBtn.title = '删除'
          delBtn.innerHTML = '<span class="material-icons" style="font-size:14px;">delete</span>'
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.deleteProject(p, render)
          })

          actions.appendChild(editBtn)
          actions.appendChild(delBtn)

          item.appendChild(icon)
          item.appendChild(info)
          item.appendChild(actions)

          // 点击卡片 → 打开独立画布窗口
          item.addEventListener('click', () => {
            this.openProject(p, ctx)
          })

          listEl.appendChild(item)
        })
      }

      // ---- 新建工程 ----
      createBtn.addEventListener('click', async () => {
        await this.createProject(render)
      })

      // ---- 初始加载 ----
      ;(async () => {
        currentProjects = await this.getProjects()
        if (!disposed) render()
      })()

      // cleanup
      return () => {
        disposed = true
      }
    }

    /**
     * 新建工程
     */
    async createProject(rerender) {
      const name = prompt('请输入工程名称', `未命名画板 ${new Date().toLocaleDateString()}`)
      if (!name || !name.trim()) return
      const projects = await this.getProjects()
      const project = {
        id: uid(),
        name: name.trim(),
        createdAt: nowLabel(),
        updatedAt: nowLabel(),
      }
      projects.unshift(project)
      await this.saveProjects(projects)
      this.api.ui.showNotification(`已创建工程「${project.name}」`, 'success')
      rerender()
    }

    /**
     * 重命名工程
     */
    async renameProject(project, rerender) {
      const name = prompt('请输入新的工程名称', project.name)
      if (!name || !name.trim() || name.trim() === project.name) return
      const projects = await this.getProjects()
      const target = projects.find((p) => p.id === project.id)
      if (target) {
        target.name = name.trim()
        target.updatedAt = nowLabel()
        await this.saveProjects(projects)
        rerender()
      }
    }

    /**
     * 删除工程
     */
    async deleteProject(project, rerender) {
      if (!confirm(`确定删除工程「${project.name}」？\n（画布内容仍保留在浏览器存储中，仅从列表移除）`)) return
      const projects = await this.getProjects()
      const next = projects.filter((p) => p.id !== project.id)
      await this.saveProjects(next)
      rerender()
    }

    /**
     * 打开工程：弹出独立画布窗口，加载 dist/index.html?projectId=xxx
     */
    async openProject(project, ctx) {
      if (!ctx?.openPluginWindow) {
        this.api.ui.showNotification('当前环境不支持打开画布窗口', 'error')
        return
      }
      const result = await ctx.openPluginWindow({
        pluginId: PLUGIN_ID,
        entry: 'dist/index.html',
        title: `${project.name} - 自由画板`,
        width: 1280,
        height: 860,
        query: { projectId: project.id, projectName: project.name },
      })
      if (!result?.success) {
        this.api.ui.showNotification(result?.message || '打开画布失败', 'error')
      }
    }

    /**
     * 清理
     */
    async cleanup() {
      const ps = typeof window !== 'undefined' ? window.pluginSystem : null
      if (ps?.contributions?.unregister && this.contributionRegistered) {
        ps.contributions.unregister(CONTRIBUTION_ID)
        this.contributionRegistered = false
      }
      this.api.log.info('自由白板插件已清理')
    }
  }

  /**
   * 插件实例工厂
   */
  async function initialize(context) {
    const plugin = new WhiteboardPlugin(context)
    await plugin.initialize()
    return plugin
  }

  /**
   * 注册工厂到全局插件系统（脚本注入后立即执行）
   */
  function setup() {
    if (typeof window !== 'undefined' && window.pluginSystem && window.pluginSystem.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
      console.log('🏭 mira-whiteboard plugin factory registered')
    } else {
      setTimeout(setup, 100)
    }
  }

  setup()
})()
