"use client";

import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

export interface IrisLensCardProps {
  /** 卡片内容 */
  children?: ReactNode;
  /** 最大倾斜角度（度），默认 16 */
  tilt?: number;
  /** 内容层 translateZ 深度（px），默认 26，最小会被钳制到 10 */
  contentDepth?: number;
  /** 透镜高光强度 0-1，默认 1 */
  lensStrength?: number;
  /** 是否显示全息边缘，默认 true */
  holoEdge?: boolean;
  /** 高度类，默认 "h-[320px]" */
  heightClass?: string;
  /** 圆角类，默认 "rounded-2xl" */
  radiusClass?: string;
  className?: string;
}

/**
 * Iris Lens Card
 *
 * 光滑的、跟随光标移动的高光 + 光谱脊纹玻璃卡片，鼠标移动时产生 3D 倾斜。
 * 还原自 21st.dev @ruixen.ui 的 iris-lens-card。
 */
export default function IrisLensCard({
  className,
  children,
  tilt = 16,
  contentDepth = 26,
  lensStrength = 1,
  holoEdge = true,
  heightClass = "h-[320px]",
  radiusClass = "rounded-2xl",
  ...props
}: IrisLensCardProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // 鼠标归一化坐标（-0.5 ~ 0.5），当前未参与 transform，但保留以便扩展
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(0, { stiffness: 260, damping: 26, mass: 0.7 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 26, mass: 0.7 });

  const onMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      el.style.setProperty("--mx", `${(px * 100).toFixed(3)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(3)}%`);
      const dx = px - 0.5;
      const dy = py - 0.5;
      mx.set(dx);
      my.set(dy);
      if (!reduceMotion) {
        rotateX.set(-(dy * 2) * tilt);
        rotateY.set(dx * 2 * tilt);
      }
    },
    [mx, my, rotateX, rotateY, reduceMotion, tilt],
  );

  const onLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
    rotateX.set(0);
    rotateY.set(0);
    const el = containerRef.current;
    if (el) {
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "50%");
    }
  }, [mx, my, rotateX, rotateY]);

  return (
    <div
      ref={containerRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("relative isolate w-full [perspective:1200px]", className)}
      style={
        {
          "--mx": "50%",
          "--my": "50%",
          "--lens-alpha": String(Math.max(0, Math.min(1, lensStrength))),
        } as CSSProperties
      }
      {...props}
    >
      <motion.div
        className={cn("relative w-full", heightClass, radiusClass)}
        style={{ transformStyle: "preserve-3d", rotateX, rotateY }}
      >
        {/* 卡片底层（玻璃质感） */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            radiusClass,
            "border border-white/15 bg-white/8 backdrop-blur-2xl",
            "shadow-[0_14px_60px_-18px_rgba(0,0,0,0.45)]",
            "dark:border-white/10 dark:bg-white/5",
          )}
          style={{ transform: "translateZ(0px)" }}
        >
          {/* 暗角渐变 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 120% at 50% 38%, transparent 45%, rgba(0,0,0,0.16))",
            }}
          />

          {/* 透镜高光层：跟随光标的液态高光 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-15%] mix-blend-screen opacity-[calc(0.55*var(--lens-alpha))]"
            style={{
              background: `
                radial-gradient(420px 300px at var(--mx) var(--my), rgba(255,255,255,0.26), rgba(255,255,255,0.06) 45%, transparent 65%),
                radial-gradient(220px 160px at calc(var(--mx) + 6%) calc(var(--my) + 2%), rgba(255,255,255,0.16), rgba(255,255,255,0.04) 48%, transparent 68%),
                radial-gradient(160px 120px at calc(var(--mx) - 8%) calc(var(--my) - 4%), rgba(255,255,255,0.18), rgba(255,255,255,0.04) 50%, transparent 72%)
              `,
              transform: "translateZ(14px)",
              filter: "saturate(1.2) contrast(1.05)",
            }}
          />

          {/* 光谱脊纹：以光标为中心的放射条纹 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-8%] mix-blend-screen opacity-[calc(0.35*var(--lens-alpha))]"
            style={{
              background: `
                repeating-conic-gradient(
                  from 0deg at var(--mx) var(--my),
                  rgba(255,255,255,0.14) 0deg 2deg,
                  rgba(255,255,255,0.00) 2deg 6deg
                )
              `,
              maskImage:
                "radial-gradient(90% 90% at var(--mx) var(--my), black 35%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(90% 90% at var(--mx) var(--my), black 35%, transparent 80%)",
              transform: "translateZ(18px)",
              filter: "blur(0.4px)",
            }}
          />

          {/* 全息边缘 */}
          {holoEdge && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-80"
              style={
                {
                  padding: 1,
                  borderRadius: "inherit",
                  background:
                    "conic-gradient(from 0deg at 50% 50%, #7dd3fc, #f0abfc, #a7f3d0, #7dd3fc)",
                  WebkitMask:
                    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  animation: "iris-lens-spin 14s linear infinite",
                } as CSSProperties
              }
            />
          )}
        </div>

        {/* 内容层 */}
        <div
          className={cn(
            "relative z-10 h-full w-full p-6",
            radiusClass,
            "[-webkit-font-smoothing:antialiased] [text-rendering:optimizeLegibility]",
          )}
          style={{
            transform: `translateZ(${Math.max(10, contentDepth)}px)`,
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
        >
          {children}
        </div>
      </motion.div>

      <style>{`
        @keyframes iris-lens-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
