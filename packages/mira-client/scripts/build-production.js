const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const smbPath = '\\\\192.168.1.200\\web\\mira_client'

console.log('🚀 开始构建生产版本...\n')

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function forceRemove(dirPath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
        await sleep(500)
        return true
      }
      return true
    } catch (error) {
      if (i === retries - 1) throw error
      console.log(`  重试删除 (${i + 1}/${retries})...`)
      await sleep(1000)
    }
  }
}

async function safeRename(oldPath, newPath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(newPath)) {
        await forceRemove(newPath)
      }
      fs.renameSync(oldPath, newPath)
      await sleep(300)
      return true
    } catch (error) {
      if (i === retries - 1) {
        throw new Error(`无法重命名目录: ${error.message}`)
      }
      console.log(`  重试重命名 (${i + 1}/${retries})...`)
      await sleep(1000)
    }
  }
}

;(async () => {
  const buildPath = path.join(projectRoot, 'build')
  const nodeModulesPath = path.join(projectRoot, 'node_modules')
  const backupPath = path.join(projectRoot, 'node_modules.dev')

  try {
    // 1. 构建前端和主进程
    console.log('📦 步骤 1/5: 构建前端和主进程...')
    execSync('cnpm run build:prod', { stdio: 'inherit', cwd: projectRoot })

    // 2. 备份 node_modules，安装生产依赖
    console.log('\n💾 步骤 2/5: 切换生产依赖...')
    if (fs.existsSync(backupPath)) {
      console.log('  清理旧备份...')
      await forceRemove(backupPath)
    }

    if (fs.existsSync(nodeModulesPath)) {
      console.log('  备份 node_modules -> node_modules.dev')
      await safeRename(nodeModulesPath, backupPath)
    }

    console.log('  安装生产依赖...')
    execSync('cnpm install --prod', { stdio: 'inherit', cwd: projectRoot })

    // 3. 清理并执行 Electron 打包
    console.log('\n🔨 步骤 3/5: 打包 Electron 应用...')
    if (fs.existsSync(buildPath)) {
      await forceRemove(buildPath)
    }

    execSync('electron-builder --win --config electron-builder.json', {
      stdio: 'inherit',
      cwd: projectRoot
    })

    // 4. 恢复开发依赖
    console.log('\n🔄 步骤 4/5: 恢复开发依赖...')
    if (fs.existsSync(nodeModulesPath)) {
      await forceRemove(nodeModulesPath)
    }
    if (fs.existsSync(backupPath)) {
      await safeRename(backupPath, nodeModulesPath)
      console.log('  ✓ 开发依赖已恢复')
    }

    // 5. 复制到 SMB 更新服务器
    console.log('\n📤 步骤 5/5: 复制到更新服务器...')

    try {
      if (!fs.existsSync(smbPath)) {
        console.log(`  ⚠️  SMB 目录不可访问: ${smbPath}`)
        console.log('  跳过复制步骤')
      } else {
        // 清理远程旧文件
        const oldFiles = fs.readdirSync(smbPath).filter(file =>
          file.endsWith('.exe') || file.endsWith('.zip') || file.endsWith('.yml') || file.endsWith('.blockmap')
        )
        for (const file of oldFiles) {
          try {
            fs.unlinkSync(path.join(smbPath, file))
            console.log(`    已删除远程: ${file}`)
          } catch (e) {
            console.log(`    ⚠️ 无法删除 ${file}: ${e.message}`)
          }
        }

        // 复制新文件
        const releaseFiles = fs.readdirSync(buildPath).filter(file =>
          file.endsWith('.exe') || file.endsWith('.zip') || file.endsWith('.yml') || file.endsWith('.blockmap')
        )

        for (const file of releaseFiles) {
          console.log(`  复制 ${file}...`)
          fs.copyFileSync(path.join(buildPath, file), path.join(smbPath, file))
        }

        console.log(`\n✅ 已复制到更新服务器: ${smbPath}`)
      }
    } catch (smbError) {
      console.log(`  ⚠️  SMB 复制失败: ${smbError.message}`)
      console.log('  构建产物在本地 build/ 目录可用')
    }

    console.log('\n✅ 构建完成!')

  } catch (error) {
    console.error('\n❌ 构建失败:', error.message)

    // 恢复开发依赖
    if (fs.existsSync(backupPath) && !fs.existsSync(nodeModulesPath)) {
      console.log('🔄 恢复开发依赖...')
      try {
        await safeRename(backupPath, nodeModulesPath)
        console.log('✓ 已恢复')
      } catch (e) {
        console.error(`⚠️ 手动恢复: ren "${backupPath}" "node_modules"`)
      }
    }

    process.exit(1)
  }
})()
