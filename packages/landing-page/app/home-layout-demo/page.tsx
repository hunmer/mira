"use client";

import { MiraHomeLayout } from "@/components/ui/mira-home-layout";

export default function HomeLayoutDemoPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-3 p-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          Mira Home Layout
        </h1>
        <p className="text-muted-foreground text-sm">
          复刻 HomeView 的三列可拖拽玻璃态布局：左栏侧边栏 / 中间 Tabs+瀑布流 /
          右栏详情。点击左栏过滤、点击卡片联动右栏详情。
        </p>
      </header>
      <MiraHomeLayout className="h-[80vh] min-h-[560px] rounded-2xl border" />
    </main>
  );
}
