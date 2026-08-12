// 为绕过 next/image 直接引用 public 资源的路径(<img src>、url() 等)
// 补上 next.config.ts 中配置的 basePath 前缀。
// next/image / next/link 会自动加 basePath,无需此函数。
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
