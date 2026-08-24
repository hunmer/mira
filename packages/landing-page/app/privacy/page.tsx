import type { Metadata } from "next";
import { PrivacySection } from "@/components/sections/privacy-section";
import { SiteFooterSection } from "@/components/sections/site-footer";
import { SiteHeaderSection } from "@/components/sections/site-header";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "隐私政策",
  description:
    "Mira 浏览器扩展隐私政策：我们收集哪些数据、如何使用与存储数据，以及联系方式。",
  canonicalUrl: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/40 dark:bg-background">
      <SiteHeaderSection />
      <main className="flex grow flex-col">
        <PrivacySection />
      </main>
      <SiteFooterSection />
    </div>
  );
}
