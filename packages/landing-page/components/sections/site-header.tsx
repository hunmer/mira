"use client";
import { GithubIcon } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { MenuToggleIcon } from "@/components/menu-toggle-icon";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { useScroll } from "@/hooks/use-scroll";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/hunmer/mira_typescript";

export function SiteHeaderSection() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { title: t.nav.features, href: "#" },
    { title: t.nav.docs, href: "#" },
    { title: t.nav.install, href: "#" },
  ];

  return (
    <header
      className={cn("sticky top-0 z-50 w-full border-transparent border-b", {
        "border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/50":
          scrolled,
      })}
    >
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <a className="rounded-md p-2 hover:bg-accent" href="#">
            <Logo className="h-4" />
          </a>
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {links.map((link) => (
                <NavigationMenuLink asChild className="px-4" key={link.title}>
                  <a className="rounded-md p-2 hover:bg-accent" href={link.href}>
                    {link.title}
                  </a>
                </NavigationMenuLink>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <Button asChild variant="ghost" size="icon" aria-label="GitHub">
            <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
              <GithubIcon className="size-4" />
            </a>
          </Button>
          <Button asChild>
            <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
              {t.nav.getStarted}
            </a>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <Button
            aria-controls="mobile-menu"
            aria-expanded={open}
            aria-label={t.nav.openMenu}
            onClick={() => setOpen(!open)}
            size="icon"
            variant="outline"
          >
            <MenuToggleIcon className="size-5" duration={300} open={open} />
          </Button>
        </div>
      </nav>

      <MobileMenu
        className="flex flex-col justify-between gap-2 overflow-y-auto"
        open={open}
      >
        <div className="flex w-full flex-col gap-y-2">
          {links.map((link) => (
            <a
              key={link.title}
              href={link.href}
              className="rounded-md p-2 hover:bg-accent"
            >
              {link.title}
            </a>
          ))}
          <a
            href={GITHUB_URL}
            rel="noopener noreferrer"
            target="_blank"
            className="rounded-md p-2 hover:bg-accent"
          >
            GitHub
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
              {t.nav.getStarted}
            </a>
          </Button>
        </div>
      </MobileMenu>
    </header>
  );
}

type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/50",
        "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden"
      )}
      id="mobile-menu"
    >
      <div
        className={cn(
          "data-[slot=open]:zoom-in-97 ease-out data-[slot=open]:animate-in",
          "size-full p-4",
          className
        )}
        data-slot={open ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
