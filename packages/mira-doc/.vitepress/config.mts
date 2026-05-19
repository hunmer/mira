import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Mira 文档",
  description: "Mira 系统完整指南 - 让你轻松上手文件管理与自动化",
  lang: 'zh-CN',
  base: '/mira-doc/',
  ignoreDeadLinks: true,
  
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '🏠 首页', link: '/' },
      { text: '📚 指南', link: '/guide/introduction' },
      { text: '🎨 管理面板', link: '/dashboard/' },
      { text: '🔧 API 参考', link: '/api/overview' },
      { text: '🚀 快速开始', link: '/quick-start' },
      { text: '🔗 N8N 集成', link: '/n8n/overview' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '📖 基础指南',
          items: [
            { text: '🎯 介绍', link: '/guide/introduction' },
            { text: '⚙️ 安装与配置', link: '/guide/installation' },
            { text: '🏗️ 系统架构', link: '/guide/architecture' }
          ]
        },
        {
          text: '🔧 核心功能',
          items: [
            { text: '📁 文件管理', link: '/guide/file-management' },
            { text: '📚 库管理', link: '/guide/library-management' },
            { text: '🔌 插件系统', link: '/guide/plugin-system' },
            { text: '👥 用户管理', link: '/guide/user-management' },
            { text: '📊 设备监控', link: '/guide/device-monitoring' }
          ]
        }
      ],
      '/api/': [
        {
          text: '🔗 API 文档',
          items: [
            { text: '📋 API 概览', link: '/api/overview' },
            { text: '🔐 认证授权', link: '/api/authentication' },
            { text: '📁 文件 API', link: '/api/file' },
            { text: '📚 库 API', link: '/api/library' },
            { text: '🔌 插件 API', link: '/api/plugin' },
            { text: '👥 用户 API', link: '/api/user' },
            { text: '📊 设备 API', link: '/api/device' },
            { text: '💾 数据库 API', link: '/api/database' }
          ]
        }
      ],
      '/n8n/': [
        {
          text: '🔗 N8N 集成',
          items: [
            { text: '📋 集成概览', link: '/n8n/overview' },
            { text: '📦 安装配置', link: '/n8n/installation' },
            { text: '🔧 Mira API 节点', link: '/n8n/mira-api-nodes' },
            { text: '⚡ WebSocket 触发器', link: '/n8n/websocket-trigger' },
            { text: '📖 使用示例', link: '/n8n/examples' },
          ]
        }
      ],
      '/dashboard/': [
        {
          text: '🎨 管理面板',
          items: [
            { text: '📖 概览', link: '/dashboard/' },
            { text: '🚀 部署指南', link: '/dashboard/deployment' },
            { text: '🌐 API 接口', link: '/dashboard/api' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hunmer/mira_typescript' }
    ],

    footer: {
      message: '基于 MIT 许可证发布',
      copyright: 'Copyright © 2025 Mira 项目'
    },

    editLink: {
      pattern: 'https://github.com/hunmer/mira_typescript/edit/main/mira-doc/:path',
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
