"use client";

import * as React from "react";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export type CoverflowOrientation = "horizontal" | "vertical";

export interface CoverflowSlide {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
}

export interface CoverflowCarouselProps {
  slides: CoverflowSlide[];
  /** Degrees the first neighbour tilts. */
  rotate?: number;
  /** How far the first neighbour recedes, as a fraction of card width. */
  depth?: number;
  /** Viewer distance as a multiple of card width — smaller is a wider lens. */
  perspective?: number;
  /** Exponent on distance. Below 1 the rake eases off as cards travel out. */
  falloff?: number;
  /** Opacity lost per step from the centre. */
  fade?: number;
  /** Any CSS length. Everything else is derived from it, so the rake scales. */
  cardWidth?: string;
  /** Space between cards, as a fraction of card width. */
  gap?: number;
  loop?: boolean;
  /** 排列方向：水平（默认）或垂直。垂直模式需经 className/父容器给定高度。 */
  orientation?: CoverflowOrientation;
  showCaption?: boolean;
  showPagination?: boolean;
  showNavigation?: boolean;
  /** Names the carousel for assistive tech. */
  label?: string;
  className?: string;
  cardClassName?: string;
  /** 中心卡片变化时回调，返回当前居中卡片索引（用于联动外部展示）。 */
  onSelect?: (index: number) => void;
}

