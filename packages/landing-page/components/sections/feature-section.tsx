"use client";

import { motion, useReducedMotion } from "motion/react";
import type React from "react";
import {
  Blocks,
  Boxes,
  Cable,
  MonitorDot,
  Plug,
  Terminal,
} from "lucide-react";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type FeatureType = {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
};

type FeatureCardPorps = React.ComponentProps<"div"> & {
  feature: FeatureType;
};

function FeatureCard({ feature, className, ...props }: FeatureCardPorps) {
  return (
    <div className={cn("relative overflow-hidden p-6", className)} {...props}>
      <div className="-mt-2 -ml-20 pointer-events-none absolute top-0 left-1/2 size-full [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
        <GridPattern
          className="absolute inset-0 size-full stroke-foreground/20"
          height={40}
          width={40}
          x={5}
        />
      </div>
      <feature.icon
        aria-hidden
        className="size-6 text-foreground/75"
        strokeWidth={1}
      />
      <h3 className="mt-10 text-sm md:text-base">{feature.title}</h3>
      <p className="relative z-20 mt-2 font-light text-muted-foreground text-xs">
        {feature.description}
      </p>
    </div>
  );
}

export function FeatureSection() {
  const { t } = useI18n();
  const items = t.feature.items;

  const features: FeatureType[] = [
    { title: items.cli.title, icon: Terminal, description: items.cli.description },
    { title: items.mcp.title, icon: Cable, description: items.mcp.description },
    { title: items.skill.title, icon: Blocks, description: items.skill.description },
    { title: items.library.title, icon: Boxes, description: items.library.description },
    { title: items.plugin.title, icon: Plug, description: items.plugin.description },
    { title: items.device.title, icon: MonitorDot, description: items.device.description },
  ];

  return (
    <section className="place-content-center py-20">
      <div className="mx-auto w-full max-w-5xl space-y-8 p-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance font-medium text-2xl md:text-4xl lg:text-5xl">
            {t.feature.title}
          </h2>
          <p className="mt-4 text-balance text-muted-foreground text-sm md:text-base">
            {t.feature.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 divide-x divide-y border-t border-l sm:grid-cols-2 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              className="last:border-r last:border-b"
              feature={feature}
              key={feature.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
