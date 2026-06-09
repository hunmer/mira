// 构建配置文件
// 定义不同环境的构建选项

interface BuildConfig {
  environment: 'development' | 'production' | 'test'
  minify: boolean
  sourcemap: boolean
  target: string
  outDir: string
  optimization: {
    splitChunks: boolean
    treeshaking: boolean
    compression: boolean
  }
  analysis: {
    bundleAnalyzer: boolean
    dependencyGraph: boolean
    sizeReport: boolean
  }
}

const configs: Record<string, BuildConfig> = {
  development: {
    environment: 'development',
    minify: false,
    sourcemap: true,
    target: 'chrome100',
    outDir: 'dist-dev',
    optimization: {
      splitChunks: false,
      treeshaking: false,
      compression: false
    },
    analysis: {
      bundleAnalyzer: false,
      dependencyGraph: false,
      sizeReport: false
    }
  },

  production: {
    environment: 'production',
    minify: true,
    sourcemap: false,
    target: 'chrome100',
    outDir: 'dist-renderer',
    optimization: {
      splitChunks: true,
      treeshaking: true,
      compression: true
    },
    analysis: {
      bundleAnalyzer: true,
      dependencyGraph: true,
      sizeReport: true
    }
  },

  test: {
    environment: 'test',
    minify: false,
    sourcemap: true,
    target: 'chrome100',
    outDir: 'dist-test',
    optimization: {
      splitChunks: false,
      treeshaking: false,
      compression: false
    },
    analysis: {
      bundleAnalyzer: false,
      dependencyGraph: false,
      sizeReport: false
    }
  }
}

// 获取当前环境的配置
export function getBuildConfig(): BuildConfig {
  const env = process.env.NODE_ENV || 'development'
  return configs[env] || configs.development
}

// 获取 Electron 主进程构建配置
export function getMainProcessConfig(): Partial<BuildConfig> {
  const baseConfig = getBuildConfig()
  
  return {
    ...baseConfig,
    target: 'node18',
    outDir: 'dist-main',
    optimization: {
      ...baseConfig.optimization,
      splitChunks: false // 主进程不需要代码分割
    }
  }
}

// 获取预加载脚本构建配置
export function getPreloadConfig(): Partial<BuildConfig> {
  const baseConfig = getBuildConfig()
  
  return {
    ...baseConfig,
    target: 'chrome100',
    outDir: 'dist-preload',
    optimization: {
      ...baseConfig.optimization,
      splitChunks: false // 预加载脚本不需要代码分割
    }
  }
}

// 获取渲染进程构建配置
export function getRendererConfig(): BuildConfig {
  return getBuildConfig()
}

// Rollup 外部依赖配置
export const externalDependencies = {
  main: ['electron', 'mira-app-core/shared/sdk', 'fs', 'path', 'os', 'crypto'],
  preload: ['electron'],
  renderer: [] // 渲染进程通常不需要外部依赖
}

// 代码分割配置
export const chunkSplitConfig = {
  // Vue 生态系统
  'vue-vendor': ['vue', 'vue-router', 'pinia'],
  
  // UI 组件库
  'ui-vendor': ['radix-vue', 'reka-ui'],
  
  // 工具库
  'utils-vendor': ['lodash-es', 'dayjs'],
  
  // Mira SDK
  'mira-sdk': ['mira-app-core/shared/sdk']
}

// 资源优化配置
export const assetOptimization = {
  images: {
    // 图片压缩配置
    formats: ['webp', 'avif', 'png', 'jpg'],
    quality: {
      webp: 80,
      avif: 75,
      png: 90,
      jpg: 85
    },
    sizes: [320, 640, 960, 1280, 1920]
  },
  
  fonts: {
    // 字体优化配置
    formats: ['woff2', 'woff'],
    preload: ['Inter-Regular', 'Inter-Medium', 'Inter-SemiBold']
  },
  
  css: {
    // CSS 优化配置
    purge: true,
    minify: true,
    extractCritical: true
  }
}

// 性能预算配置
export const performanceBudget = {
  // 文件大小限制
  maxAssetSize: 500 * 1024, // 500KB
  maxEntrypointSize: 1000 * 1024, // 1MB
  
  // 包大小警告阈值
  chunkSizeWarningLimit: 1000, // 1000KB
  
  // 关键资源大小限制
  criticalResourceSize: 100 * 1024 // 100KB
}

// 分析工具配置
export const analysisConfig = {
  bundleAnalyzer: {
    enabled: process.env.ANALYZE === 'true',
    reportFilename: 'bundle-report.html',
    openAnalyzer: false
  },
  
  dependencyGraph: {
    enabled: true,
    outputFormats: ['html', 'svg', 'json'],
    includeNodeModules: false
  },
  
  sizeReport: {
    enabled: true,
    gzipped: true,
    brotli: true
  }
}

export default {
  getBuildConfig,
  getMainProcessConfig,
  getPreloadConfig,
  getRendererConfig,
  externalDependencies,
  chunkSplitConfig,
  assetOptimization,
  performanceBudget,
  analysisConfig
}
