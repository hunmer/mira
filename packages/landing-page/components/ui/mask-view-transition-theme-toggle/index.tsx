"use client";

import { Moon, SunDim } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

export interface MaskedThemeToggleProps {
	/**
	 * GIF / PNG used as the mask shape for the view-transition reveal.
	 * Pass any image URL; the alpha channel determines the reveal shape.
	 */
	maskGifUrl?: string;
	/** How long the mask reveal animation runs, e.g. "3s". */
	duration?: string;
	/** Extra className for the trigger button. */
	className?: string;
}

/**
 * Drive next-themes through the native View Transition API.
 * Falls back to a plain setTheme when the API is unavailable.
 */
export function useViewTransitionTheme() {
	const { theme, resolvedTheme, setTheme } = useTheme();

	function setThemeWithTransition(next: string) {
		if (next === theme) return;
		// browsers without the View Transition API just swap immediately
		if (!document.startViewTransition) {
			setTheme(next);
			return;
		}
		document.startViewTransition(() => {
			flushSync(() => {
				// next-themes updates <html class> inside a passive effect, so by the
				// time this callback returns the DOM would be unchanged and the view
				// transition would snapshot two identical states (no visible reveal).
				// Toggle the class synchronously here so the browser captures a real
				// diff; setTheme() then syncs next-themes state for the rest of the app.
				const root = document.documentElement;
				if (next === "dark") root.classList.add("dark");
				else root.classList.remove("dark");
				setTheme(next);
			});
		});
	}

	return { theme, resolvedTheme, setThemeWithTransition };
}

/** Inline `<style>` injecting the global view-transition + mask keyframes. */
export function MaskedViewTransitionStyle({
	maskGifUrl,
	duration,
}: {
	maskGifUrl: string;
	duration: string;
}) {
	return (
		<style>{`
        :root {
          --expo-in: linear(
            0 0%, 0.0085 31.26%, 0.0167 40.94%,
            0.0289 48.86%, 0.0471 55.92%,
            0.0717 61.99%, 0.1038 67.32%,
            0.1443 72.07%, 0.1989 76.7%,
            0.2659 80.89%, 0.3465 84.71%,
            0.4419 88.22%, 0.554 91.48%,
            0.6835 94.51%, 0.8316 97.34%, 1 100%
          );
        }

        ::view-transition-group(root) {
          animation-timing-function: var(--expo-in);
        }

        ::view-transition-new(root) {
          -webkit-mask: url('${maskGifUrl}') center / 0 no-repeat;
          mask: url('${maskGifUrl}') center / 0 no-repeat;
          animation: scale ${duration};
          animation-fill-mode: both;
        }

        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation: scale ${duration};
          animation-fill-mode: both;
        }

        ::view-transition-old(root),
        ::view-transition-new(root) {
          mix-blend-mode: normal;
        }

        /*
         * next-themes ships disableTransitionOnChange which injects
         * *{animation-duration:0s!important} during the swap — that would kill
         * the view-transition reveal, so force it back on here.
         */
        ::view-transition-new(root),
        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation-duration: ${duration} !important;
        }

        @keyframes scale {
          0% {
            -webkit-mask-size: 0;
            mask-size: 0;
          }
          10% {
            -webkit-mask-size: 50vmax;
            mask-size: 50vmax;
          }
          90% {
            -webkit-mask-size: 50vmax;
            mask-size: 50vmax;
          }
          100% {
            -webkit-mask-size: 2000vmax;
            mask-size: 2000vmax;
          }
        }
      `}</style>
	);
}

/**
 * Reusable dropdown theme button with a view-transition + GIF mask reveal.
 * Self-contained: mounts the required `<style>` for the transition, so it works
 * anywhere it is rendered (site header, sidebar, etc.).
 */
