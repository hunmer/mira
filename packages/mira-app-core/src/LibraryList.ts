const fs = require('fs').promises;
const path = require('path');

/**
 * 获取目录下的librarys.json文件内容
 * @param dirPath 目录路径
 * @returns 返回解析后的JSON对象
 * @throws 当文件不存在或JSON解析失败时抛出错误
 */
async function getLibraries(dirPath: string = './'): Promise<any> {
    console.log(`Getting libraries from ${dirPath}`);
    try {
        const filePath = path.join(dirPath, 'librarys.json');
        try {
            await fs.access(filePath);
        } catch {
            await fs.writeFile(filePath, '[]', 'utf8');
        }
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        return [];
    }
}

/**
 * 保存librarys.json文件内容
 * @param dirPath 目录路径
 * @param libraries 要保存的JSON对象
 * @returns Promise<void>
 * @throws 当写入文件失败时抛出错误
 */
async function saveLibraries(dirPath: string = './', libraries: any): Promise<void> {
    console.log(`Saving libraries to ${dirPath}`);
    try {
        const filePath = path.join(dirPath, 'librarys.json');
        const data = JSON.stringify(libraries, null, 2);
        await fs.writeFile(filePath, data, 'utf8');
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export { getLibraries, saveLibraries }