import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { pathToFileURL } from 'url';
import { promisify } from 'util';

const PLUGIN_NAME = 'mira_pag_format';
const MAX_RENDER_SIZE = 512;
const webPath = path.join(__dirname, '..', 'web');
const wasmPath = path.join(webPath, 'pag.wasm');
const execFileAsync = promisify(execFile);

async function loadMetadata(filePath: string): Promise<{ width: number; height: number; duration: number }> {
  const browser = await findBrowser();
  const viewerUrl = new URL(pathToFileURL(path.join(webPath, 'metadata.html')).href);
  viewerUrl.searchParams.set('fileUrl', pathToFileURL(filePath).href);
  const { stdout } = await execFileAsync(browser, [
    '--headless=new', '--disable-gpu-sandbox', '--no-first-run', '--no-default-browser-check',
    '--allow-file-access-from-files', '--virtual-time-budget=5000', '--dump-dom', viewerUrl.href,
  ], { timeout: 30000, windowsHide: true, maxBuffer: 1024 * 1024 });
  const match = stdout.match(/<title>MIRA_PAG:([^<]+)<\/title>/);
  if (!match) throw new Error('PAG metadata renderer did not return metadata');
  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
}

async function renderThumbnail(srcPath: string, destPath: string): Promise<void> {
  const browser = await findBrowser();
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mira-pag-'));
  const screenshot = path.join(tempDir, 'thumbnail.png');
  const viewerUrl = new URL(pathToFileURL(path.join(webPath, 'thumbnail.html')).href);
  viewerUrl.searchParams.set('fileUrl', pathToFileURL(srcPath).href);
  try {
    await execFileAsync(browser, [
      '--headless=new', '--disable-gpu-sandbox', '--no-first-run', '--no-default-browser-check',
      '--allow-file-access-from-files', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=5000',
      `--window-size=${MAX_RENDER_SIZE},${MAX_RENDER_SIZE}`, `--screenshot=${screenshot}`, viewerUrl.href,
    ], { timeout: 30000, windowsHide: true });
    const stat = await fs.promises.stat(screenshot);
    if (!stat.size) throw new Error('PAG thumbnail renderer produced an empty image');
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.copyFile(screenshot, destPath);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

async function findBrowser(): Promise<string> {
  const candidates = [
    process.env.PAG_BROWSER_PATH,
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined,
    process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined,
    process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined,
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    try { await fs.promises.access(candidate, fs.constants.X_OK); return candidate; } catch {}
  }
  throw new Error('PAG thumbnail rendering requires Chrome/Chromium; set PAG_BROWSER_PATH');
}

class MiraPagFormatPlugin {
  private unregister?: () => void;
  constructor(inst: any) {
    this.unregister = inst.pluginManager.registerFileFormat(PLUGIN_NAME, {
      id: PLUGIN_NAME,
      extensions: ['pag'],
      mimeTypes: ['application/x-pag'],
      thumbnailExtensions: ['pag'],
      process: async (filePath: string, context: Record<string, any> = {}) => ({ format: 'pag', size: (await fs.promises.stat(filePath)).size, ...(await loadMetadata(filePath)), ...context }),
      thumbnail: renderThumbnail,
      viewers: [{
        viewerId: 'mira-pag',
        title: 'PAG 预览',
        icon: 'animation',
        entry: 'viewer.html',
        getQuery: ({ fileUrl, file }: any) => ({ fileUrl, fileName: file?.name || 'PAG' }),
      }],
    });
  }
  cleanup() { this.unregister?.(); this.unregister = undefined; }
}

export function init(inst: any) { return new MiraPagFormatPlugin(inst); }
export const testables = { loadMetadata, renderThumbnail };
