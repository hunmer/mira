# 测试与质量

## 测试命令

- `pnpm --filter mira-browser-extension test` → `vitest run`(单次)
- `pnpm --filter mira-browser-extension test:watch` → watch
- 配置:`vitest.config.ts`,**environment: node**(纯逻辑测试,无 DOM),别名 `@ → ./src`,include `src/**/*.test.ts`

## 覆盖情况

**8 个测试文件,42 个用例,全绿**。覆盖纯逻辑层(shared + 部分 background/content/offscreen),**不覆盖** Chrome API / Vue UI / 跨上下文(无法自动化)。

| 测试文件 | 用例数 | 覆盖 |
|----------|--------|------|
| `shared/staged-file.test.ts` | 8 | fileToStaged/stagedToFile/normalizeBytes(**含类数组对象回归**)、bufferToDataUrl、dataUrlToBlob |
| `shared/messages.test.ts` | 5 | isRequest/isContentCommand/isEvent 类型守卫 |
| `shared/storage.test.ts` | 5 | loadSettings/saveSettings 合并默认值、session |
| `background/uploader.test.ts` | 6 | enqueue/并发/重试/取消/idle |
| `background/mira-client.test.ts` | 4 | ensureClient/login/withAuth/autoRelogin |
| `content/sniffer.test.ts` | 9 | urlToId/extractFromDOM/dedupe/merge/createSniffer |
| `content/autoscroll.test.ts` | 3 | 滚动到位/到底停止/帧上限 |
| `offscreen/image-ops.test.ts` | 2 | computeStitchSize/scaleRect(纯函数) |

## 类型检查 / Lint

- 类型检查:`vue-tsc --noEmit`(build 和 type-check 都跑),strict 模式
- **无 ESLint/Prettier 配置**(本包内);格式靠编辑器/linter hook
- build 流程已含类型检查(`vue-tsc --noEmit && vite build`),类型不过无法构建

## 质量风险

1. **跨上下文序列化**:无自动化测试覆盖(需真实 Chrome),靠 `staged-file.test.ts` 的形态覆盖 + 手动验证。曾连续踩 ArrayBuffer→{}、Uint8Array→类数组对象两个坑。
2. **MV3 限制无测试**:offscreen reason、CSP(eval 禁令)、content script 注入时机 —— 全靠手动验证(README 清单)。
3. **maxurl 体积**:`public/maxurl.user.js` 7.2MB,增大扩展体积(离线优先,可接受)。
4. **SW 回收**:模块级状态不持久,测试不覆盖「SW 重启后恢复」场景。
5. **无 E2E**:Chrome 扩展 E2E(puppeteer + 扩展加载)未配置。

## 测试约定

- 纯函数 + 类型守卫优先测;DOM/Chrome API 用 mock 或留手动。
- 加新跨上下文序列化路径,必须在 `staged-file.test.ts` 补**全部到达形态**的回归(number[]/Uint8Array/类数组对象)。
- 加新消息类型,在 `messages.test.ts` 补守卫用例。

## 手动验证门

Chrome API/UI 无法自动化,`README.md` 的「手动验证清单」是验收门(连接/上传/截图/嗅探/高清升级/界面偏好/自动滚动)。