export function CoverflowCarousel({
  slides,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(148px, 22vw, 260px)",
  gap = 0.05,
  loop = true,
  orientation = "horizontal",
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  label = "Cover carousel",
  className,
  cardClassName,
  onSelect,
}: CoverflowCarouselProps) {
  const count = slides.length;
  const isVertical = orientation === "vertical";

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  /** Fractional card index at the centre. The single source of truth. */
  const posRef = React.useRef(0);
  /** Where the current settle is headed. Stepping off `pos` instead would
      swallow a keypress that lands mid-flight, before the round-off moves. */
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    /** 拖拽起点的轴向坐标（水平=clientX，垂直=clientY）。 */
    x: number;
    pos: number;
    v: number;
    t: number;
  } | null>(null);
  /** 本次按压是否产生过拖拽移动 —— 区分"点击"与"拖拽"，避免拖拽尾段误触发点击跳转。 */
  const dragMovedRef = React.useRef(false);
  /** pointerdown 时落点的卡片索引；抬起时若未拖拽则视为点击该卡片。 */
  const downIndexRef = React.useRef<number | null>(null);

  const [selected, setSelected] = React.useState(0);

  /** Nearest whole card, folded back into 0..count-1. */
  const indexAt = React.useCallback(
    (pos: number) => ((Math.round(pos) % count) + count) % count,
    [count],
  );

  // Paint straight to the DOM. Sixty state updates a second would re-render
  // every card for numbers React never needs to see.
  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      // Fold the distance into the shorter way round the ring. This is the
      // whole looping mechanism — no cloned nodes, no shuffling the DOM.
      let offset = index - pos;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      // Both the tilt and the recession ease off as cards travel out —
      // doubling the distance adds only about half again as much of each.
      // A linear ramp folds the second card shut; this keeps it readable.
      const ramp = Math.pow(distance, falloff);
      // Capped short of edge-on so a far card never turns its back.
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      // 主轴位移 + 绕副轴旋转：水平用 translateX/rotateY，垂直用 translateY/rotateX。
      const translate = isVertical
        ? `translateY(calc(-50% + ${offset * pitch}px))`
        : `translateX(calc(-50% + ${offset * pitch}px))`;
      const rotation = isVertical
        ? `rotateX(${-tilt}deg)`
        : `rotateY(${-tilt}deg)`;

      card.style.transform =
        `${translate} translateZ(${-depth * width * ramp}px) ${rotation}`;

      // A card is teleported across the ring at exactly half a turn out, so it
      // has to be gone by then or the jump is visible.
      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, isVertical, loop, rotate]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        // ponytail: exponential ease-out, not a spring. Swap in a spring only
        // if the settle needs overshoot.
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint],
  );

  const clamp = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  );

  const goTo = React.useCallback(
    (index: number) => {
      // Take the shorter way round rather than unwinding the whole ring.
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle],
  );

  const nudge = React.useCallback(
    (by: number) => settle(clamp(Math.round(targetRef.current) + by)),
    [clamp, settle],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    dragRef.current = {
      id: event.pointerId,
      x: isVertical ? event.clientY : event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    };
    // 记录按压起点：未拖拽时，抬起即视为点击该卡片。
    dragMovedRef.current = false;
    const cardEl = (event.target as HTMLElement).closest("[data-index]");
    downIndexRef.current = cardEl
      ? Number(cardEl.getAttribute("data-index"))
      : null;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    const clientAxis = isVertical ? event.clientY : event.clientX;
    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clamp(drag.pos - (clientAxis - drag.x) / pitch);
    // Cards per second, for the throw.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;
    dragMovedRef.current = true;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    // 纯点击（无拖拽移动）：将该卡片转至中心；否则按惯性 throw。
    if (!dragMovedRef.current && downIndexRef.current != null) {
      goTo(downIndexRef.current);
      return;
    }
    // Let a flick carry, but never more than two cards.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clamp(Math.round(posRef.current + carried)));
  };

  // Card width drives pitch, depth and perspective, so it is the only thing
  // worth measuring — and only when the box actually changes.
  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // 中心卡片变化时通知外部，用于联动 SafariBrowser 切换展示内容。
  React.useEffect(() => {
    onSelect?.(selected);
  }, [selected, onSelect]);

  const active = slides[selected];

  return (
    <div
      className={cn("w-full", isVertical && "flex h-full flex-col", className)}
      style={{ ["--cf-card" as string]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="relative flex-1">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (isVertical) {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                nudge(-1);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                nudge(1);
              }
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(1);
            }
          }}
          // Cross-axis padding keeps the drop shadows clear of the overflow clip.
          className={cn(
            "cursor-grab overflow-hidden outline-none ring-ring focus-visible:ring-2 active:cursor-grabbing",
            isVertical ? "h-full min-h-0 px-4" : "py-10",
          )}
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            // The carousel owns its main axis; the page keeps cross-axis scrolling.
            touchAction: isVertical ? "pan-x" : "pan-y",
          }}
        >
          <div
            className={cn("relative select-none", isVertical && "mx-auto")}
            style={
              isVertical
                ? {
                    width: "var(--cf-card)",
                    height: "100%",
                    transformStyle: "preserve-3d",
                  }
                : {
                    height: "var(--cf-card)",
                    transformStyle: "preserve-3d",
                  }
            }
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                data-index={index}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                className={cn(
                  "absolute aspect-square cursor-pointer overflow-hidden rounded-2xl bg-muted shadow-xl will-change-transform",
                  isVertical ? "left-0 top-1/2" : "left-1/2 top-0",
                  cardClassName,
                )}
                style={{ width: "var(--cf-card)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.src}
                  alt={slide.alt}
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => nudge(-1)}
              className={cn(
                "absolute z-[200] rounded-full bg-background/70 p-2 text-foreground backdrop-blur transition hover:bg-background",
                isVertical
                  ? "left-1/2 top-3 -translate-x-1/2"
                  : "left-3 top-1/2 -translate-y-1/2",
              )}
            >
              {isVertical ? (
                <ChevronUp className="size-5" />
              ) : (
                <ChevronLeft className="size-5" />
              )}
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => nudge(1)}
              className={cn(
                "absolute z-[200] rounded-full bg-background/70 p-2 text-foreground backdrop-blur transition hover:bg-background",
                isVertical
                  ? "bottom-3 left-1/2 -translate-x-1/2"
                  : "right-3 top-1/2 -translate-y-1/2",
              )}
            >
              {isVertical ? (
                <ChevronDown className="size-5" />
              ) : (
                <ChevronRight className="size-5" />
              )}
            </button>
          </>
        )}
      </div>

      {showCaption && active?.title && (
        <div
          key={selected}
          className="mt-2 flex shrink-0 flex-col items-center px-6 duration-300 animate-in fade-in"
        >
          <p className="text-[15px] font-semibold tracking-tight text-foreground">
            {active.title}
          </p>
          {active.subtitle && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {active.subtitle}
            </p>
          )}
          {active.meta && active.meta.length > 0 && (
            <dl className="mt-10 w-full max-w-[230px] text-[12px]">
              {active.meta.map((row) => (
                <div key={row.label} className="flex justify-between py-[5px]">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {showPagination && (
        <div className="mt-6 flex shrink-0 items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cn(
                "size-2 rounded-full bg-foreground transition-opacity",
                index === selected ? "opacity-100" : "opacity-30",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
