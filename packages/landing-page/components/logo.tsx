import Image from "next/image";
import type React from "react";
import { withBasePath } from "@/lib/asset";
import { cn } from "@/lib/utils";

type LogoProps = Omit<
  React.ComponentProps<typeof Image>,
  "src" | "alt" | "width" | "height"
> & {
  alt?: string;
};

/**
 * 站点 Logo，使用 public/icon.png (32×32 正方形)。
 * 高度由 className（如 h-4.5）控制，宽度按比例自动等比缩放。
 */
export const Logo = ({ alt = "Mira", className, ...props }: LogoProps) => (
  <Image
    alt={alt}
    // 默认让宽度跟随高度等比缩放，调用方可通过 className 覆盖
    className={cn("h-auto w-auto", className)}
    src={withBasePath("/icon.png")}
    width={32}
    height={32}
    {...props}
  />
);

// 保留旧导出名（部分示例代码引用），等价于 Logo
export const LogoIcon = Logo;
