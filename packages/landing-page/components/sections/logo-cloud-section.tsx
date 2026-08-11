"use client";

import { motion, useReducedMotion } from "motion/react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
};

function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  return (
    <div
      {...props}
      className={cn(
        "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
        className
      )}
    >
      <InfiniteSlider gap={42} reverse speed={80} speedOnHover={25}>
        {logos.map((logo) => (
          <img
            alt={logo.alt}
            className="pointer-events-none h-4 select-none md:h-5 dark:brightness-0 dark:invert"
            height={logo.height || "auto"}
            key={`logo-${logo.alt}`}
            loading="lazy"
            src={logo.src}
            width={logo.width || "auto"}
          />
        ))}
      </InfiniteSlider>
    </div>
  );
}

const logos = [
  { src: "https://svgl.app/library/typescript.svg", alt: "TypeScript Logo" },
  { src: "https://svgl.app/library/electron.svg", alt: "Electron Logo" },
  { src: "https://svgl.app/library/nodejs.svg", alt: "Node.js Logo" },
  { src: "https://svgl.app/library/react.svg", alt: "React Logo" },
  { src: "https://svgl.app/library/sqlite.svg", alt: "SQLite Logo" },
  { src: "https://svgl.app/library/ffmpeg.svg", alt: "FFmpeg Logo" },
  {
    src: "https://svgl.app/library/openai_wordmark_light.svg",
    alt: "OpenAI Logo",
  },
  {
    src: "https://svgl.app/library/claude-ai-wordmark-icon_light.svg",
    alt: "Claude AI Logo",
  },
];

export function LogoCloudSection() {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative mx-auto max-w-3xl py-10">
      <motion.h2
        className="mb-5 text-center font-medium text-foreground text-xl tracking-tight md:text-3xl"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        viewport={{ once: true, margin: "-60px" }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <span className="text-muted-foreground">{t.logoCloud.lead}</span>
        <br />
        <span className="font-semibold">{t.logoCloud.highlight}</span>
      </motion.h2>
      <div className="mx-auto my-5 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
        viewport={{ once: true, margin: "-60px" }}
        whileInView={{ opacity: 1, scale: 1 }}
      >
        <LogoCloud logos={logos} />
      </motion.div>

      <div className="mt-5 h-px bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
    </section>
  );
}
