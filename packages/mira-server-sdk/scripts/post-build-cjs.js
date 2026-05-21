const fs = require('fs');
const path = require('path');

// 复制 CJS 版本到主 dist 目录
function copyFiles() {
    const cjsDir = path.join(__dirname, '..', 'dist-cjs');
    const distDir = path.join(__dirname, '..', 'dist');
    
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    // 复制主文件为 .cjs 扩展名
    const indexJs = path.join(cjsDir, 'index.js');
    const indexCjs = path.join(distDir, 'index.cjs');
    
    if (fs.existsSync(indexJs)) {
        fs.copyFileSync(indexJs, indexCjs);
        console.log('Copied index.js to index.cjs');
    }
    
    // 复制所有其他 .js 文件为 .cjs
    function copyJsToCjs(dir, targetDir) {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const targetPath = path.join(targetDir, file);
            
            if (fs.statSync(filePath).isDirectory()) {
                if (!fs.existsSync(targetPath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                }
                copyJsToCjs(filePath, targetPath);
            } else if (file.endsWith('.js')) {
                const cjsName = file.replace('.js', '.cjs');
                const cjsPath = path.join(targetDir, cjsName);
                fs.copyFileSync(filePath, cjsPath);
            }
        });
    }
    
    copyJsToCjs(cjsDir, distDir);
}

copyFiles();
