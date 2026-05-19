import type { PluginInfo } from '../../shared/types'

/**
 * 随机测试数据生成工具
 */
export class MockDataGenerator {
  private static categories = ['3d-models', 'materials', 'textures', 'hdri', 'brushes', 'plugins']
  private static authors = [
    'ModelingStudio', 'TextureLab', 'AnimationPro', 'DesignTools', 
    'CreativeWorks', 'TechSolutions', 'ArtStudio', 'DevTeam',
    'RenderStudio', 'SceneManager', 'PhysicsLab', 'MaterialWorks'
  ]
  
  private static pluginNames = [
    'Advanced Modeling Tools', 'Procedural Texture Generator', 'Animation Toolkit', 
    'Material Designer', 'HDRI Environment Pack', 'Sculpting Brushes', 
    'Lighting Assistant', 'Render Optimizer', 'UV Mapping Tools', 
    'Particle System', 'Physics Simulator', 'Color Grading Suite',
    'Mesh Analyzer', 'Texture Painter', 'Scene Manager', 'Export Utilities',
    'Geometry Processor', 'Shader Editor', 'Motion Capture Tools', 'Audio Visualizer'
  ]
  
  private static descriptions = [
    'Enhance your workflow with advanced tools for complex shapes and structures.',
    'Create unique and customizable textures with procedural generation.',
    'Streamline your animation process with professional tools.',
    'Design stunning materials with node-based editor.',
    'High-quality HDRI environments for realistic lighting.',
    'Professional sculpting brushes for detailed modeling.',
    'Intelligent lighting setup and optimization tools.',
    'Optimize your renders for better performance.',
    'Advanced UV mapping and unwrapping utilities.',
    'Create stunning particle effects and simulations.',
    'Realistic physics simulation for your scenes.',
    'Professional color grading and correction tools.',
    'Analyze and optimize mesh topology.',
    'Paint textures directly on 3D models.',
    'Organize and manage complex scenes efficiently.',
    'Export your work to multiple formats seamlessly.'
  ]
  
  private static featuresList = [
    ['Advanced geometry tools', 'Boolean operations', 'Parametric modeling'],
    ['Node-based editor', 'Real-time preview', 'Export to multiple formats'],
    ['Keyframe animation', 'Motion graphics', 'Character rigging'],
    ['PBR materials', 'Substance integration', 'Custom shaders'],
    ['360° environments', 'Multiple resolutions', 'Tone mapping'],
    ['Organic sculpting', 'Detail brushes', 'Symmetry tools'],
    ['Automatic lighting', 'Shadow optimization', 'Global illumination'],
    ['GPU acceleration', 'Memory optimization', 'Batch processing'],
    ['Smart unwrapping', 'Seam detection', 'Texture atlas generation'],
    ['Fluid simulation', 'Smoke effects', 'Fire dynamics'],
    ['Collision detection', 'Rigid body dynamics', 'Soft body simulation'],
    ['Color wheels', 'LUT support', 'Histogram analysis']
  ]

  /**
   * 生成随机插件数据
   * @param count 生成插件数量，默认随机15-35个
   * @returns 插件信息数组
   */
  static generatePlugins(count?: number): PluginInfo[] {
    const pluginCount = count || (Math.floor(Math.random() * 20) + 15)
    const plugins: PluginInfo[] = []
    const usedNames = new Set<string>()

    for (let i = 0; i < pluginCount; i++) {
      let pluginName = this.getRandomItem(this.pluginNames)
      
      // 确保名称唯一
      let counter = 1
      while (usedNames.has(pluginName)) {
        pluginName = `${this.getRandomItem(this.pluginNames)} ${counter}`
        counter++
      }
      usedNames.add(pluginName)

      const plugin: PluginInfo = {
        id: `plugin-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${i}`,
        name: pluginName,
        version: this.generateVersion(),
        description: this.getRandomItem(this.descriptions),
        longDescription: this.generateLongDescription(),
        author: this.getRandomItem(this.authors),
        category: this.getRandomItem(this.categories),
        tags: this.generateTags(),
        rating: this.generateRating(),
        downloads: this.generateDownloads(),
        installed: Math.random() > 0.7, // 30% 已安装
        enabled: Math.random() > 0.5,
        installedAt: Math.random() > 0.7 ? this.generateInstallDate() : undefined,
        fileSize: this.generateFileSize(),
        features: this.getRandomItem(this.featuresList),
        image: Math.random() > 0.4 ? `https://picsum.photos/300/300?random=${i + Date.now()}` : undefined,
        requirements: this.generateRequirements()
      }
      
      plugins.push(plugin)
    }
    
    return plugins
  }

  /**
   * 生成版本号
   */
  private static generateVersion(): string {
    const major = Math.floor(Math.random() * 5) + 1
    const minor = Math.floor(Math.random() * 10)
    const patch = Math.floor(Math.random() * 10)
    return `${major}.${minor}.${patch}`
  }

  /**
   * 生成详细描述
   */
  private static generateLongDescription(): string {
    const baseDesc = this.getRandomItem(this.descriptions)
    const additions = [
      '这个插件提供了完整的解决方案，适合专业用户和初学者使用。',
      '包含详细的文档和示例文件。',
      '支持多种工作流程和自定义配置。',
      '经过大量测试，确保稳定性和性能。',
      '定期更新，持续改进功能和修复问题。'
    ]
    return `${baseDesc} ${this.getRandomItem(additions)}`
  }

  /**
   * 生成标签
   */
  private static generateTags(): string[] {
    const allTags = ['tools', 'professional', 'beginner', 'advanced', 'creative', 'utility', 'workflow', 'optimization']
    const tagCount = Math.floor(Math.random() * 3) + 2 // 2-4个标签
    const selectedTags: string[] = []

    for (let i = 0; i < tagCount; i++) {
      const tag = this.getRandomItem(allTags)
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag)
      }
    }

    return selectedTags
  }

  /**
   * 生成评分
   */
  private static generateRating(): number {
    return Math.round((Math.random() * 2 + 3) * 10) / 10 // 3.0-5.0
  }

  /**
   * 生成下载次数
   */
  private static generateDownloads(): number {
    return Math.floor(Math.random() * 10000) + 50
  }

  /**
   * 生成安装日期
   */
  private static generateInstallDate(): string {
    const now = Date.now()
    const randomPast = now - Math.random() * 90 * 24 * 60 * 60 * 1000 // 过去90天内
    return new Date(randomPast).toISOString()
  }

  /**
   * 生成文件大小
   */
  private static generateFileSize(): number {
    return Math.floor(Math.random() * 100000000) + 1000000 // 1MB-100MB
  }

  /**
   * 生成系统要求
   */
  private static generateRequirements(): string {
    const systems = ['Blender 3.0+', 'Maya 2022+', '3ds Max 2021+', 'Cinema 4D R23+']
    const memory = ['4GB RAM', '8GB RAM', '16GB RAM']
    const system = this.getRandomItem(systems)
    const mem = this.getRandomItem(memory)
    return `${system}, ${mem}`
  }

  /**
   * 获取随机数组元素
   */
  private static getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }
}
