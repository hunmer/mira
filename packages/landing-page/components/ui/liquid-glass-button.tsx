"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LiquidGlassButton：液态玻璃质感按钮。
 * - 多层背景：半透明白 + 径向高光 + 内描边光
 * - backdrop-blur 实现毛玻璃
 * - hover 时光斑位移，呈现"流动"感
 */
const liquidButtonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium text-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-10 px-6 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidButtonVariants> {
  asChild?: boolean;
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          liquidButtonVariants({ size }),
          // 玻璃底
          "border border-white/15 bg-white/5 backdrop-blur-md",
          // 内描边光（顶部高光）
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),inset_0_-1px_0_0_rgba(255,255,255,0.05)]",
          // hover 流光
          "hover:border-white/30 hover:bg-white/10",
          "before:pointer-events-none before:absolute before:inset-0",
          // 顶部斜向高光带
          "before:bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)]",
          "before:translate-x-[-120%] before:transition-transform before:duration-700",
          "hover:before:translate-x-[120%]",
          className
        )}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          {children}
        </span>
      </Comp>
    );
  }
);
LiquidButton.displayName = "LiquidButton";

export { liquidButtonVariants };
