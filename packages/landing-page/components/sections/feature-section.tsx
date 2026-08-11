import type React from "react";
import {
  Cpu,
  Fingerprint,
  Pencil,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";
import { GridPattern } from "@/components/ui/grid-pattern";
import { cn } from "@/lib/utils";

type FeatureType = {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
};

type FeatureCardPorps = React.ComponentProps<"div"> & {
  feature: FeatureType;
};

function FeatureCard({
  feature,
  className,
  ...props
}: FeatureCardPorps) {
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

const features: FeatureType[] = [
  {
    title: "Faaast",
    icon: Zap,
    description: "It supports an entire helping developers and innovate.",
  },
  {
    title: "Powerful",
    icon: Cpu,
    description: "It supports an entire helping developers and businesses.",
  },
  {
    title: "Security",
    icon: Fingerprint,
    description: "It supports an helping developers businesses.",
  },
  {
    title: "Customization",
    icon: Pencil,
    description: "It supports helping developers and businesses innovate.",
  },
  {
    title: "Control",
    icon: Settings2,
    description: "It supports helping developers and businesses innovate.",
  },
  {
    title: "Built for AI",
    icon: Sparkles,
    description: "It supports helping developers and businesses innovate.",
  },
];

export function FeatureSection() {
  return (
    <section className="place-content-center py-20">
      <div className="mx-auto w-full max-w-5xl space-y-8 p-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance font-medium text-2xl md:text-4xl lg:text-5xl">
            Power. Speed. Control.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground text-sm md:text-base">
            Everything you need to build fast, secure, scalable apps.
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
