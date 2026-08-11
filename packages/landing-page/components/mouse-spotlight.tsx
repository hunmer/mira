"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect } from "react";

/**
 * 全局鼠标跟随光效：固定定位的径向渐变层，跟随光标移动。
 * 双层设计——内层小光斑响应快，外层大光晕更慢，形成景深层次。
 * 使用 color-mix 基于前景色混色，明暗主题下都可见。
 */
export function MouseSpotlight() {
  const shouldReduceMotion = useReducedMotion();
  const mouseX = useMotionValue(-600);
  const mouseY = useMotionValue(-600);

  const spotX = useSpring(mouseX, { stiffness: 150, damping: 24, mass: 0.4 });
  const spotY = useSpring(mouseY, { stiffness: 150, damping: 24, mass: 0.4 });
  const haloX = useSpring(mouseX, { stiffness: 45, damping: 20 });
  const haloY = useSpring(mouseY, { stiffness: 45, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${spotX}px ${spotY}px, color-mix(in oklab, var(--foreground) 7%, transparent), transparent 70%)`;
  const halo = useMotionTemplate`radial-gradient(640px circle at ${haloX}px ${haloY}px, color-mix(in oklab, var(--foreground) 4%, transparent), transparent 75%)`;

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30"
        style={{ background: halo }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30"
        style={{ background: spotlight }}
      />
    </>
  );
}
