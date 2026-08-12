"use client";
import { ArrowRightIcon, GithubIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/ui/grid-pattern";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

const MotionPlusIcon = motion.create(PlusIcon);

const DOCS_URL = "http://miraapp.cc/docs";
const RELEASE_URL = "https://github.com/hunmer/mira/releases";

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

      {/* 流光背景：亮色 multiply（白底染色可见），暗色 screen（发光叠加）。
          shader 背景透明，透明区域不参与混合，两种模式都不遮挡下层网格。 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 mix-blend-multiply dark:mix-blend-screen"
      >
        <WebGLShader className="absolute inset-0 block h-full w-full" />
      </div>

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
            href={DOCS_URL}
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
              <Button asChild className="group" size="lg">
                <a href={DOCS_URL}>
                  {t.hero.ctaPrimary}
                  <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
            </motion.div>
            <motion.div
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            >
              <Button asChild size="lg" variant="outline">
                <a href={DOCS_URL}>{t.hero.ctaSecondary}</a>
              </Button>
            </motion.div>
          </div>
        </AnimatedContainer>

        {/* 应用商店下载 */}
        <AnimatedContainer delay={0.4}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild className="h-11" variant="outline">
              <a href={RELEASE_URL}>
                <PlayStoreIcon className="size-5" />
                <div className="flex flex-col items-start justify-center pr-2 text-left">
                  <span className="font-light text-[10px] leading-none tracking-tighter">
                    GET IT ON
                  </span>
                  <p className="font-bold text-base leading-none">Google Play</p>
                </div>
              </a>
            </Button>
            <Button asChild className="h-11" variant="outline">
              <a href={RELEASE_URL}>
                <AppleIcon className="size-5" />
                <div className="flex flex-col items-start justify-center pr-2 text-left">
                  <span className="text-[10px] leading-none tracking-tighter">
                    Download on the
                  </span>
                  <p className="font-bold text-base leading-none">App Store</p>
                </div>
              </a>
            </Button>

            <Button asChild className="h-11" variant="outline">
              <a href={RELEASE_URL}>
                <GithubIcon className="size-5" />
                <div className="flex flex-col items-start justify-center pr-2 text-left">
                  <span className="font-light text-[10px] leading-none tracking-tighter">
                    DOWNLOAD FROM
                  </span>
                  <p className="font-bold text-base leading-none">
                    GitHub Release
                  </p>
                </div>
              </a>
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

function PlayStoreIcon({
  fill = "currentColor",
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg fill={fill} viewBox="0 0 24 24" {...props}>
      <path d="m21.762,9.942L4.67.378c-.721-.466-1.635-.504-2.393-.099-.768.411-1.246,1.208-1.246,2.08v19.282c0,.872.477,1.668,1.246,2.079.755.404,1.668.37,2.393-.098l17.092-9.564c.756-.423,1.207-1.192,1.207-2.058s-.451-1.635-1.207-2.058Zm-5.746-1.413l-2.36,2.36L5.302,2.534l10.714,5.995ZM2.604,21.906V2.094l9.941,9.906L2.604,21.906Zm2.698-.439l8.355-8.355,2.36,2.36-10.714,5.995Zm15.692-8.78l-3.552,1.987-2.674-2.674,2.674-2.674,3.552,1.987c.363.203.402.548.402.686s-.039.483-.402.686Z" />
    </svg>
  );
}

function AppleIcon({
  fill = "currentColor",
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg fill={fill} viewBox="0 0 24 24" {...props}>
      <g id="_Group_2">
        <g id="_Group_3">
          <path
            d="M18.546,12.763c0.024-1.87,1.004-3.597,2.597-4.576c-1.009-1.442-2.64-2.323-4.399-2.378    c-1.851-0.194-3.645,1.107-4.588,1.107c-0.961,0-2.413-1.088-3.977-1.056C6.122,5.927,4.25,7.068,3.249,8.867    c-2.131,3.69-0.542,9.114,1.5,12.097c1.022,1.461,2.215,3.092,3.778,3.035c1.529-0.063,2.1-0.975,3.945-0.975    c1.828,0,2.364,0.975,3.958,0.938c1.64-0.027,2.674-1.467,3.66-2.942c0.734-1.041,1.299-2.191,1.673-3.408    C19.815,16.788,18.548,14.879,18.546,12.763z"
            id="_Path_"
          />
          <path
            d="M15.535,3.847C16.429,2.773,16.87,1.393,16.763,0c-1.366,0.144-2.629,0.797-3.535,1.829    c-0.895,1.019-1.349,2.351-1.261,3.705C13.352,5.548,14.667,4.926,15.535,3.847z"
            id="_Path_2"
          />
        </g>
      </g>
    </svg>
  );
}
