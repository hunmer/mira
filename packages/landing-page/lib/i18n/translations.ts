export type Locale = "zh" | "en";

export const LOCALES: Locale[] = ["zh", "en"];

export const DEFAULT_LOCALE: Locale = "zh";

// 嵌套字典类型：zh / en 结构必须一致
type Dict = typeof zh;

export const zh = {
  nav: {
    features: "特性",
    docs: "文档",
    install: "安装",
    github: "GitHub",
    getStarted: "开始使用",
    openMenu: "切换菜单",
  },
  hero: {
    badge: "v2.0 · 现已支持 MCP 接入",
    titleLead: "新时代的",
    titleHighlight: "素材管理软件",
    subtitle:
      "让文件管理变得简单，让自动化触手可及。管理多个独立素材库，通过 CLI、MCP 与插件生态，把你的媒体资产交给 AI Agent 驱动。",
    ctaPrimary: "立即安装",
    ctaSecondary: "查看文档",
    hint: "开源免费 · 跨平台 · 一键接入 Claude / ZCode 等 AI Agent",
  },
  logoCloud: {
    lead: "支持的文件格式",
    highlight: "覆盖图片 · 文档 · 3D · 动画等",
  },
  feature: {
    title: "为素材管理而生",
    subtitle: "从本地库到 AI Agent，覆盖素材管理的完整生命周期。",
    items: {
      cli: {
        title: "完整 CLI",
        description:
          "一条命令管理素材库、文件、标签、文件夹、插件、设备与数据库，支持多 profile 凭证。",
      },
      mcp: {
        title: "MCP 接入",
        description:
          "作为 MCP 服务暴露约 50 个工具，Claude / ZCode 等 AI Agent 可直接操作 Mira。",
      },
      skill: {
        title: "Skill 扩展",
        description:
          "基于约定俗成的 Skill 机制，为 AI Agent 提供按需加载的项目专属知识包。",
      },
      library: {
        title: "灵活库管理",
        description: "创建和管理多个独立文件库，每个库可独立配置启停，互不干扰。",
      },
      plugin: {
        title: "丰富插件生态",
        description:
          "支持插件市场，安装 / 启停 / 搜索，满足个性化的格式与功能扩展需求。",
      },
      device: {
        title: "设备监控",
        description:
          "基于 WebSocket 的实时连接管理与事件推送，随时掌握设备在线状态。",
      },
    },
  },
  testimonials: {
    tag: "用户评价",
    title: "用户怎么说",
    subtitle: "来自创作者、开发者与团队的真实反馈。",
    items: [
      {
        text: "Mira 把我散落在多个硬盘的素材整理得井井有条，配合 CLI 批量打标签，效率比以前高了十倍不止。",
        name: "林晓宇",
        role: "视频创作者",
      },
      {
        text: "接入 MCP 后，我可以直接让 Claude 帮我检索库里的素材并归档，几乎不用手动操作，体验非常顺滑。",
        name: "陈宇航",
        role: "独立开发者",
      },
      {
        text: "多个独立素材库的设计太实用了，工作和个人素材彻底隔离，启停随心，结构清晰。",
        name: "王梦琪",
        role: "设计团队负责人",
      },
      {
        text: "插件生态让 Mira 能处理我们几乎所有格式，缩略图、预览、转码一条龙，省去了大量工具切换。",
        name: "赵一帆",
        role: "后期工程师",
      },
      {
        text: "WebSocket 的实时设备监控让我们清楚地知道谁在何时连接，团队协作的素材安全有了保障。",
        name: "刘思颖",
        role: "IT 管理员",
      },
      {
        text: "从安装到第一个素材库跑起来只花了五分钟，doctor 命令一键搞定 ffmpeg 依赖，新手友好度满分。",
        name: "孙佳怡",
        role: "自媒体运营",
      },
      {
        text: "Skill 机制让 AI Agent 自动学会怎么操作素材库，简直是 AI 时代素材管理的正确打开方式。",
        name: "周明远",
        role: "AI 应用工程师",
      },
      {
        text: "跨平台的桌面客户端做得很精致，Windows 和 Mac 体验一致，团队里两种系统都能无缝用。",
        name: "吴婧文",
        role: "产品经理",
      },
      {
        text: "开源免费就能用到这样完整的功能，社区响应也很积极，已经把它推荐给了整个摄影小组。",
        name: "黄子韬",
        role: "摄影师",
      },
    ],
  },
  faqs: {
    title: "常见问题",
    subtitle: "关于 Mira 的常见疑问解答，点击任意问题展开详情。",
    contactLead: "没找到答案？",
    contactLink: "联系我们",
    items: [
      {
        title: "Mira 是什么？",
        content:
          "Mira 是一款新时代的素材管理软件，让你以素材库为核心组织媒体文件，通过 CLI、MCP、插件生态与桌面客户端，把文件管理变得简单、自动化触手可及。",
      },
      {
        title: "Mira 适合谁使用？",
        content:
          "Mira 面向需要管理大量媒体资产的创作者、摄影师、视频后期、设计团队与独立开发者，尤其适合希望借助 AI Agent 自动化素材流程的用户。",
      },
      {
        title: "如何安装 Mira？",
        content:
          "服务端可通过 npm 一键全局安装：npm install -g mira-app-server，然后运行 mira-app-server start 启动。桌面客户端从 GitHub Releases 下载对应平台的安装包即可。",
      },
      {
        title: "Mira 怎么和 AI Agent 配合？",
        content:
          "运行 mira-app-server --mcp 即可把 Mira 作为 MCP 服务暴露约 50 个工具，Claude、ZCode 等 MCP 客户端可直接对素材库、文件、标签、文件夹进行增删改查，这是 AI 接入 Mira 的推荐方式。",
      },
      {
        title: "支持哪些平台？",
        content:
          "服务端跨平台运行（Windows / macOS / Linux），桌面客户端提供 Windows 安装版与便携版、macOS 的 dmg（x64 与 arm64）。外部依赖 ffmpeg、ImageMagick、exiftool 可用 doctor 命令一键检测安装。",
      },
      {
        title: "是否开源免费？",
        content:
          "Mira 是开源项目，代码托管在 GitHub（hunmer/mira），可免费使用。社区活跃，欢迎提交 Issue 与 PR。",
      },
      {
        title: "插件能做什么？",
        content:
          "插件生态支持格式解析、缩略图生成、预览渲染、容器资源抽取等扩展。通过插件市场可一键安装、启停、搜索插件，满足个性化的格式与功能需求。",
      },
    ],
  },
  contact: {
    title: "联系我们",
    subtitle: "有问题或建议？欢迎通过以下方式联系 Mira 团队。",
    emailDesc: "我们通常在 48 小时内回复。",
    emailTitle: "邮件",
    githubTitle: "GitHub",
    githubDesc: "源码、文档、Release 都在这里。",
    githubLink: "github.com/hunmer/mira",
    docsTitle: "文档",
    docsDesc: "CLI、MCP、Skill 文档齐全。",
    docsLink: "查看使用文档",
    communityLead: "加入",
    communityHighlight: "社区",
    issueLabel: "提交 Issue",
    qqTitle: "QQ 群",
    qqDesc: "扫码加入官方交流群，获取最新动态与技术支持。",
    qqHint: "微信扫一扫 / QQ 扫一扫",
  },
  footer: {
    groups: {
      product: "产品",
      resources: "资源",
      community: "社区",
      follow: "关注我们",
    },
    product: {
      features: "特性",
      install: "安装",
      cli: "CLI",
      mcp: "MCP 接入",
    },
    resources: {
      docs: "使用文档",
      faqs: "常见问题",
      changelog: "更新日志",
      plugins: "插件市场",
    },
    community: {
      github: "GitHub",
      issue: "提交 Issue",
      skill: "Skill 扩展",
      contributing: "贡献指南",
    },
    copyright: "Mira, 保留所有权利",
  },
  langToggle: {
    label: "切换语言",
  },
};

