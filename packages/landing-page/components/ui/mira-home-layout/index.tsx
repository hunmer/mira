"use client";

/**
 * MiraHomeLayout —— 从 mira-client 的 HomeView 复刻的三列布局 tsx 组件。
 *
 * 还原 HomeView/index.vue 的整体结构：
 *  - 玻璃态渐变背景 + 右上角悬浮 HomeHeader（含主题切换）
 *  - 三列可拖拽面板（react-resizable-panels）：左栏侧边栏 / 中间 Tabs+内容 / 右栏详情
 *  - 左栏：素材库选择器 + 工具栏 + 折叠模块（快捷分类 / 多级文件夹树 / 标签）
 *  - 中间：Tabs 条（motion layoutId 滑动指示器）+ 玻璃内容面板（内嵌响应式瀑布流）
 *  - 右栏：插件贡献条 + 媒体详情面板（预览图 / 文件名 / 评分 / 标签 / 元信息）
 *
 * 三栏数据联动（虚拟数据 + 简单交互）：
 *  - 点击左栏文件夹/标签 → 过滤中间瀑布流
 *  - 点击中间卡片 → 右栏详情同步
 */

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useTheme } from "next-themes";
import {
	ArrowDown,
	ArrowDownAZ,
	ArrowLeft,
	ArrowUp,
	Check,
	ChevronDown,
	ChevronRight,
	Clock,
	Command,
	Database,
	Eye,
	Folder as FolderIcon,
	FolderOpen,
	Globe,
	Hash,
	Image as ImageIcon,
	Info,
	Keyboard,
	Layers,
	MoonStar,
	Palette,
	Puzzle,
	Search,
	Settings,
	Star,
	SunDim,
	Tag as TagIcon,
	Trash2,
	Upload,
	type LucideIcon,
} from "lucide-react";
import {
	MediaWaterfall,
	type MediaItem,
	mediaWaterfallMockData,
} from "@/components/ui/media-waterfall";
import { cn } from "@/lib/utils";

// ---- 虚拟数据 ----

type FolderNode = {
	id: string;
	title: string;
	count: number;
	children?: FolderNode[];
};
type TagNode = { id: string; title: string; count: number; color: string };

const LIBRARY = { name: "我的素材库", count: 128 };

const SHORTCUTS: {
	id: string;
	label: string;
	icon: LucideIcon;
	count: number;
	danger?: boolean;
}[] = [
	{ id: "all", label: "全部", icon: FolderOpen, count: 128 },
	{ id: "uncategorized", label: "未分类", icon: FolderIcon, count: 12 },
	{ id: "untagged", label: "未标签", icon: TagIcon, count: 8 },
	{ id: "trash", label: "回收站", icon: Trash2, count: 3, danger: true },
];

const FOLDERS: FolderNode[] = [
	{
		id: "f1",
		title: "设计稿",
		count: 24,
		children: [
			{ id: "f1-1", title: "Logo", count: 8 },
			{ id: "f1-2", title: "海报", count: 6 },
			{ id: "f1-3", title: "网页", count: 10 },
		],
	},
	{ id: "f2", title: "参考图", count: 18 },
	{
		id: "f3",
		title: "灵感板",
		count: 12,
		children: [
			{ id: "f3-1", title: "配色", count: 5 },
			{ id: "f3-2", title: "排版", count: 7 },
		],
	},
	{ id: "f4", title: "项目 A", count: 9 },
	{ id: "f5", title: "收藏", count: 31 },
];

const TAGS: TagNode[] = [
	{ id: "t1", title: "设计", count: 20, color: "#6366f1" },
	{ id: "t2", title: "风景", count: 14, color: "#10b981" },
	{ id: "t3", title: "人像", count: 8, color: "#f59e0b" },
	{ id: "t4", title: "UI", count: 16, color: "#ec4899" },
	{ id: "t5", title: "插画", count: 7, color: "#8b5cf6" },
];

