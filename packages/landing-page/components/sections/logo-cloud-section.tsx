"use client";

import {
  Image as ImageIcon,
  type LucideIcon,
  Music,
  Package,
  Play,
  BookText,
  Boxes,
  Clapperboard,
  Newspaper,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type Format = {
  icon: LucideIcon;
  /** 主标签 */
  label: string;
  /** 该类目下的扩展名列表 */
  exts: string[];
};

const formats: Format[] = [
  { icon: ImageIcon, label: "Image", exts: ["jpg", "png", "webp", "gif", "svg"] },
  { icon: BookText, label: "Document", exts: ["pdf", "epub", "docx", "txt"] },
  { icon: Boxes, label: "3D", exts: ["glb", "gltf", "obj", "fbx", "stl"] },
  { icon: Play, label: "Animation", exts: ["swf", "apng", "webp-anim"] },
  { icon: Clapperboard, label: "Video", exts: ["mp4", "mov", "mkv", "webm"] },
  { icon: Music, label: "Audio", exts: ["mp3", "wav", "flac", "aac"] },
  { icon: Newspaper, label: "Comic", exts: ["cbz", "cbr", "zip"] },
  { icon: Package, label: "Archive", exts: ["zip", "rar", "7z", "tar"] },
];

type FormatCloudProps = React.ComponentProps<"div">;

function FormatCloud({ className }: FormatCloudProps) {
  return (
    <div
      className={cn(
        "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
        className
      )}
    >
      <InfiniteSlider gap={16} reverse speed={40} speedOnHover={15}>
        {formats.map((f) => (
          <div
            className="flex size-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border bg-card p-3 text-center shadow"
            key={`format-${f.label}`}
          >
            <f.icon className="size-6 text-muted-foreground" />
            <span className="font-medium font-mono text-xs tracking-wide">
              {f.label}
            </span>
            <span className="text-muted-foreground/70 text-[10px] leading-tight">
              {f.exts.join(" · ")}
            </span>
          </div>
        ))}
      </InfiniteSlider>
    </div>
  );
}

export function LogoCloudSection() {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative mx-auto w-full max-w-3xl overflow-hidden py-10">
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
        <FormatCloud />
      </motion.div>

      <div className="mt-5 h-px bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
    </section>
  );
}
