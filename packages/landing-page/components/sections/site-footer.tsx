"use client";
import { GithubIcon, LinkedinIcon, XIcon, YoutubeIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type React from "react";
import type { ComponentProps, ReactNode } from "react";
import { Logo } from "@/components/logo";
import { useI18n } from "@/lib/i18n/i18n-provider";

const GITHUB_URL = "https://github.com/hunmer/mira";
const ISSUE_URL = "https://github.com/hunmer/mira/issues";

type FooterLink = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type FooterSection = {
  label: string;
  links: FooterLink[];
};

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>["className"];
  children: ReactNode;
};

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return children;
  }

  return (
    <motion.div
      className={className}
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      transition={{ delay, duration: 0.8 }}
      viewport={{ once: true }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}

export function SiteFooterSection() {
  const { t } = useI18n();
  const p = t.footer.product;
  const r = t.footer.resources;
  const c = t.footer.community;

  const footerLinks: FooterSection[] = [
    {
      label: t.footer.groups.product,
      links: [
        { title: p.features, href: "#" },
        { title: p.install, href: "#" },
        { title: p.cli, href: "#" },
        { title: p.mcp, href: "#" },
      ],
    },
    {
      label: t.footer.groups.resources,
      links: [
        { title: r.docs, href: "#" },
        { title: r.faqs, href: "#" },
        { title: r.changelog, href: "#" },
        { title: r.plugins, href: "#" },
      ],
    },
    {
      label: t.footer.groups.community,
      links: [
        { title: c.github, href: GITHUB_URL },
        { title: c.issue, href: ISSUE_URL },
        { title: c.skill, href: "#" },
        { title: c.contributing, href: "#" },
      ],
    },
    {
      label: t.footer.groups.follow,
      links: [
        { title: "GitHub", href: GITHUB_URL, icon: GithubIcon },
        { title: "X", href: "#", icon: XIcon },
        { title: "Youtube", href: "#", icon: YoutubeIcon },
        { title: "LinkedIn", href: "#", icon: LinkedinIcon },
      ],
    },
  ];

  return (
    <footer className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center rounded-t-4xl border-t bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-4 py-6 md:rounded-t-6xl md:px-6">
      <div className="-translate-x-1/2 -translate-y-1/2 absolute top-0 right-1/2 left-1/2 h-px w-1/3 rounded-full bg-foreground/20 blur" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-4">
          <Logo className="h-4" />
          <p className="mt-8 text-muted-foreground text-sm md:mt-0">
            &copy; {new Date().getFullYear()} {t.footer.copyright}
          </p>
        </AnimatedContainer>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          {footerLinks.map((section, index) => (
            <AnimatedContainer delay={0.1 + index * 0.1} key={section.label}>
              <div className="mb-10 md:mb-0">
                <h3 className="text-xs">{section.label}</h3>
                <ul className="mt-4 space-y-2 text-muted-foreground text-sm">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <a
                        className="inline-flex items-center transition-all duration-300 hover:text-foreground"
                        href={link.href}
                        key={`${section.label}-${link.title}`}
                      >
                        {link.icon && <link.icon className="me-1 size-4" />}
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>
    </footer>
  );
}
