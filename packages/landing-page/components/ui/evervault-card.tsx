"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 生成长度为 length 的随机字符串（字符集：字母+数字） */
function randomChars(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return out;
}

interface CardPatternProps {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  randomString: string;
}

/** 背景层：跟随鼠标的圆形高亮区显示 randomString + 渐变 */
function CardPattern({ mouseX, mouseY, randomString }: CardPatternProps) {
  const mask = useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`;
  const style = { maskImage: mask, WebkitMaskImage: mask };
  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl [mask-image:linear-gradient(white,transparent)] group-hover/card:opacity-50" />
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500 to-blue-700 opacity-0 backdrop-blur-xl transition duration-500 group-hover/card:opacity-100"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay transition duration-500 group-hover/card:opacity-100"
        style={style}
      >
        <p className="absolute inset-x-0 h-full break-words whitespace-pre-wrap text-white font-mono font-bold text-xs transition duration-500">
          {randomString}
        </p>
      </motion.div>
    </div>
  );
}

export interface EvervaultCardProps {
  /** 中心圆显示的文字，默认 "hover" */
  text?: string;
  className?: string;
}

/**
 * Evervault Card
 *
 * 鼠标在卡片上移动时，跟随光标的圆形区域显现随机字符背景 + 渐变高光。
 * 还原自 21st.dev bundle #858。
 */
function EvervaultCard({ text = "hover", className }: EvervaultCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [randomString, setRandomString] = useState("");

  useEffect(() => {
    setRandomString(randomChars(1500));
  }, []);

  function onMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
    setRandomString(randomChars(1500));
  }

  return (
    <div
      className={cn(
        "relative flex aspect-square h-full w-full items-center justify-center bg-transparent p-0.5",
        className,
      )}
    >
      <div
        onMouseMove={onMouseMove}
        className="group/card relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-transparent"
      >
        <CardPattern mouseX={mouseX} mouseY={mouseY} randomString={randomString} />
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative flex h-44 w-44 items-center justify-center rounded-full text-4xl font-bold text-white">
            <div className="absolute h-full w-full rounded-full bg-white/80 blur-sm dark:bg-black/80" />
            <span className="z-20 text-black dark:text-white">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EvervaultCard;
