"use client";

/**
 * DesktopPreviewSection —— 桌面端 Safari 浏览器预览区。
 *
 * 布局：SafariBrowser 独占主区域居中显示；垂直 CoverflowCarousel 以绝对定位
 * 固定在容器右侧垂直居中（脱离文档流，不挤占 SafariBrowser 的居中与尺寸）。
 * 移动端（<lg）回退为上下堆叠。
 *
 * 缩略图列表：
 *  - 首项为"实时演示"占位 —— 选中时 SafariBrowser 渲染实时 MiraHomeLayout 组件
 *  - 其后为"首页""预览"两张代表图，src 根据当前主题自动切换 light/dark 变体
 *    （四张截图只为视觉切换服务，列表只暴露两张）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
	CoverflowCarousel,
	type CoverflowSlide,
} from "@/components/ui/coverflow-carousel";
import { MiraHomeLayout } from "@/components/ui/mira-home-layout";
import { SafariBrowser } from "@/components/ui/safari-browser";

/** "实时演示"占位缩略图 —— 内联 SVG data URI，标识实时组件占位，区别于静态截图。 */
const PLACEHOLDER_SRC =
	"data:image/svg+xml," +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="400" height="400" fill="url(#bg)"/><rect x="112" y="132" width="176" height="132" rx="12" fill="#ffffff" opacity="0.95"/><rect x="124" y="146" width="56" height="104" rx="6" fill="#6366f1"/><rect x="192" y="146" width="84" height="46" rx="5" fill="#ddd6fe"/><rect x="192" y="202" width="84" height="48" rx="5" fill="#ddd6fe"/><text x="200" y="304" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle">实时演示</text><text x="200" y="330" font-family="Arial, sans-serif" font-size="13" fill="#ffffff" opacity="0.85" text-anchor="middle">Live Component</text></svg>`,
	);

/** 截图配置：每条提供 light/dark 两个变体，列表只展示一条，按主题选用其一。 */
type ScreenshotConfig = {
	title: string;
	desc: string;
	light: string;
	dark: string;
};

const SCREENSHOTS: ScreenshotConfig[] = [
	{
		title: "首页",
		desc: "素材库主界面",
		light: "/screenshots/screenshot-home-light.jpg",
		dark: "/screenshots/screenshot-home-dark.jpg",
	},
	{
		title: "预览",
		desc: "媒体预览",
		light: "/screenshots/screenshot-preview-light.jpg",
		dark: "/screenshots/screenshot-preview-dark.jpg",
	},
];

/** 占位项在 slides 中的索引 —— 选中它时 SafariBrowser 保持渲染 MiraHomeLayout。 */
const PLACEHOLDER_INDEX = 0;

export function DesktopPreviewSection() {
	const { resolvedTheme } = useTheme();
	// next-themes 在 SSR 阶段无法得知主题，挂载后再读，避免 hydration mismatch。
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const isDark = mounted && resolvedTheme === "dark";

	const [activeIndex, setActiveIndex] = useState<number>(PLACEHOLDER_INDEX);
	const handleSelect = useCallback((index: number) => {
		setActiveIndex(index);
	}, []);

	// 缩略图列表：占位 + 两张代表图；代表图 src 随主题在 light/dark 间切换。
	const slides = useMemo<CoverflowSlide[]>(
		() => [
			{
				src: PLACEHOLDER_SRC,
				alt: "实时演示占位",
				title: "Mira Home Layout",
				subtitle: "实时组件演示（非截图）",
			},
			...SCREENSHOTS.map((s) => ({
				src: isDark ? s.dark : s.light,
				alt: s.title,
				title: s.title,
				subtitle: `${s.desc} · ${isDark ? "深色" : "浅色"}`,
			})),
		],
		[isDark],
	);

	const isPlaceholder = activeIndex === PLACEHOLDER_INDEX;
	// 占位时传 <MiraHomeLayout /> 作为 children；否则 children 为 undefined，
	// SafariBrowser 会回退到 src 渲染对应静态截图（children !== undefined 才优先生效）。
	const children = isPlaceholder ? <MiraHomeLayout /> : undefined;
	const activeSrc = isPlaceholder ? undefined : slides[activeIndex].src;

	return (
		<section
			aria-label="Desktop browser preview"
			className="relative w-full overflow-visible py-6 md:py-10"
		>
			<div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
				{/* SafariBrowser 撑满容器宽度 = 满宽即居中；相册以绝对定位浮于右侧，不进入居中计算 */}
				<SafariBrowser
					className="h-auto w-full"
					url="mira.app"
					src={activeSrc}
				>
					{children}
				</SafariBrowser>

				{/* 右侧垂直相册：md+ 绝对定位固定在右侧垂直居中（脱离文档流，不影响 SafariBrowser 居中）；
				     移动端回退为下方堆叠。 */}
				<div className="mx-auto mt-6 h-[400px] w-full max-w-[320px] md:absolute md:-right-[160px] md:top-1/2 md:z-10 md:mx-0 md:mt-0 md:h-[480px] md:w-[160px] md:max-w-none md:-translate-y-1/2">
					<CoverflowCarousel
						slides={slides}
						onSelect={handleSelect}
						orientation="vertical"
						showNavigation
						showPagination
						showCaption
						loop={false}
						label="Mira 预览切换"
						cardWidth="clamp(100px, 10vw, 130px)"
						className="h-full"
					/>
				</div>
			</div>
		</section>
	);
}

export default DesktopPreviewSection;
