import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Mira 文档",
  description: "Mira - 新时代的素材管理软件",
  lang: 'zh-CN',
  base: '/mira-doc/',
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/mira-doc/icon.ico' }]
  ],

  themeConfig: {
    nav: [
      { text: '🚀 安装', link: '/install' },
      { text: '📟 CLI', link: '/cli' },
      { text: '🔌 MCP', link: '/mcp' },
      { text: '⚡ Skill', link: '/skill' }
    ],

    sidebar: [
      {
        text: '📖 文档',
        items: [
          { text: '🚀 安装', link: '/install' },
          { text: '📟 CLI', link: '/cli' },
          { text: '🔌 MCP', link: '/mcp' },
          { text: '⚡ Skill', link: '/skill' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hunmer/mirat' }
    ],

    footer: {
      message: '基于 MIT 许可证发布',
      copyright: 'Copyright © 2025 Mira 项目'
    },

    editLink: {
      pattern: 'https://github.com/hunmer/mirat/edit/main/packages/mira-doc/:path',
      text: '在 GitHub 上编辑此页'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  }
})
