"use client";

/**
 * MediaWaterfall —— 从 mira-client 的 HomeView 瀑布流复刻而来的展示型组件。
 *
 * 还原点：
 *  - 多列瀑布流（CSS multi-column，响应式，零 JS 测量）
 *  - 卡片用 `aspect-ratio` 撑高，避免图片加载后布局抖动
 *  - hover 上浮 + 阴影、图片缓慢放大；点击单选（描边 + 勾选圆点）
 *  - 底部玻璃信息浮层（文件名 / 大小 / 文件夹 / 标签 badge）
 *  - motion stagger 入场
 *
 * 单选语义：点击卡片设为「活跃项」并回调 onActiveItemChange，再次点击同一张取消。
 * 供 mira-home-layout 右侧详情面板联动。
 *
 * @example
 * <MediaWaterfall />
 * <MediaWaterfall items={myItems} onActiveItemChange={setActive} className="columns-3" />
 */

import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { Check, Folder, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaItem = {
	id: string;
	src: string;
	/** 宽高比 width / height，用于在图片加载前撑定卡片高度 */
	ratio: number;
	title: string;
	size?: string;
	folder?: string;
	tags?: string[];
	kind?: "image" | "video";
	// —— 详情面板扩展字段（均可选） ——
	description?: string;
	website?: string;
	/** 0..5 */
	rating?: number;
	createdAt?: string;
	dimensions?: string;
};

// ---- 虚拟数据（确定性，避免 SSR/CSR hydration 不一致） ----

const FOLDERS = ["素材库", "参考图", "灵感板", "项目 A", "收藏"];
const TAGS_POOL = ["设计", "风景", "人像", "UI", "图标", "插画", "摄影", "纹理"];
const RATIOS = [0.75, 0.8, 1, 1.25, 1.33, 1.5, 1.6, 0.85];
const DESC = ["灵感参考素材", "项目配色收集", "构图与版式练习", "纹理与材质库", "视觉风格存档"];

function imgUrl(seed: string, ratio: number) {
	const w = 600;
	const h = Math.round(w / ratio);
	return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

export const mediaWaterfallMockData: MediaItem[] = Array.from(
	{ length: 18 },
	(_, i) => {
		const ratio = RATIOS[i % RATIOS.length];
		const seed = `mira-${i + 1}`;
		const w = 1280 + i * 24;
		return {
			id: seed,
			src: imgUrl(seed, ratio),
			ratio,
			title: `素材 ${String(i + 1).padStart(2, "0")}.png`,
			size: `${(((i * 7 + 3) % 45) / 10 + 0.4).toFixed(1)} MB`,
			folder: FOLDERS[i % FOLDERS.length],
			tags: [TAGS_POOL[i % TAGS_POOL.length], TAGS_POOL[(i + 3) % TAGS_POOL.length]],
			kind: i % 7 === 0 ? "video" : "image",
			rating: (i * 3) % 6, // 0..5
			dimensions: `${w} × ${Math.round(w / ratio)}`,
			createdAt: `2026-0${(i % 7) + 1}-${10 + (i % 18)}`,
			website: i % 3 === 0 ? "https://mira.app" : undefined,
			description: DESC[i % DESC.length],
		};
	},
);

// ---- 卡片 ----

type CardProps = {
	item: MediaItem;
	active: boolean;
	onSelect: (item: MediaItem) => void;
};

function MediaWaterfallCard({ item, active, onSelect }: CardProps) {
	return (
		<div
			role="button"
			tabIndex={0}
			aria-pressed={active}
			onClick={() => onSelect(item)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(item);
				}
			}}
			className={cn(
				"group relative block w-full cursor-pointer overflow-hidden rounded-xl outline-none transition-all duration-200",
				"focus-visible:ring-2 focus-visible:ring-primary",
				active
					? "ring-2 ring-primary"
					: "shadow-sm hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(99,102,241,0.15)]",
			)}
		>
			<div
				className="relative w-full overflow-hidden"
				style={{ aspectRatio: `${item.ratio}` }}
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={item.src}
					alt={item.title}
					loading="lazy"
					className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-105"
				/>

				{/* 视频播放标 */}
				{item.kind === "video" && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="rounded-full bg-black/50 p-3 backdrop-blur-sm">
							<Play className="size-6 fill-white text-white" />
						</div>
					</div>
				)}

				{/* 选中勾选圆点 */}
				{active && (
					<div className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
						<Check className="size-3.5" strokeWidth={3} />
					</div>
				)}

				{/* 底部玻璃信息浮层（常显，还原原版） */}
				<div
					className={cn(
						"absolute inset-x-0 bottom-0 space-y-0.5 rounded-b-xl p-2 backdrop-blur-sm",
						active ? "bg-primary/90" : "bg-white/70 dark:bg-muted/70",
					)}
				>
					<h3
						className={cn(
							"truncate text-sm font-medium",
							active ? "text-white" : "text-foreground",
						)}
					>
						{item.title}
					</h3>
					{item.size && (
						<p
							className={cn(
								"truncate text-xs",
								active ? "text-white/85" : "text-muted-foreground",
							)}
						>
							{item.size}
						</p>
					)}
					{(item.folder || (item.tags?.length ?? 0) > 0) && (
						<div className="flex flex-wrap gap-1 pt-0.5">
							{item.folder && (
								<span
									className={cn(
										"inline-flex max-w-[100px] items-center gap-0.5 truncate rounded-full px-1.5 py-0.5 text-[10px]",
										active ? "bg-white/25 text-white" : "bg-primary/10 text-primary",
									)}
								>
									<Folder className="size-2.5" />
									{item.folder}
								</span>
							)}
							{(item.tags ?? [])
								.slice(0, 5)
								.map((t) => (
									<span
										key={t}
										className={cn(
											"max-w-[80px] truncate rounded-full px-1.5 py-0.5 text-[10px]",
											active ? "bg-white/25 text-white" : "bg-primary/10 text-primary",
										)}
									>
										{t}
									</span>
								))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ---- 容器 ----

export type MediaWaterfallProps = {
	items?: MediaItem[];
	/**
	 * 作用在多列容器上的 className，默认响应式 2/3/4 列。
	 * 可传 `columns-3 [column-gap:1.25rem]` 等覆盖。
	 */
	className?: string;
	/** 当前活跃项 id（受控）；不传则内部自管 */
	activeId?: string | null;
	/** 点击卡片切换活跃项时回调，取消时传 null */
	onActiveItemChange?: (item: MediaItem | null) => void;
};

export function MediaWaterfall({
	items = mediaWaterfallMockData,
	className,
	activeId: activeIdProp,
	onActiveItemChange,
}: MediaWaterfallProps) {
	const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
	const activeId = activeIdProp !== undefined ? activeIdProp : internalActiveId;

	const handleSelect = useCallback(
		(item: MediaItem) => {
			const nextActive = activeId === item.id ? null : item.id;
			if (activeIdProp === undefined) setInternalActiveId(nextActive);
			const nextItem = nextActive ? item : null;
			onActiveItemChange?.(nextItem);
		},
		[activeId, activeIdProp, onActiveItemChange],
	);

	return (
		<div
			className={cn(
				"columns-2 [column-gap:1rem] md:columns-3 lg:columns-4",
				className,
			)}
		>
			{items.map((item, i) => (
				<motion.div
					key={item.id}
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.4,
						delay: Math.min(i * 0.04, 0.5),
						ease: [0.23, 1, 0.32, 1],
					}}
					className="mb-4 break-inside-avoid"
				>
					<MediaWaterfallCard
						item={item}
						active={item.id === activeId}
						onSelect={handleSelect}
					/>
				</motion.div>
			))}
		</div>
	);
}

/**
 * 默认 demo 入口（含虚拟数据）。
 */
export default function MediaWaterfallDemo() {
	return (
		<div className="w-full">
			<MediaWaterfall />
		</div>
	);
}
