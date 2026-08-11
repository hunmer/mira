"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ImageItem {
  src: string;
  alt: string;
}

interface FeatureItem {
  images: ImageItem[];
}

/** 断点：小于该宽度视为移动端（原组件内置值 768） */
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    media.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

interface Iphone15ProProps extends React.ComponentProps<"svg"> {
  width?: string | number;
  height?: string | number;
  src?: string;
  alt?: string;
}

/** iPhone 15 Pro 外壳（SVG）。截图通过 foreignObject 内嵌到屏幕区域，圆角裁剪。 */
function Iphone15Pro({
  width = "100%",
  height = "auto",
  src,
  alt = "iPhone screen content",
  className,
  ...props
}: Iphone15ProProps) {
  return (
    <div className={cn("relative", className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 433 882"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-500 ease-in-out"
        {...props}
      >
        {/* 外框 */}
        <path
          d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z"
          className="dark:fill-[#DADADA] fill-[#404040]"
        />
        {/* 左侧音量键 */}
        <path
          d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z"
          className="dark:fill-[#DADADA] fill-[#404040]"
        />
        <path
          d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z"
          className="dark:fill-[#DADADA] fill-[#404040]"
        />
        <path
          d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z"
          className="dark:fill-[#DADADA] fill-[#404040]"
        />
        {/* 右侧电源键 */}
        <path
          d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z"
          className="dark:fill-[#DADADA] fill-[#404040]"
        />
        {/* 屏幕底板 */}
        <path
          d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z"
          className="fill-[#262626] dark:fill-gradient-to-b dark:from-white dark:to-[#F0F0F0]"
        />
        {/* 顶部静音/扬声器条 */}
        <path
          opacity="0.5"
          d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z"
          className="dark:fill-[#DADADA] fill-[#404040]"
        />
        {/* 屏幕显示区（含投影） */}
        <path
          d="M21.25 75C21.25 44.2101 46.2101 19.25 77 19.25H355C385.79 19.25 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 21.25 837.79 21.25 807V75Z"
          className="dark:fill-[#F5F5F5] fill-[#404040] dark:stroke-[#E0E0E0] stroke-[#404040] stroke-[0.5]"
          filter="drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.1))"
        />
        {/* 截图内容：foreignObject 嵌入普通 img，圆角裁剪 */}
        {src && (
          <foreignObject
            x="21.25"
            y="19.25"
            width="389.5"
            height="843.5"
            clipPath="url(#roundedCorners)"
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
              }}
            >
              <img
                src={src}
                alt={alt}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </foreignObject>
        )}
        {/* 灵动岛外框 */}
        <path
          d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z"
          className="fill-[#262626] dark:fill-[#F0F0F0] dark:drop-shadow-sm"
        />
        {/* 摄像头外圈 */}
        <path
          d="M249 48.5C249 42.701 253.701 38 259.5 38C265.299 38 270 42.701 270 48.5C270 54.299 265.299 59 259.5 59C253.701 59 249 54.299 249 48.5Z"
          className="fill-[#262626] dark:fill-[#F0F0F0]"
        />
        {/* 摄像头镜头 */}
        <path
          d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z"
          className="fill-[#262626] dark:fill-[#E0E0E0]"
        />
        {/* 屏幕描边（仅暗色） */}
        <path
          d="M76 4C37.3401 4 6 35.3401 6 74V808C6 846.66 37.3401 878 76 878H356C394.66 878 426 846.66 426 808V74C426 35.3401 394.66 4 356 4H76Z"
          className="fill-transparent dark:stroke-white/20 stroke-[0.5] stroke-transparent"
        />
        <defs>
          <clipPath id="roundedCorners">
            <rect
              x="21.25"
              y="19.25"
              width="389.5"
              height="843.5"
              rx="55.75"
              ry="55.75"
            />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

interface PhoneCarouselProps {
  images: ImageItem[];
  className?: string;
  /** 特性模式：三屏堆叠展示（前/当前/后） */
  featureMode?: boolean;
  featuresData?: FeatureItem[];
  activeFeatureIndex?: number;
}

/** 自动旋转的 iPhone 截图轮播，含上一张/暂停/下一张控制。 */
export function PhoneCarousel({
  images,
  className,
  featureMode,
  featuresData,
  activeFeatureIndex = 0,
}: PhoneCarouselProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 自动轮播：非特性模式、未暂停、未悬停时每 3s 切换
  useEffect(() => {
    if (featureMode) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!isPaused && !isHovered) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPaused, isHovered, images.length, featureMode]);

  if (!mounted) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-96 w-64 animate-pulse rounded-3xl" />
      </div>
    );
  }

  // 特性模式：展示前一张 / 当前 / 后一张，居中堆叠
  if (featureMode && featuresData) {
    const total = featuresData.length;
    const current = activeFeatureIndex;
    const prevIdx = (current - 1 + total) % total;
    const nextIdx = (current + 1) % total;
    const prevImg = featuresData[prevIdx].images[0];
    const currentImg = featuresData[current].images[0];
    const nextImg = featuresData[nextIdx].images[0];

    return (
      <section
        className={cn(
          "relative w-full overflow-visible py-6 md:py-10",
          className
        )}
        aria-label="iPhone product showcase in feature mode"
      >
        <div className="relative h-[600px] w-full sm:h-[650px] lg:h-[700px]">
          <div className="absolute left-1/2 top-0 transform -translate-x-1/2">
            <div
              className="absolute opacity-60"
              style={{ transform: "translateY(-20px) scale(0.92)", zIndex: 10 }}
            >
              <Iphone15Pro
                width={isMobile ? 280 : 350}
                height="auto"
                src={prevImg.src}
                alt={prevImg.alt}
              />
            </div>
            <div
              className="absolute opacity-80"
              style={{ transform: "translateY(25px) scale(0.96)", zIndex: 20 }}
            >
              <Iphone15Pro
                width={isMobile ? 280 : 350}
                height="auto"
                src={nextImg.src}
                alt={nextImg.alt}
              />
            </div>
            <div
              className="relative"
              style={{ transform: "translateY(70px) scale(1)", zIndex: 30 }}
            >
              <Iphone15Pro
                width={isMobile ? 280 : 350}
                height="auto"
                src={currentImg.src}
                alt={currentImg.alt}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const handlePrevious = () =>
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const handleNext = () =>
    setCurrentIndex((prev) => (prev + 1) % images.length);
  const togglePause = () => setIsPaused((prev) => !prev);

  return (
    <section
      className="relative w-full overflow-hidden py-6 md:py-10"
      aria-label="iPhone product showcase"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div
            ref={containerRef}
            className="flex h-[410px] items-start justify-center md:h-[510px] lg:h-[520px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="relative flex w-full justify-center">
              {images.map((image, index) => {
                const isCurrent = index === currentIndex;
                const isPrev =
                  index === currentIndex - 1 ||
                  (currentIndex === 0 && index === images.length - 1);
                const isNext =
                  index === currentIndex + 1 ||
                  (currentIndex === images.length - 1 && index === 0);

                return (
                  <div
                    key={image.src + index}
                    className={cn(
                      "absolute transform transition-all duration-700 ease-in-out",
                      isCurrent
                        ? "z-20 scale-100"
                        : "scale-90 opacity-0",
                      isPrev ? "z-10 -translate-x-[10%] opacity-30" : "",
                      isNext ? "z-10 translate-x-[10%] opacity-30" : "",
                      !isCurrent && !isPrev && !isNext ? "opacity-0" : ""
                    )}
                    style={{
                      top: "0",
                      transform: `translateY(0px) ${
                        isPrev
                          ? "translateX(-60%)"
                          : isNext
                            ? "translateX(60%)"
                            : "translateX(0)"
                      } ${isCurrent ? "scale(1)" : "scale(0.9)"}`,
                    }}
                    aria-hidden={!isCurrent}
                  >
                    <div className="group">
                      <Iphone15Pro
                        width={isMobile ? 280 : 350}
                        height="auto"
                        src={image.src}
                        alt={image.alt}
                        className="transition-all duration-100 hover:-rotate-6 hover:scale-105"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 控制条：上一张 / 暂停 / 下一张 */}
          <div className="absolute bottom-8 left-0 right-0 z-30 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              className="rounded-full border-white/20 bg-black/60 shadow-md backdrop-blur-sm hover:bg-black/80"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePause}
              className="rounded-full border-white/20 bg-black/60 shadow-md backdrop-blur-sm hover:bg-black/80"
              aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
            >
              {isPaused ? (
                <Play className="h-5 w-5 text-white" />
              ) : (
                <Pause className="h-5 w-5 text-white" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="rounded-full border-white/20 bg-black/60 shadow-md backdrop-blur-sm hover:bg-black/80"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
