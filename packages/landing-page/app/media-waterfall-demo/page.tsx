"use client";

import { MediaWaterfall } from "@/components/ui/media-waterfall";
import { SafariBrowser } from "@/components/ui/safari-browser";

export default function MediaWaterfallDemoPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 p-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          Media Waterfall
        </h1>
        <p className="text-muted-foreground text-sm">
          从 mira-client HomeView 复刻的瀑布流组件，带虚拟数据与简单交互（hover
          / 点选）。
        </p>
      </header>

      {/* 直接展示瀑布流 */}
      <section className="space-y-3">
        <h2 className="font-medium text-muted-foreground text-sm">
          独立瀑布流
        </h2>
        <MediaWaterfall />
      </section>

      {/* 嵌入 SafariBrowser 内容区，演示“除图片外支持展示组件” */}
      <section className="space-y-3">
        <h2 className="font-medium text-muted-foreground text-sm">
          嵌入 SafariBrowser（实时组件，非截图）
        </h2>
        <SafariBrowser className="size-full" url="mira.app">
          <div className="size-full overflow-hidden bg-gradient-to-br from-background via-background to-muted">
            <div className="flex items-center gap-2 border-border/60 border-b px-4 py-2">
              <div className="size-5 rounded-md bg-primary/15" />
              <span className="font-medium text-foreground text-xs">Mira</span>
              <span className="text-[11px] text-muted-foreground">素材库</span>
            </div>
            <div className="h-[calc(100%-2.25rem)] overflow-hidden p-3">
              <MediaWaterfall />
            </div>
          </div>
        </SafariBrowser>
      </section>
    </main>
  );
}
