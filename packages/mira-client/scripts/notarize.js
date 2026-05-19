#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Starting code signing and notarization...\n');

// 配置
const NOTARIZE_CONFIG = {
  appId: 'com.mira.desktop',
  appPath: '',
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_ID_PASSWORD,
  teamId: process.env.APPLE_TEAM_ID,
  ascProvider: process.env.ASC_PROVIDER
};

// 检查是否为 macOS 构建
function shouldNotarize() {
  return process.platform === 'darwin' && process.env.CI === 'true';
}

function getTargetPlatform(context) {
  return context?.electronPlatformName || process.platform;
}

// 查找应用路径
function findAppPath(context) {
  if (context && context.appOutDir) {
    const appName = context.packager.appInfo.productFilename;
    return path.join(context.appOutDir, `${appName}.app`);
  }
  
  // 回退方案
  const buildDir = 'build';
  const macDir = path.join(buildDir, 'mac');
  
  if (fs.existsSync(macDir)) {
    const items = fs.readdirSync(macDir);
    const appDir = items.find(item => item.endsWith('.app'));
    if (appDir) {
      return path.join(macDir, appDir);
    }
  }
  
  return null;
}

// 验证签名
function verifySignature(appPath) {
  console.log('✅ Verifying code signature...');
  
  try {
    const result = execSync(`codesign --verify --deep --strict --verbose=2 "${appPath}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('   ✓ Code signature verification passed');
    return true;
  } catch (error) {
    console.error('   ❌ Code signature verification failed:');
    console.error(error.stdout || error.message);
    return false;
  }
}

// 执行公证
async function notarizeApp(appPath) {
  console.log('📋 Submitting app for notarization...');
  
  // 检查必需的环境变量
  const requiredEnvVars = ['APPLE_ID', 'APPLE_ID_PASSWORD', 'APPLE_TEAM_ID'];
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    console.log(`   ⚠️  Skipping notarization - missing environment variables: ${missingVars.join(', ')}`);
    return true;
  }
  
  try {
    // 创建临时配置文件
    const notarizeConfig = {
      appPath,
      appleId: NOTARIZE_CONFIG.appleId,
      appleIdPassword: NOTARIZE_CONFIG.appleIdPassword,
      teamId: NOTARIZE_CONFIG.teamId
    };
    
    // 使用 notarytool (Xcode 13+)
    console.log('   📤 Uploading to Apple notary service...');
    
    const uploadCmd = [
      'xcrun notarytool submit',
      `"${appPath}"`,
      `--apple-id "${notarizeConfig.appleId}"`,
      `--password "${notarizeConfig.appleIdPassword}"`,
      `--team-id "${notarizeConfig.teamId}"`,
      '--wait',
      '--timeout 30m'
    ].join(' ');
    
    const uploadResult = execSync(uploadCmd, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30 * 60 * 1000 // 30 minutes
    });
    
    console.log('   ✓ App uploaded and processed successfully');
    
    // 装订公证票据
    console.log('   📎 Stapling notarization ticket...');
    
    execSync(`xcrun stapler staple "${appPath}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('   ✓ Notarization ticket stapled successfully');
    
    // 验证公证
    console.log('   🔍 Verifying notarization...');
    
    execSync(`xcrun stapler validate "${appPath}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('   ✓ Notarization verification passed');
    
    return true;
    
  } catch (error) {
    console.error('   ❌ Notarization failed:');
    console.error(error.stdout || error.message);
    
    // 如果是 CI 环境，公证失败应该导致构建失败
    if (process.env.CI === 'true') {
      return false;
    } else {
      console.log('   ⚠️  Continuing despite notarization failure (not in CI)');
      return true;
    }
  }
}

// Windows 代码签名
async function signWindowsApp(appPath) {
  console.log('🪟 Signing Windows application...');
  
  const signtoolPath = process.env.SIGNTOOL_PATH || 'signtool';
  const certificatePath = process.env.CSC_LINK;
  const certificatePassword = process.env.CSC_KEY_PASSWORD;
  
  if (!certificatePath) {
    console.log('   ⚠️  Skipping Windows signing - no certificate specified');
    return true;
  }
  
  try {
    // 查找可执行文件
    const executablePath = path.join(appPath, 'Mira Media Library.exe');
    
    if (!fs.existsSync(executablePath)) {
      console.error(`   ❌ Executable not found: ${executablePath}`);
      return false;
    }
    
    // 构建签名命令
    const signCmd = [
      signtoolPath,
      'sign',
      '/f', `"${certificatePath}"`,
      certificatePassword ? `/p "${certificatePassword}"` : '',
      '/t http://timestamp.comodoca.com',
      '/d "Mira Media Library"',
      '/du "https://mira.com"',
      `"${executablePath}"`
    ].filter(Boolean).join(' ');
    
    console.log('   ✍️  Signing executable...');
    
    execSync(signCmd, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('   ✓ Windows application signed successfully');
    
    // 验证签名
    const verifyCmd = `${signtoolPath} verify /pa "${executablePath}"`;
    execSync(verifyCmd, { encoding: 'utf8', stdio: 'pipe' });
    
    console.log('   ✓ Windows signature verification passed');
    
    return true;
    
  } catch (error) {
    console.error('   ❌ Windows signing failed:');
    console.error(error.stdout || error.message);
    return false;
  }
}

// 主函数
async function main(context) {
  console.log('Processing code signing and notarization...\n');
  
  try {
    const targetPlatform = getTargetPlatform(context);
    if (targetPlatform !== 'darwin') {
      console.log(`Skipping notarization for ${targetPlatform}`);
      return;
    }

    // 确定应用路径
    let appPath;
    if (context) {
      appPath = findAppPath(context);
      NOTARIZE_CONFIG.appPath = appPath;
    } else {
      // 命令行调用
      appPath = process.argv[2];
    }
    
    if (!appPath || !fs.existsSync(appPath)) {
      console.error('❌ App path not found or does not exist');
      process.exit(1);
    }
    
    console.log(`App path: ${appPath}`);
    console.log(`Platform: ${process.platform}\n`);
    
    let success = true;
    
    // 根据平台执行相应的签名和公证
    switch (process.platform) {
      case 'darwin':
        // macOS: 验证签名并公证
        const signatureValid = verifySignature(appPath);
        if (!signatureValid) {
          success = false;
          break;
        }
        
        if (shouldNotarize()) {
          const notarized = await notarizeApp(appPath);
          if (!notarized) {
            success = false;
          }
        } else {
          console.log('⚠️  Skipping notarization (not in CI environment)');
        }
        break;
        
      case 'win32':
        // Windows: 代码签名
        const signed = await signWindowsApp(appPath);
        if (!signed) {
          success = false;
        }
        break;
        
      default:
        console.log(`ℹ️  No signing/notarization required for ${process.platform}`);
        break;
    }
    
    if (success) {
      console.log('\n🎉 Code signing and notarization completed successfully!');
    } else {
      console.error('\n❌ Code signing and notarization failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Signing/notarization process failed:', error.message);
    process.exit(1);
  }
}

// 导出主函数供 electron-builder 使用
module.exports = main;

// 如果直接运行脚本
if (require.main === module) {
  main();
}
