import type { NextConfig } from "next";

// 单一来源:既供 Next.js basePath 使用,也通过 env 暴露给运行时代码,
// 用于给绕过 next/image 的硬编码资源路径(<img>/url() 等)补前缀。
const basePath = "/introduction";

const nextConfig: NextConfig = {
  // 静态导出,build 产物输出到 out/ 目录,适合 CDN/Nginx 等纯静态托管
  output: "export",
  // 部署到子路径 /introduction/ 下
  basePath,
  // 把 basePath 暴露为 NEXT_PUBLIC_BASE_PATH,供 withBasePath() 使用
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // 静态导出没有服务端图片优化器,关闭后直接用原图
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
