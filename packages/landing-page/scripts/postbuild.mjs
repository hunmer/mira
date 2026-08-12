// Next.js 静态导出 (output: "export") 固定输出到 out/ 目录,无法配置。
// 这里在 build 后把 out/ 重命名为 introduction/,配合 basePath: "/introduction"
// 部署时整个 introduction/ 目录放到服务器的 /introduction/ 路径下。
import { existsSync, renameSync, rmSync } from "node:fs";

if (existsSync("introduction")) {
	rmSync("introduction", { recursive: true, force: true });
}

if (existsSync("out")) {
	renameSync("out", "introduction");
	console.log("✓ build output moved to ./introduction");
} else {
	console.warn("⚠ out/ not found, skipping move");
}