const PLUGINS: {
	id: string;
	name: string;
	desc: string;
	icon: LucideIcon;
	color: string;
}[] = [
	{ id: "p1", name: "智能标签", desc: "AI 自动打标", icon: TagIcon, color: "#6366f1" },
	{ id: "p2", name: "颜色提取", desc: "主色板生成", icon: Palette, color: "#ec4899" },
	{ id: "p3", name: "相似推荐", desc: "以图搜图", icon: Search, color: "#10b981" },
];

const FILTERS: { id: string; label: string; icon: LucideIcon }[] = [
	{ id: "folders", label: "文件夹", icon: FolderIcon },
	{ id: "tags", label: "标签", icon: Hash },
	{ id: "category", label: "类别", icon: ImageIcon },
	{ id: "size", label: "大小", icon: Database },
];

const SORTS: { id: string; label: string; icon: LucideIcon }[] = [
	{ id: "name", label: "名称", icon: ArrowDownAZ },
	{ id: "size", label: "大小", icon: Database },
	{ id: "createdAt", label: "时间", icon: Clock },
];

// 所有文件夹 title（顶层 + 叶子），用于把虚拟素材分配到叶子，使层级筛选都有结果
const ALL_FOLDER_TITLES = FOLDERS.flatMap((f) => [
	f.title,
	...(f.children?.map((c) => c.title) ?? []),
]);

const ITEMS: MediaItem[] = mediaWaterfallMockData.map((it, i) => ({
	...it,
	folder: ALL_FOLDER_TITLES[i % ALL_FOLDER_TITLES.length],
	tags: [TAGS[i % TAGS.length].title, TAGS[(i + 2) % TAGS.length].title],
}));

const TABS = [
	{ id: "home", label: "首页" },
	{ id: "all", label: "全部素材" },
] as const;

type Filter =
	| { kind: "shortcut"; id: string }
	| { kind: "folder"; title: string }
	| { kind: "tag"; title: string };

// ---- 玻璃态样式常量 ----

const GLASS_PANEL =
	"rounded-2xl border border-black/10 bg-white/50 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-muted/60";
const HANDLE_CLASS =
	"group/handle relative w-3 bg-transparent transition-colors hover:bg-primary/5 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent after:transition-colors hover:after:bg-primary/40";

// ============================================================
// 左栏：侧边栏
// ============================================================

function Sidebar({
	filter,
	onFilterChange,
}: {
	filter: Filter;
	onFilterChange: (f: Filter) => void;
}) {
	return (
		<aside className="flex h-full flex-col overflow-hidden">
			{/* 素材库选择器 */}
			<div className="flex items-center gap-2 border-b border-black/5 px-3 py-3 dark:border-white/5">
				<div className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
					<Layers className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-[10px] text-muted-foreground">素材库</div>
					<div className="truncate text-sm font-medium">{LIBRARY.name}</div>
				</div>
				<ChevronDown className="size-4 text-muted-foreground" />
			</div>

			{/* 工具栏 */}
			<div className="flex items-center gap-0.5 border-b border-black/5 px-2 py-1.5 dark:border-white/5">
				<IconBtn title="导入">
					<Upload className="size-4" />
				</IconBtn>
				<IconBtn title="新建文件夹">
					<FolderIcon className="size-4" />
				</IconBtn>
				<IconBtn title="标签管理">
					<TagIcon className="size-4" />
				</IconBtn>
				<div className="flex-1" />
				<IconBtn title="搜索">
					<Search className="size-4" />
				</IconBtn>
			</div>

			{/* 模块列表（可滚动） */}
			<div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
				<Section title="快捷分类" defaultOpen>
					{SHORTCUTS.map((s) => (
						<SidebarRow
							key={s.id}
							icon={
								<s.icon
									className={cn("size-3.5", s.danger && "text-destructive")}
								/>
							}
							label={s.label}
							count={s.count}
							active={filter.kind === "shortcut" && filter.id === s.id}
							onClick={() => onFilterChange({ kind: "shortcut", id: s.id })}
						/>
					))}
				</Section>

				<Section title="文件夹" defaultOpen>
					<FolderTree
						nodes={FOLDERS}
						filter={filter}
						onFilter={onFilterChange}
					/>
				</Section>

				<Section title="标签" defaultOpen>
					{TAGS.map((t) => (
						<SidebarRow
							key={t.id}
							icon={
								<span
									className="size-2.5 rounded-full"
									style={{ backgroundColor: t.color }}
								/>
							}
							label={t.title}
							count={t.count}
							active={filter.kind === "tag" && filter.title === t.title}
							onClick={() => onFilterChange({ kind: "tag", title: t.title })}
						/>
					))}
				</Section>
			</div>

			{/* 底部命令面板入口 */}
			<div className="shrink-0 border-t border-black/5 p-2 dark:border-white/5">
				<button
					type="button"
					className="flex w-full items-center gap-2 rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
				>
					<Command className="size-3.5" />
					<span>打开命令面板</span>
					<span className="ml-auto rounded bg-black/5 px-1 py-0.5 text-[10px] dark:bg-white/10">
						⌘K
					</span>
				</button>
			</div>
		</aside>
	);
}

