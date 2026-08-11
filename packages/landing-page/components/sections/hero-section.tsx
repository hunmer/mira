"use client";
import { ArrowRightIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>["className"];
  children: ReactNode;
};

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return children;
  }

  return (
    <motion.div
      className={className}
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      transition={{ delay, duration: 0.8 }}
      viewport={{ once: true }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}

export function HeroSection() {
  const { t } = useI18n();

  return (
    <section className="relative mx-auto w-full max-w-5xl overflow-hidden lg:border-x">
      {/* 背景网格 */}
      <GridPattern
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full stroke-foreground/10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
        height={40}
        width={40}
        x={5}
      />

      {/* 四角加号装饰 */}
      <PlusIcon
        aria-hidden="true"
        className="absolute top-[-12.5px] left-[-11.5px] z-1 size-6"
        strokeWidth={1}
      />
      <PlusIcon
        aria-hidden="true"
        className="absolute top-[-12.5px] right-[-11.5px] z-1 size-6"
        strokeWidth={1}
      />
      <PlusIcon
        aria-hidden="true"
        className="absolute bottom-[-12.5px] left-[-11.5px] z-1 size-6"
        strokeWidth={1}
      />
      <PlusIcon
        aria-hidden="true"
        className="absolute right-[-11.5px] bottom-[-12.5px] z-1 size-6"
        strokeWidth={1}
      />

      {/* 中心顶部径向高光 */}
      <div
        aria-hidden="true"
        className="-z-10 absolute inset-x-0 top-0 h-64 bg-[radial-gradient(40%_100%_at_50%_0%,theme(backgroundColor.white/8%),transparent)]"
      />

      <div className="flex flex-col items-center gap-6 px-4 pt-24 pb-20 text-center md:pt-32 md:pb-28">
        {/* 徽章 */}
        <AnimatedContainer delay={0.05}>
          <a
            href="#"
            className="group inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm shadow backdrop-blur-sm transition-colors hover:bg-accent"
          >
            <SparklesIcon className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{t.hero.badge}</span>
            <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </a>
        </AnimatedContainer>

        {/* 主标题 */}
        <AnimatedContainer delay={0.15}>
          <h1 className="text-balance font-bold font-heading text-5xl tracking-tight md:text-7xl">
            {t.hero.titleLead}{" "}
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {t.hero.titleHighlight}
            </span>
          </h1>
        </AnimatedContainer>

        {/* 副标题 */}
        <AnimatedContainer delay={0.25}>
          <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            {t.hero.subtitle}
          </p>
        </AnimatedContainer>

        {/* CTA 按钮组 */}
        <AnimatedContainer delay={0.35}>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" className="group">
              {t.hero.ctaPrimary}
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline">
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </AnimatedContainer>

        {/* 微提示 */}
        <AnimatedContainer delay={0.45}>
          <p className="text-muted-foreground text-xs">{t.hero.hint}</p>
        </AnimatedContainer>
      </div>

      {/* 底部虚线分割 */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto h-px w-1/3 bg-border",
          "[mask-image:linear-gradient(to_right,transparent,black,transparent)]"
        )}
      />
    </section>
  );
}
