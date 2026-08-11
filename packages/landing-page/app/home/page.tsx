import { ContactSection } from "@/components/sections/contact-section";
import { FaqsSection } from "@/components/sections/faqs-section";
import { FeatureSection } from "@/components/sections/feature-section";
import { HeroSection } from "@/components/sections/hero-section";
import { LogoCloudSection } from "@/components/sections/logo-cloud-section";
import { SiteFooterSection } from "@/components/sections/site-footer";
import { SiteHeaderSection } from "@/components/sections/site-header";
import { TestimonialsSection } from "@/components/sections/testimonials-section";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-secondary/40 dark:bg-background">
      <SiteHeaderSection />
      <main className="flex grow flex-col">
        {/* 首屏：核心价值主张 + 主 CTA */}
        <HeroSection />
        {/* 核心价值：产品特性 */}
        <FeatureSection />
        {/* 社会证明：品牌 logo 信任背书 */}
        <LogoCloudSection />
        {/* 用户证言：真实反馈 */}
        <TestimonialsSection />
        {/* 疑虑消除：常见问题 */}
        <FaqsSection />
        {/* 转化入口：联系方式 */}
        <ContactSection />
      </main>
      <SiteFooterSection />
    </div>
  );
}
