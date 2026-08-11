"use client";

import { Blocks, Boxes, Cable, MonitorDot, Plug, Terminal } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "motion/react";
import type React from "react";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type FeatureType = {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
};

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut" },
  },
  hover: {},
};

const iconVariants: Variants = {
  hover: {
    scale: 1.15,
    rotate: -8,
    transition: { type: "spring", stiffness: 300, damping: 15 },
  },
};

type FeatureCardPorps = React.ComponentProps<typeof motion.div> & {
  feature: FeatureType;
};

function FeatureCard({ feature, className, ...props }: FeatureCardPorps) {
  const shouldReduceMotion = useReducedMotion();
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glow = useMotionTemplate`radial-gradient(200px circle at ${glowX}px ${glowY}px, color-mix(in oklab, var(--foreground) 8%, transparent), transparent 70%)`;

  return (
    <motion.div
      className={cn("group relative overflow-hidden p-6", className)}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        glowX.set(event.clientX - rect.left);
        glowY.set(event.clientY - rect.top);
      }}
      variants={cardVariants}
      whileHover="hover"
      {...props}
    >
      {/* 鼠标追踪光晕 */}
      {shouldReduceMotion ? null : (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow }}
        />
      )}
      <div className="-mt-2 -ml-20 pointer-events-none absolute top-0 left-1/2 size-full [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
        <GridPattern
          className="absolute inset-0 size-full stroke-foreground/20"
          height={40}
          width={40}
          x={5}
        />
      </div>
      <motion.div className="inline-block" variants={iconVariants}>
        <feature.icon
          aria-hidden
          className="size-6 text-foreground/75"
          strokeWidth={1}
        />
      </motion.div>
      <h3 className="mt-10 text-sm md:text-base">{feature.title}</h3>
      <p className="relative z-20 mt-2 font-light text-muted-foreground text-xs">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function FeatureSection() {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const items = t.feature.items;

  const features: FeatureType[] = [
    {
      title: items.cli.title,
      icon: Terminal,
      description: items.cli.description,
    },
    { title: items.mcp.title, icon: Cable, description: items.mcp.description },
    {
      title: items.skill.title,
      icon: Blocks,
      description: items.skill.description,
    },
    {
      title: items.library.title,
      icon: Boxes,
      description: items.library.description,
    },
    {
      title: items.plugin.title,
      icon: Plug,
      description: items.plugin.description,
    },
    {
      title: items.device.title,
      icon: MonitorDot,
      description: items.device.description,
    },
  ];

  return (
    <section className="place-content-center py-20">
      <div className="mx-auto w-full max-w-5xl space-y-8 p-4">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-balance font-medium text-2xl md:text-4xl lg:text-5xl">
            {t.feature.title}
          </h2>
          <p className="mt-4 text-balance text-muted-foreground text-sm md:text-base">
            {t.feature.subtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 divide-x divide-y border-t border-l sm:grid-cols-2 md:grid-cols-3"
          initial={shouldReduceMotion ? false : "hidden"}
          variants={containerVariants}
          viewport={{ once: true, margin: "-80px" }}
          whileInView="show"
        >
          {features.map((feature) => (
            <FeatureCard
              className="last:border-r last:border-b"
              feature={feature}
              key={feature.title}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