export function MaskedThemeToggle({
	maskGifUrl = "https://media.tenor.com/cyORI7kwShQAAAAi/shigure-ui-dance.gif",
	duration = "3s",
	className,
}: MaskedThemeToggleProps) {
	const { theme, setThemeWithTransition } = useViewTransitionTheme();
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// close the dropdown when clicking outside of it
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function handleThemeChange(next: string) {
		setOpen(false);
		setThemeWithTransition(next);
	}

	return (
		<>
			<MaskedViewTransitionStyle
				duration={duration}
				maskGifUrl={maskGifUrl}
			/>
			<div className="relative inline-block text-left" ref={menuRef}>
				<button
					type="button"
					onClick={() => setOpen(!open)}
					aria-label="Toggle theme"
					className={cn(
						"inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:bg-accent",
						className,
					)}
				>
					{/* Render both icons and toggle via CSS to avoid SSR/CSR
					    hydration mismatch (theme is undefined on the server). */}
					<SunDim className="size-4 dark:hidden" />
					<Moon className="hidden size-4 dark:block" />
				</button>
				{open && (
					<div className="absolute right-0 z-[100] mt-2 w-32 origin-top-right rounded-lg border border-border bg-background p-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
						<button
							type="button"
							onClick={() => handleThemeChange("light")}
							className={cn(
								"flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
								theme === "light"
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent",
							)}
						>
							Light
						</button>
						<button
							type="button"
							onClick={() => handleThemeChange("dark")}
							className={cn(
								"flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
								theme === "dark"
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent",
							)}
						>
							Dark
						</button>
					</div>
				)}
			</div>
		</>
	);
}

export interface MaskViewTransitionThemeToggleProps {
	maskGifUrl?: string;
	duration?: string;
	/** Optional ReactNode for the brand mark at the top-left. */
	brand?: ReactNode;
}

/**
 * Full demo layout as shipped on 21st.dev. Uses {@link MaskedThemeToggle} for
 * the actual trigger, so the surrounding hero/header copy is the only demo
 * surface — edit it freely for your own content.
 */
export function MaskViewTransitionThemeToggle({
	maskGifUrl,
	duration,
	brand,
}: MaskViewTransitionThemeToggleProps) {
	return (
		<div className="flex w-full min-h-screen flex-col justify-between bg-neutral-50 p-6 transition-colors duration-300 dark:bg-neutral-950">
			<header className="mx-auto w-full max-w-7xl rounded-full border border-neutral-200/80 bg-white/75 px-8 py-3.5 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-neutral-800/80 dark:bg-neutral-900/75">
				<div className="flex items-center justify-between">
					<div className="group flex cursor-pointer items-center gap-2">
						{brand ?? (
							<>
								<div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-md transition-transform duration-200 group-hover:scale-105 dark:bg-indigo-500">
									U
								</div>
								<span className="font-semibold tracking-tight text-neutral-900 dark:text-white">
									UI Labs
									<span className="text-indigo-600 dark:text-indigo-400">.</span>
								</span>
							</>
						)}
					</div>

					<nav className="hidden items-center gap-8 md:flex">
						{["Components", "Templates", "Showcase", "Docs"].map((item) => (
							<a
								key={item}
								href="#"
								className="text-sm font-medium text-neutral-600 transition-colors hover:text-indigo-600 dark:text-neutral-300 dark:hover:text-indigo-400"
							>
								{item}
							</a>
						))}
					</nav>

					<div className="flex items-center gap-4">
						<MaskedThemeToggle duration={duration} maskGifUrl={maskGifUrl} />
						<button
							type="button"
							className="hidden cursor-pointer items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 sm:inline-flex"
						>
							Get Started
						</button>
					</div>
				</div>
			</header>

			<div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
				<h1 className="text-4xl leading-tight font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-5xl md:text-6xl">
					Supercharge your web design experience.
				</h1>
				<p className="mt-6 max-w-xl mx-auto text-base leading-relaxed text-neutral-500 dark:text-neutral-400 sm:text-lg">
					Toggle the theme button in the navigation bar to experience a smooth
					view-transition with a customized GIF mask overlay!
				</p>
			</div>

			<div className="w-full py-4 text-center text-xs text-neutral-400 dark:text-neutral-600">
				Press toggle button to switch themes
			</div>
		</div>
	);
}