/** 多级文件夹树（递归） */
function FolderTree({
	nodes,
	filter,
	onFilter,
}: {
	nodes: FolderNode[];
	filter: Filter;
	onFilter: (f: Filter) => void;
}) {
	return (
		<div className="space-y-0.5">
			{nodes.map((n) => (
				<FolderTreeNode
					key={n.id}
					node={n}
					depth={0}
					filter={filter}
					onFilter={onFilter}
				/>
			))}
		</div>
	);
}

function FolderTreeNode({
	node,
	depth,
	filter,
	onFilter,
}: {
	node: FolderNode;
	depth: number;
	filter: Filter;
	onFilter: (f: Filter) => void;
}) {
	const [open, setOpen] = useState(true);
	const hasChildren = !!node.children?.length;
	const active = filter.kind === "folder" && filter.title === node.title;
	return (
		<div>
			<div
				className={cn(
					"flex items-center gap-1 rounded-lg py-1 pr-2 text-xs transition-colors",
					active
						? "bg-primary/10 text-primary"
						: "text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5",
				)}
				style={{ paddingLeft: depth * 10 }}
			>
				<button
					type="button"
					onClick={() => hasChildren && setOpen((o) => !o)}
					className={cn(
						"grid w-4 shrink-0 place-items-center text-muted-foreground",
						!hasChildren && "invisible",
					)}
				>
					<ChevronRight
						className={cn("size-3 transition-transform", open && "rotate-90")}
					/>
				</button>
				<button
					type="button"
					onClick={() => onFilter({ kind: "folder", title: node.title })}
					className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
				>
					{active ? (
						<FolderOpen className="size-3.5 shrink-0" />
					) : (
						<FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
					)}
					<span className="flex-1 truncate">{node.title}</span>
					<span className="text-[10px] text-muted-foreground">{node.count}</span>
				</button>
			</div>
			{hasChildren && open && (
				<div
					className="ml-3 border-l border-black/5 dark:border-white/5"
					style={{ marginLeft: depth * 10 + 10 }}
				>
					{node.children?.map((c) => (
						<FolderTreeNode
							key={c.id}
							node={c}
							depth={depth + 1}
							filter={filter}
							onFilter={onFilter}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function Section({
	title,
	defaultOpen,
	children,
}: {
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen ?? true);
	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ChevronRight
					className={cn("size-3 transition-transform", open && "rotate-90")}
				/>
				<span className="flex-1 text-left">{title}</span>
			</button>
			{open && <div className="mt-0.5 space-y-0.5">{children}</div>}
		</div>
	);
}

function SidebarRow({
	icon,
	label,
	count,
	active,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	count?: number;
	active?: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors",
				active
					? "bg-primary/10 text-primary"
					: "text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5",
			)}
		>
			<span className="grid size-4 place-items-center">{icon}</span>
			<span className="flex-1 truncate text-left">{label}</span>
			{count != null && (
				<span className="text-[10px] text-muted-foreground">{count}</span>
			)}
		</button>
	);
}

function IconBtn({ title, children }: { title: string; children: ReactNode }) {
	return (
		<button
			type="button"
			title={title}
			className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
		>
			{children}
		</button>
	);
}

// ============================================================
// 中间：Tabs 条（motion layoutId 滑动指示器）+ 内容
// ============================================================

function TabsBar({
	activeTab,
	onTabChange,
}: {
	activeTab: string;
	onTabChange: (id: string) => void;
}) {
	return (
		<div className="flex h-12 shrink-0 items-end gap-1 px-2">
			<button
				type="button"
				title="返回"
				className="mb-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-primary dark:hover:bg-white/5"
			>
				<ArrowLeft className="size-4" />
			</button>
			<LayoutGroup id="mira-home-tabs">
				<div className="flex h-full items-end gap-1">
					{TABS.map((t) => {
						const active = activeTab === t.id;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => onTabChange(t.id)}
								className="relative flex h-9 items-center px-3 text-xs font-medium"
							>
								{active && (
									<motion.span
										layoutId="mira-home-tab-active"
										transition={{ type: "spring", stiffness: 400, damping: 32 }}
										className="absolute inset-0 rounded-t-lg border border-b-0 border-primary/40 bg-primary shadow-[0_-4px_16px_rgba(99,102,241,0.15)]"
									/>
								)}
								<span
									className={cn(
										"relative z-[1] transition-colors",
										active
											? "text-primary-foreground"
											: "text-muted-foreground hover:text-primary",
									)}
								>
									{t.label}
								</span>
							</button>
						);
					})}
				</div>
			</LayoutGroup>
		</div>
	);
}

// ============================================================
// 中间：顶部筛选条
// ============================================================

function FilterBar({
	allSelected,
	onToggleAll,
	sortField,
	sortOrder,
	onCycleField,
	onToggleOrder,
	search,
	onSearchChange,
}: {
	allSelected: boolean;
	onToggleAll: () => void;
	sortField: string;
	sortOrder: "asc" | "desc";
	onCycleField: () => void;
	onToggleOrder: () => void;
	search: string;
	onSearchChange: (v: string) => void;
}) {
	const current = SORTS.find((s) => s.id === sortField) ?? SORTS[0];
	return (
		<div className="flex shrink-0 items-center gap-2 border-b border-black/5 px-2 py-1.5 text-xs text-muted-foreground dark:border-white/5">
			<button
				type="button"
				onClick={onToggleAll}
				title="全选"
				className={cn(
					"grid size-4 place-items-center rounded border transition-colors",
					allSelected
						? "border-primary bg-primary text-primary-foreground"
						: "border-black/20 hover:border-primary dark:border-white/20",
				)}
			>
				{allSelected && <Check className="size-3" strokeWidth={3} />}
			</button>
			<Sep />
			<div className="flex items-center gap-0.5">
				{FILTERS.map((f) => (
					<button
						key={f.id}
						type="button"
						title={f.label}
						className="grid size-6 place-items-center rounded-md transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
					>
						<f.icon className="size-3.5" />
					</button>
				))}
			</div>
			<Sep />
			<button
				type="button"
				onClick={onCycleField}
				title="切换排序字段"
				className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
			>
				<current.icon className="size-3.5" />
				<span>{current.label}</span>
			</button>
			<button
				type="button"
				onClick={onToggleOrder}
				title="切换升降序"
				className="grid size-6 place-items-center rounded-md transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
			>
				{sortOrder === "asc" ? (
					<ArrowUp className="size-3.5" />
				) : (
					<ArrowDown className="size-3.5" />
				)}
			</button>
			<div className="ml-auto flex items-center gap-1 rounded-md border border-black/10 bg-white/60 px-2 py-1 dark:border-white/10 dark:bg-white/5">
				<Search className="size-3.5 text-muted-foreground" />
				<input
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="搜索素材..."
					className="w-32 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
				/>
			</div>
		</div>
	);
}

function Sep() {
	return <span className="h-4 w-px bg-black/10 dark:bg-white/10" />;
}

// ============================================================
// 中间：底部状态栏
// ============================================================

function StatusBar({
	crumbs,
	count,
	selectedCount,
	columnWidth,
	onColumnWidthChange,
}: {
	crumbs: string[];
	count: number;
	selectedCount: number;
	columnWidth: number;
	onColumnWidthChange: (v: number) => void;
}) {
	return (
		<footer className="flex shrink-0 items-center justify-between gap-2 border-t border-black/5 px-2 pt-2 text-xs dark:border-white/5">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<Breadcrumb items={crumbs} />
				<span className="shrink-0 text-muted-foreground">{count} 个文件</span>
			</div>
			<div className="flex shrink-0 items-center gap-4">
				{selectedCount > 0 && (
					<span className="font-medium text-primary">已选 {selectedCount}</span>
				)}
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">列宽</span>
					<input
						type="range"
						min={140}
						max={320}
						step={20}
						value={columnWidth}
						onChange={(e) => onColumnWidthChange(Number(e.target.value))}
						title="调整列宽"
						className="h-1 w-20 cursor-pointer appearance-none rounded-lg bg-black/10 dark:bg-white/10"
					/>
				</div>
				<button
					type="button"
					title="展示字段"
					className="grid size-7 place-items-center rounded-lg border border-black/10 bg-white/60 text-muted-foreground transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
				>
					<Eye className="size-3.5" />
				</button>
			</div>
		</footer>
	);
}

function Breadcrumb({ items }: { items: string[] }) {
	return (
		<div className="flex min-w-0 items-center gap-0.5 text-muted-foreground">
			{items.map((it, i) => (
				<Fragment key={`${it}-${i}`}>
					{i > 0 && <ChevronRight className="size-3 shrink-0" />}
					<span
						className={cn(
							"truncate",
							i === items.length - 1 && "text-foreground",
						)}
					>
						{it}
					</span>
				</Fragment>
			))}
		</div>
	);
}

// ============================================================
// 右栏：详情面板
// ============================================================

function DetailPanel({ item }: { item: MediaItem | null }) {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				{item ? <DetailContent item={item} /> : <DetailEmpty />}
			</div>
			<div className="grid shrink-0 grid-cols-1 border-t border-black/5 dark:border-white/5">
				<div className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground">
					<Info className="size-3.5" />
					详情
				</div>
			</div>
		</div>
	);
}

function DetailEmpty() {
	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<ImageIcon className="mb-3 size-10 text-muted-foreground/40" />
			<p className="text-sm text-muted-foreground">选择素材查看详情</p>
		</div>
	);
}

