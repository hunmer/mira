"use client";

import { Blocks, Boxes, Cable, MonitorDot, Plug, Terminal } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
  type Variants,
} from "motion/react";
import { useEffect, useState, type MouseEvent } from "react";
import type React from "react";
import IrisLensCard from "@/components/ui/iris-lens-card";
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

/** 把卡片编号格式化成两位 + 重复填充，用作 hover 背景的数字串 */
function buildNumberString(index: number): string {
  const label = String(index + 1).padStart(2, "0");
  return label.repeat(Math.ceil(1500 / label.length));
}

interface NumberBackgroundProps {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  numString: string;
}

/** hover 时跟随光标显现的数字背景层（机制借鉴 EvervaultCard） */
function NumberBackground({ mouseX, mouseY, numString }: NumberBackgroundProps) {
  const mask = useMotionTemplate`radial-gradient(220px at ${mouseX}px ${mouseY}px, white, transparent)`;
  const style = { maskImage: mask, WebkitMaskImage: mask };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-emerald-500/50 via-cyan-500/30 to-blue-700/50 opacity-0 backdrop-blur-md transition duration-500 group-hover:opacity-100"
        style={style}
      />
      <motion.div
        className="absolute inset-0 opacity-0 mix-blend-overlay transition duration-500 group-hover:opacity-100"
        style={style}
      >
        <p className="absolute inset-x-0 h-full break-words whitespace-pre-wrap font-mono text-xs font-bold text-white transition duration-500">
          {numString}
        </p>
      </motion.div>
    </div>
  );
}

type FeatureCardProps = React.ComponentProps<typeof motion.div> & {
  feature: FeatureType;
  index: number;
};

function FeatureCard({ feature, index, className, ...props }: FeatureCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [numString, setNumString] = useState("");

  useEffect(() => {
    setNumString(buildNumberString(index));
  }, [index]);

  function onMouseMove({ currentTarget, clientX, clientY }: MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      className={cn("group", className)}
      variants={cardVariants}
      whileHover="hover"
      onMouseMove={onMouseMove}
      {...props}
    >
      <IrisLensCard
        heightClass="h-[220px]"
        tilt={12}
        contentDepth={40}
        lensStrength={0.4}
        holoEdge
      >
        <NumberBackground mouseX={mouseX} mouseY={mouseY} numString={numString} />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <motion.div className="inline-block" variants={iconVariants}>
            <feature.icon
              aria-hidden
              className="size-7 text-foreground/80"
              strokeWidth={1}
            />
          </motion.div>
          <div>
            <h3 className="text-sm md:text-base">{feature.title}</h3>
            <p className="mt-2 font-light text-muted-foreground text-xs">
              {feature.description}
            </p>
          </div>
        </div>
      </IrisLensCard>
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
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
          initial={shouldReduceMotion ? false : "hidden"}
          variants={containerVariants}
          viewport={{ once: true, margin: "-80px" }}
          whileInView="show"
        >
          {features.map((feature, index) => (
            <FeatureCard feature={feature} index={index} key={feature.title} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