export const en: Dict = {
  nav: {
    features: "Features",
    docs: "Docs",
    install: "Install",
    github: "GitHub",
    getStarted: "Get Started",
    openMenu: "Toggle menu",
  },
  hero: {
    badge: "v2.0 · MCP integration now available",
    titleLead: "The new era of",
    titleHighlight: "media asset management",
    subtitle:
      "Make file management simple, automation within reach. Manage multiple independent libraries, and hand your media assets to AI Agents via CLI, MCP and the plugin ecosystem.",
    ctaPrimary: "Install now",
    ctaSecondary: "Read the docs",
    hint: "Open source · Cross-platform · One-click integration with Claude / ZCode and other AI Agents",
  },
  logoCloud: {
    lead: "Supported file formats",
    highlight: "Images · Documents · 3D · Animation & more",
  },
  feature: {
    title: "Built for media management",
    subtitle:
      "From local libraries to AI Agents — covering the full lifecycle of media management.",
    items: {
      cli: {
        title: "Full CLI",
        description:
          "Manage libraries, files, tags, folders, plugins, devices and the database with a single command, with multi-profile credentials.",
      },
      mcp: {
        title: "MCP integration",
        description:
          "Exposes ~50 tools as an MCP service, so AI Agents like Claude / ZCode can operate Mira directly.",
      },
      skill: {
        title: "Skill extension",
        description:
          "A convention-based Skill mechanism that gives AI Agents on-demand, project-specific knowledge packs.",
      },
      library: {
        title: "Flexible libraries",
        description:
          "Create and manage multiple independent file libraries, each independently startable and stoppable.",
      },
      plugin: {
        title: "Rich plugin ecosystem",
        description:
          "A plugin marketplace with install / enable / disable / search, covering personalized format and feature needs.",
      },
      device: {
        title: "Device monitoring",
        description:
          "Real-time connection management and event push over WebSocket, keeping device status in view.",
      },
    },
  },
  testimonials: {
    tag: "Testimonials",
    title: "What users say",
    subtitle: "Real feedback from creators, developers and teams.",
    items: [
      {
        text: "Mira organized the media scattered across my drives neatly. With the CLI batch-tagging, my efficiency is more than ten times higher.",
        name: "Lin Xiaoyu",
        role: "Video Creator",
      },
      {
        text: "After plugging in MCP, I let Claude search and archive assets in my library — almost zero manual work. The experience is silky smooth.",
        name: "Chen Yuhang",
        role: "Indie Developer",
      },
      {
        text: "Multiple independent libraries is a brilliant design — work and personal media are fully isolated, start/stop on demand, crystal-clear structure.",
        name: "Wang Mengqi",
        role: "Design Team Lead",
      },
      {
        text: "The plugin ecosystem lets Mira handle nearly every format we have — thumbnails, previews, transcoding in one stop, saving tons of tool switching.",
        name: "Zhao Yifan",
        role: "Post-Production Engineer",
      },
      {
        text: "WebSocket real-time monitoring tells us exactly who connects when — our team's media security is in safe hands.",
        name: "Liu Siying",
        role: "IT Administrator",
      },
      {
        text: "From install to first library running took five minutes. The doctor command handles ffmpeg deps in one shot — perfect for newcomers.",
        name: "Sun Jiayi",
        role: "Content Operator",
      },
      {
        text: "The Skill mechanism teaches AI Agents how to operate the library automatically — the right way to do media management in the AI era.",
        name: "Zhou Mingyuan",
        role: "AI Application Engineer",
      },
      {
        text: "The cross-platform desktop client is polished, with identical UX on Windows and Mac. Both work seamlessly across our team.",
        name: "Wu Jingwen",
        role: "Product Manager",
      },
      {
        text: "Open source and free, yet this complete. The community is responsive — I've recommended it to my whole photography group.",
        name: "Huang Zitao",
        role: "Photographer",
      },
    ],
  },
  faqs: {
    title: "FAQ",
    subtitle: "Common questions about Mira — click any question to expand.",
    contactLead: "Didn't find your answer?",
    contactLink: "Contact us",
    items: [
      {
        title: "What is Mira?",
        content:
          "Mira is a new-generation media asset manager. It organizes media files around libraries, and — via CLI, MCP, the plugin ecosystem and a desktop client — makes file management simple and automation within reach.",
      },
      {
        title: "Who is Mira for?",
        content:
          "Mira is for creators, photographers, video editors, design teams and indie developers managing large media libraries — especially those who want to automate media workflows with AI Agents.",
      },
      {
        title: "How do I install Mira?",
        content:
          "Install the server globally via npm: npm install -g mira-app-server, then run mira-app-server start. Download the desktop client for your platform from GitHub Releases.",
      },
      {
        title: "How does Mira work with AI Agents?",
        content:
          "Run mira-app-server --mcp to expose Mira as an MCP service with ~50 tools. MCP clients like Claude and ZCode can directly CRUD libraries, files, tags and folders — the recommended way to bring AI to Mira.",
      },
      {
        title: "Which platforms are supported?",
        content:
          "The server runs cross-platform (Windows / macOS / Linux). The desktop client ships Windows installer and portable builds, plus macOS dmg (x64 and arm64). External deps (ffmpeg, ImageMagick, exiftool) can be detected and installed via the doctor command.",
      },
      {
        title: "Is it open source and free?",
        content:
          "Mira is open source, hosted on GitHub (hunmer/mira) and free to use. The community is active — Issues and PRs welcome.",
      },
      {
        title: "What can plugins do?",
        content:
          "The plugin ecosystem supports format parsing, thumbnail generation, preview rendering, container resource extraction and more. Install, enable, disable and search plugins from the marketplace to fit your format and feature needs.",
      },
    ],
  },
  contact: {
    title: "Contact us",
    subtitle: "Questions or feedback? Reach the Mira team any of these ways.",
    emailDesc: "We usually reply within 48 hours.",
    emailTitle: "Email",
    githubTitle: "GitHub",
    githubDesc: "Source, docs and releases all live here.",
    githubLink: "github.com/hunmer/mira",
    docsTitle: "Docs",
    docsDesc: "Full docs for CLI, MCP and Skills.",
    docsLink: "Read the docs",
    communityLead: "Join the",
    communityHighlight: "community",
    issueLabel: "Open an Issue",
    qqTitle: "QQ Group",
    qqDesc: "Scan to join the official group for updates and support.",
    qqHint: "Scan with WeChat / QQ",
  },
  footer: {
    groups: {
      product: "Product",
      resources: "Resources",
      community: "Community",
      follow: "Follow",
    },
    product: {
      features: "Features",
      install: "Install",
      cli: "CLI",
      mcp: "MCP",
    },
    resources: {
      docs: "Documentation",
      faqs: "FAQ",
      changelog: "Changelog",
      plugins: "Plugin Market",
    },
    community: {
      github: "GitHub",
      issue: "Open an Issue",
      skill: "Skills",
      contributing: "Contributing",
    },
    copyright: "Mira, All rights reserved",
  },
  langToggle: {
    label: "Switch language",
  },
};

export const translations: Record<Locale, Dict> = { zh, en };

export type Translation = Dict;