function DetailContent({ item }: { item: MediaItem }) {
	const ext = item.title.split(".").pop()?.toUpperCase() ?? "FILE";
	return (
		<div className="space-y-4">
			{/* 预览图 */}
			<div className="relative flex h-48 items-center justify-center">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={item.src}
					alt={item.title}
					className="max-h-full max-w-full rounded-xl object-contain"
				/>
				<div className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
					{ext}
				</div>
			</div>

			<Field label="文件名">
				<div className="rounded-md border border-black/10 bg-white/60 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5">
					{item.title}
				</div>
			</Field>

			<Field label="评分">
				<Stars value={item.rating ?? 0} />
			</Field>

			{item.description && (
				<Field label="备注">
					<p className="text-xs text-muted-foreground">{item.description}</p>
				</Field>
			)}

			{(item.folder || (item.tags?.length ?? 0) > 0) && (
				<div className="flex flex-wrap gap-1">
					{item.folder && (
						<Badge icon={<FolderIcon className="size-2.5" />}>{item.folder}</Badge>
					)}
					{(item.tags ?? []).map((t) => (
						<Badge key={t} icon={<Hash className="size-2.5" />}>
							{t}
						</Badge>
					))}
				</div>
			)}

			<Field label="信息">
				<dl className="space-y-1 text-xs">
					<MetaRow label="尺寸" value={item.dimensions} />
					<MetaRow label="大小" value={item.size} />
					<MetaRow label="添加时间" value={item.createdAt} />
					{item.website && (
						<div className="flex items-center justify-between gap-2">
							<dt className="text-muted-foreground">来源</dt>
							<a
								href={item.website}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 truncate text-primary hover:underline"
							>
								<Globe className="size-3 shrink-0" />
								{item.website.replace(/^https?:\/\//, "")}
							</a>
						</div>
					)}
				</dl>
			</Field>
		</div>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div>
			<label className="mb-1 block text-[11px] font-medium text-muted-foreground">
				{label}
			</label>
			{children}
		</div>
	);
}

function Stars({ value }: { value: number }) {
	return (
		<div className="flex items-center gap-0.5">
			{Array.from({ length: 5 }, (_, i) => (
				<Star
					key={i}
					className={cn(
						"size-4",
						i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
					)}
				/>
			))}
			<span className="ml-1 text-[10px] text-muted-foreground">{value}/5</span>
		</div>
	);
}

function Badge({ icon, children }: { icon: ReactNode; children: ReactNode }) {
	return (
		<span className="inline-flex max-w-[120px] items-center gap-0.5 truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
			{icon}
			{children}
		</span>
	);
}

function MetaRow({ label, value }: { label: string; value?: string }) {
	if (!value) return null;
	return (
		<div className="flex items-center justify-between gap-2">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="truncate">{value}</dd>
		</div>
	);
}

// ============================================================
// 右上角悬浮 Header（含主题切换）
// ============================================================

function FloatingHeader() {
	const { theme, setTheme } = useTheme();
	return (
		<div className="absolute right-3 top-3 z-30 flex items-center gap-0.5 rounded-full border border-black/10 bg-white/60 px-1.5 py-1 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-muted/60">
			<HeaderBtn
				title="切换主题"
				onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			>
				<SunDim className="hidden size-3.5 dark:block" />
				<MoonStar className="block size-3.5 dark:hidden" />
			</HeaderBtn>
			<HeaderBtn title="插件">
				<Puzzle className="size-3.5" />
			</HeaderBtn>
			<HeaderBtn title="快捷键">
				<Keyboard className="size-3.5" />
			</HeaderBtn>
			<HeaderBtn title="设置">
				<Settings className="size-3.5" />
			</HeaderBtn>
		</div>
	);
}

function HeaderBtn({
	title,
	children,
	danger,
	onClick,
}: {
	title: string;
	children: ReactNode;
	danger?: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className={cn(
				"grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/5",
				danger && "hover:bg-destructive hover:text-white",
			)}
		>
			{children}
		</button>
	);
}

// ============================================================
// 主组件
// ============================================================

export type MiraHomeLayoutProps = {
	className?: string;
};

export function MiraHomeLayout({ className }: MiraHomeLayoutProps = {}) {
	const [filter, setFilter] = useState<Filter>({
		kind: "shortcut",
		id: "all",
	});
	const [activeTab, setActiveTab] = useState<string>("home");
	const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [columnWidth, setColumnWidth] = useState(200);
	const [sortField, setSortField] = useState("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [allSelected, setAllSelected] = useState(false);
	const [search, setSearch] = useState("");

	const cycleField = () => {
		const idx = SORTS.findIndex((s) => s.id === sortField);
		setSortField(SORTS[(idx + 1) % SORTS.length].id);
	};
	const toggleOrder = () =>
		setSortOrder((o) => (o === "asc" ? "desc" : "asc"));

	const crumbs = useMemo<string[]>(() => {
		const base = ["素材库"];
		if (filter.kind === "shortcut") {
			const sc = SHORTCUTS.find((s) => s.id === filter.id);
			base.push(sc?.label ?? "全部");
		} else if (filter.kind === "folder") {
			base.push(filter.title);
		} else if (filter.kind === "tag") {
			base.push(`#${filter.title}`);
		}
		return base;
	}, [filter]);

	const filtered = useMemo(() => {
		let list: MediaItem[];
		switch (filter.kind) {
			case "folder":
				list = ITEMS.filter((i) => i.folder === filter.title);
				break;
			case "tag":
				list = ITEMS.filter((i) => i.tags?.includes(filter.title));
				break;
			case "shortcut":
				list = filter.id === "trash" ? [] : ITEMS;
				break;
			default:
				list = ITEMS;
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			list = list.filter(
				(i) =>
					i.title.toLowerCase().includes(q) ||
					i.tags?.some((t) => t.toLowerCase().includes(q)),
			);
		}
		const dir = sortOrder === "asc" ? 1 : -1;
		return [...list].sort((a, b) => {
			if (sortField === "name") return a.title.localeCompare(b.title) * dir;
			if (sortField === "size")
				return (parseFloat(a.size ?? "0") - parseFloat(b.size ?? "0")) * dir;
			if (sortField === "createdAt") {
				const va = a.createdAt ?? "";
				const vb = b.createdAt ?? "";
				return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
			}
			return 0;
		});
	}, [filter, sortField, sortOrder, search]);

	const handleActiveItemChange = (item: MediaItem | null) => {
		setActiveItem(item);
		setActiveId(item?.id ?? null);
	};

	return (
		<div
			className={cn(
				"relative flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted text-[13px]",
				className,
			)}
		>
			<FloatingHeader />

			<div className="flex min-h-0 flex-1 gap-3 p-3">
				<PanelGroup direction="horizontal" autoSaveId="mira-home-layout">
					{/* 左栏 */}
					<Panel
						defaultSize={18}
						minSize={14}
						maxSize={30}
						className={cn(GLASS_PANEL, "flex flex-col overflow-hidden")}
					>
						<Sidebar filter={filter} onFilterChange={setFilter} />
					</Panel>

					<PanelResizeHandle className={HANDLE_CLASS} />

					{/* 中间列 */}
					<Panel
						defaultSize={54}
						minSize={30}
						className="flex min-w-0 flex-col"
					>
						<TabsBar activeTab={activeTab} onTabChange={setActiveTab} />
						<div
							className={cn(
								GLASS_PANEL,
								"mt-1 flex min-h-0 flex-1 flex-col overflow-hidden",
							)}
						>
							<FilterBar
								allSelected={allSelected}
								onToggleAll={() => setAllSelected((v) => !v)}
								sortField={sortField}
								sortOrder={sortOrder}
								onCycleField={cycleField}
								onToggleOrder={toggleOrder}
								search={search}
								onSearchChange={setSearch}
							/>
							<main className="m-2 min-h-0 flex-1 overflow-y-auto rounded-xl border border-primary/30 p-2">
								<MediaWaterfall
									items={filtered}
									activeId={activeId}
									onActiveItemChange={handleActiveItemChange}
									columnWidth={columnWidth}
								/>
							</main>
							<StatusBar
								crumbs={crumbs}
								count={filtered.length}
								selectedCount={activeItem ? 1 : 0}
								columnWidth={columnWidth}
								onColumnWidthChange={setColumnWidth}
							/>
						</div>
					</Panel>

					<PanelResizeHandle className={HANDLE_CLASS} />

					{/* 右栏：可折叠详情 */}
					<Panel
						defaultSize={28}
						minSize={20}
						maxSize={40}
						collapsible
						collapsedSize={0}
						className="flex min-w-0 flex-col gap-3 pt-14"
					>
					{/* 插件图标横向占位 */}
					<div
						className={cn(GLASS_PANEL, "flex shrink-0 items-center gap-2 px-3 py-2")}
					>
						{PLUGINS.map((p) => (
							<button
								key={p.id}
								type="button"
								title={p.name}
								className="grid size-7 place-items-center rounded-md text-white transition-transform hover:scale-110"
								style={{ backgroundColor: p.color }}
							>
								<p.icon className="size-3.5" />
							</button>
						))}
					</div>
						{/* 详情面板：flex flex-col 让内部 DetailPanel 的 flex-1 撑满高度 */}
						<aside
							className={cn(
								GLASS_PANEL,
								"flex min-h-0 flex-1 flex-col overflow-hidden",
							)}
						>
							<DetailPanel item={activeItem} />
						</aside>
					</Panel>
				</PanelGroup>
			</div>
		</div>
	);
}

export default function MiraHomeLayoutDemo() {
	return (
		<div className="h-[80vh] min-h-[560px] w-full overflow-hidden rounded-2xl border">
			<MiraHomeLayout />
		</div>
	);
}
