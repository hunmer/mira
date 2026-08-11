"use client";
import { ArrowRightIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

const MotionPlusIcon = motion.create(PlusIcon);

const titleContainerVariants: Variants = {
  hidden: {},
  show: {},
};

const charVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: "easeOut", delay },
  }),
};

const highlightVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut", delay: 0.55 },
  },
};

/** 将文本拆为逐字级联动画（按词分组避免英文单词被折断换行） */
function CascadeText({ text, baseDelay }: { text: string; baseDelay: number }) {
  const words = text.split(" ").map((word, wordIndex) => ({
    word,
    key: `word-${wordIndex}-${word}`,
    chars: Array.from(word).map((char, charIndex) => ({
      char,
      key: `char-${wordIndex}-${charIndex}-${char}`,
    })),
  }));

  let charCount = 0;

  return (
    <>
      {words.map(({ key, chars }, wordIndex) => (
        <span className="inline-block whitespace-nowrap" key={key}>
          {chars.map(({ char, key: charKey }) => {
            const delay = baseDelay + charCount * 0.03;
            charCount += 1;
            return (
              <motion.span
                className="inline-block"
                custom={delay}
                key={charKey}
                variants={charVariants}
              >
                {char}
              </motion.span>
            );
          })}
          {wordIndex < words.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </>
  );
}

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
  const shouldReduceMotion = useReducedMotion();

  const plusIconPositions = [
    "top-[-12.5px] left-[-11.5px]",
    "top-[-12.5px] right-[-11.5px]",
    "bottom-[-12.5px] left-[-11.5px]",
    "right-[-11.5px] bottom-[-12.5px]",
  ];

  return (
    <section className="relative mx-auto w-full max-w-5xl overflow-hidden lg:border-x">
      {/* 背景网格 */}
      <GridPattern
        aria-hidden="true"
        className="-z-10 absolute inset-0 h-full w-full stroke-foreground/10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
        height={40}
        width={40}
        x={5}
      />

      {/* 四角加号装饰：旋转 + 缩放入场 */}
      {plusIconPositions.map((position, index) => (
        <MotionPlusIcon
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          aria-hidden="true"
          className={cn("absolute z-1 size-6", position)}
          initial={
            shouldReduceMotion ? false : { opacity: 0, rotate: -90, scale: 0.5 }
          }
          key={position}
          strokeWidth={1}
          transition={{
            delay: 0.5 + index * 0.1,
            duration: 0.5,
            ease: "easeOut",
          }}
        />
      ))}

      {/* 中心顶部径向高光：呼吸脉冲 */}
      <motion.div
        animate={shouldReduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
        aria-hidden="true"
        className="-z-10 absolute inset-x-0 top-0 h-64 bg-[radial-gradient(40%_100%_at_50%_0%,theme(backgroundColor.white/8%),transparent)]"
        transition={{
          duration: 6,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <div className="flex flex-col items-center gap-6 px-4 pt-24 pb-20 text-center md:pt-32 md:pb-28">
        {/* 徽章 */}
        <AnimatedContainer delay={0.05}>
          <a
            className="group inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm shadow backdrop-blur-sm transition-colors hover:bg-accent"
            href="#"
          >
            <SparklesIcon className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{t.hero.badge}</span>
            <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </a>
        </AnimatedContainer>

        {/* 主标题：逐字级联入场（渐变高亮作为整体动画，避免变换破坏背景裁剪） */}
        {shouldReduceMotion ? (
          <h1 className="text-balance font-bold font-heading text-5xl tracking-tight md:text-7xl">
            {t.hero.titleLead}{" "}
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {t.hero.titleHighlight}
            </span>
          </h1>
        ) : (
          <motion.h1
            animate="show"
            className="text-balance font-bold font-heading text-5xl tracking-tight md:text-7xl"
            initial="hidden"
            variants={titleContainerVariants}
          >
            <CascadeText baseDelay={0.15} text={t.hero.titleLead} />{" "}
            <motion.span
              className="inline-block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
              variants={highlightVariants}
            >
              {t.hero.titleHighlight}
            </motion.span>
          </motion.h1>
        )}

        {/* 副标题 */}
        <AnimatedContainer delay={0.25}>
          <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            {t.hero.subtitle}
          </p>
        </AnimatedContainer>

        {/* CTA 按钮组：弹性 hover/tap 微交互 */}
        <AnimatedContainer delay={0.35}>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <motion.div
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            >
              <Button className="group" size="lg">
                {t.hero.ctaPrimary}
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </motion.div>
            <motion.div
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            >
              <Button size="lg" variant="outline">
                {t.hero.ctaSecondary}
              </Button>
            </motion.div>
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
