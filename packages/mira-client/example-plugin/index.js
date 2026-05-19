/**
 * 示例插件
 * 演示Mira本地插件系统的基本功能
 */

// 插件初始化函数
async function initialize(context) {
  const { api } = context

  api.log.info('示例插件初始化开始')

  // 读取配置
  const exampleSetting = api.config.get('exampleSetting')
  const enableLogging = api.config.get('enableLogging')

  if (enableLogging) {
    api.log.info(`示例插件配置: exampleSetting=${exampleSetting}`)
  }

  // 监听事件
  api.events.on('fileOpened', (data) => {
    if (enableLogging) {
      api.log.info('检测到文件打开事件', data)
    }
  })

  api.events.on('fileSelected', (data) => {
    if (enableLogging) {
      api.log.info('检测到文件选择事件', data)
    }
  })

  // 显示初始化通知
  api.ui.showNotification('示例插件已成功初始化', 'success')

  api.log.info('示例插件初始化完成')
}

// 清理函数
async function cleanup() {
  console.log('示例插件正在清理资源...')
}

// 显示示例对话框
async function showExample(context) {
  const { api } = context

  const result = await api.ui.showDialog({
    title: '示例插件',
    message: '这是来自示例插件的消息！\n\n功能演示：\n- 插件配置管理\n- 事件监听\n- UI交互\n- 日志记录',
    type: 'info'
  })

  api.log.info('用户点击了示例对话框', { result })

  return result
}

// 获取插件状态
function getStatus() {
  return {
    name: '示例插件',
    version: '1.0.0',
    status: 'running',
    uptime: Date.now()
  }
}

// 导出插件接口
module.exports = {
  initialize,
  cleanup,
  showExample,
  getStatus
}