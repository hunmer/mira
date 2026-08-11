import { MouseSpotlight } from "@/components/mouse-spotlight";
import { ContactSection } from "@/components/sections/contact-section";
import { FaqsSection } from "@/components/sections/faqs-section";
import { FeatureSection } from "@/components/sections/feature-section";
import { HeroSection } from "@/components/sections/hero-section";
import { LogoCloudSection } from "@/components/sections/logo-cloud-section";
import { SiteFooterSection } from "@/components/sections/site-footer";
import { SiteHeaderSection } from "@/components/sections/site-header";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { SafariBrowser } from "@/components/ui/safari-browser";
import PhoneMockupBasic from "@/components/ui/phone-mockups-1";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-secondary/40 dark:bg-background">
      {/* 全局鼠标跟随光效 */}
      <MouseSpotlight />
      <SiteHeaderSection />
      <main className="flex grow flex-col">
        {/* 首屏：核心价值主张 + 主 CTA */}
        <HeroSection />
        {/* 产品预览：iPhone 截图轮播（移动端） */}
        <PhoneMockupBasic />
        {/* 产品预览：Safari 浏览器外框（桌面端） */}
        <section
          className="relative w-full overflow-hidden py-6 md:py-10"
          aria-label="Desktop browser preview"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ⚠️ src 为 21st.dev 示例图（第三方 utfs.io），请替换为自己的产品截图；url 同理 */}
            <SafariBrowser
              src="https://utfs.io/f/dacf5051-c3ab-41f1-852a-98e4f24376c9-12vlav.jpg"
              url="designali.in"
              className="h-auto w-full"
            />
          </div>
        </section>
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
