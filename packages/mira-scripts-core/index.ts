#!/usr/bin/env ts-node
import * as path from 'path';
import { spawn } from 'child_process';

/**
 * Mira Tools - 图书馆数据处理工具集
 * 
 * 这个工具集包含以下脚本：
 * 1. convertLibraryData - 从源数据库转换数据到目标目录
 * 2. pathFilesToLibrary - 将文件路径导入到图书馆数据库
 */

interface ScriptInfo {
  name: string;
  description: string;
  script: string;
  examples: string[];
}

const scripts: Record<string, ScriptInfo> = {
  'convert': {
    name: '数据库转换工具',
    description: '从源SQLite数据库转换数据到目标目录，支持文件夹和标签过滤',
    script: 'scripts/convertLibraryData.ts',
    examples: [
      'npm run script convert -- --sourceDbPath=source.db --targetDir=./target',
      'npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetFolders=1,2,3',
      'npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetTags=5,6 --importType=move'
    ]
  },
  'import': {
    name: '文件导入工具',
    description: '将指定路径的文件导入到图书馆数据库中',
    script: 'scripts/pathFilesToLibrary.ts',
    examples: [
      'npm run script import -- --source=./files --target=library.db',
      'npm run script import -- --source=/path/to/files --target=library.db --importType=move',
      'npm run script import -- --source=./documents --maxFolderDepth=3'
    ]
  }
};

function showUsage() {
  console.log(`
🔧 Mira Tools - 图书馆数据处理工具集

使用方法:
  npm run script <command> [options]
  
或者直接使用 ts-node:
  ts-node index.ts <command> [options]

可用命令:
`);

  Object.entries(scripts).forEach(([cmd, info]) => {
    console.log(`  ${cmd.padEnd(10)} ${info.name}`);
    console.log(`             ${info.description}`);
    console.log('');
  });

  console.log(`输入 'npm run script <command> --help' 查看具体命令的详细用法\n`);
}

function showScriptHelp(scriptName: string) {
  const script = scripts[scriptName];
  if (!script) {
    console.error(`❌ 未知命令: ${scriptName}`);
    showUsage();
    return;
  }

  console.log(`
📖 ${script.name}

描述: ${script.description}

使用示例:
`);

  script.examples.forEach(example => {
    console.log(`  ${example}`);
  });

  console.log(`
获取更多帮助:
  ts-node ${script.script} --help
`);
}

async function runScript(scriptName: string, args: string[]) {
  const script = scripts[scriptName];
  if (!script) {
    console.error(`❌ 未知命令: ${scriptName}`);
    showUsage();
    process.exit(1);
  }

  const scriptPath = path.join(__dirname, script.script);
  console.log(`🚀 执行脚本: ${script.name}`);
  console.log(`📄 脚本路径: ${scriptPath}\n`);

  const child = spawn('ts-node', [scriptPath, ...args], {
    stdio: 'inherit',
    shell: true
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ 脚本执行完成`);
    } else {
      console.log(`\n❌ 脚本执行失败，退出码: ${code}`);
      process.exit(code || 1);
    }
  });

  child.on('error', (error) => {
    console.error(`❌ 执行脚本时发生错误: ${error.message}`);
    process.exit(1);
  });
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showUsage();
    return;
  }

  const command = args[0];
  const scriptArgs = args.slice(1);

  // 检查是否请求特定命令的帮助
  if (scriptArgs.includes('--help') || scriptArgs.includes('-h')) {
    showScriptHelp(command);
    return;
  }

  // 执行指定的脚本
  await runScript(command, scriptArgs);
}

// 如果是直接执行此文件
if (require.main === module) {
  main().catch(console.error);
}

export { scripts, runScript, showUsage, showScriptHelp };
