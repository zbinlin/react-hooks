type ValueOf<T> = T[keyof T];

export const ScrollDirections = {
	vertical: "vertical",
    horizontal: "horizontal",
} as const;
export type ScrollDirections = ValueOf<typeof ScrollDirections>;

export const Anchors = {
    start: "start",
    middle: "middle",
    end: "end",
} as const;
export type Anchors = ValueOf<typeof Anchors>;

export const BuiltinEasingFunctions = {
    linear: "linear",
    easeInOutCubic: "easeInOutCubic",
} as const;
export type BuiltinEasingFunctions = ValueOf<typeof BuiltinEasingFunctions>;

export interface AnimatedScrollOptions {
    /** 动画的最大时长 (毫秒)，实际时长会自适应调整 */
    duration?: number;
    /** 缓动函数 */
    easing?: BuiltinEasingFunctions | ((t: number) => number);
    /** 要对齐的目标元素的锚点，默认为 'start' (顶部/左侧) */
    targetAnchor?: Anchors;
    /** 要对齐到的容器的锚点，可以是固定位置或百分比 (0-100)，默认为 'start' */
    containerAnchor?: Anchors | number;
    /** 在对齐后应用的额外偏移量，支持 'px' 和 '%' (相对于目标元素尺寸) */
    offset?: number | string;
    /** 滚动方向，默认为 'vertical' */
    direction?: ScrollDirections;
    /** 滚动动画结束后的回调 */
    onScrollEnd?: () => void;
}

const EASING_FUNCTIONS = {
    linear: (t: number) => t,
    easeInOutCubic: (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

function parseOffset(offset: number | string | undefined, referenceSize: number): number {
    if (typeof offset === "number") { return offset; }
    if (typeof offset === "string") {
        if (offset.endsWith("%")) {
            const percent = parseFloat(offset.slice(0, -1));
            return (percent / 100) * referenceSize;
        }
        return parseFloat(offset);
    }
    return 0;
}


// 2. 核心动画函数 (V5.4 更新：基于速度的自适应时长)
// ==========================================================
export function animatedScrollTo(
    container: HTMLElement,
    targetOffset: number,
    direction: NonNullable<AnimatedScrollOptions["direction"]>,
    options?: Pick<AnimatedScrollOptions, "duration" | "easing" | "onScrollEnd">,
): () => void {
    const {
        duration: userMaxDuration = 800,
        easing = BuiltinEasingFunctions.linear,
        onScrollEnd,
    } = options ?? {};
    let animationFrameId: number;
    const scrollProperty = direction === ScrollDirections.vertical ? "scrollTop" : "scrollLeft";

    const startPosition = container[scrollProperty];
    const distance = targetOffset - startPosition;

    // --- 基于速度的自适应时长逻辑 ---
    const PIXELS_PER_MS = 1.5; // 定义一个理想滚动速度 (1500px/s)
    const MIN_DURATION = 200;  // 保证动画可被感知的最小时长

    // 根据速度计算理想时长
    const idealDuration = Math.abs(distance) / PIXELS_PER_MS;

    // 最终时长 = 在[最小时长, 用户设定的最大时长]区间内，取理想时长
    const finalDuration = Math.max(MIN_DURATION, Math.min(idealDuration, userMaxDuration));
    // --- 逻辑结束 ---

    if (Math.abs(distance) < 1) {
        onScrollEnd?.();
        return () => {};
    }

    const startTime = performance.now();
    const easingFunction = typeof easing === "string" ? EASING_FUNCTIONS[easing] : easing;

    const animationLoop = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / finalDuration, 1);
        const easedProgress = easingFunction(progress);

        container[scrollProperty] = startPosition + distance * easedProgress;

        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animationLoop);
        } else {
            container[scrollProperty] = targetOffset;
            onScrollEnd?.();
        }
    };

    animationFrameId = requestAnimationFrame(animationLoop);

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
}


// 3. 核心计算函数
// ==========================================================
export function calculateScrollOffset(
    container: HTMLElement,
    target: HTMLElement,
    direction: NonNullable<AnimatedScrollOptions["direction"]>,
    options?: AnimatedScrollOptions,
): number {
    const {
        targetAnchor = Anchors.start,
        containerAnchor = Anchors.start,
        offset = 0,
    } = options ?? {};

    const DIMS = {
        vertical: {
            clientSize: "clientHeight",
            offsetPos: "offsetTop",
            offsetSize: "offsetHeight",
            scrollSize: "scrollHeight"
        } as const,
        horizontal: {
            clientSize: "clientWidth",
            offsetPos: "offsetLeft",
            offsetSize: "offsetWidth",
            scrollSize: "scrollWidth",
        } as const,
    }[direction];

    const containerSize = container[DIMS.clientSize];
    const targetPos = target[DIMS.offsetPos];
    const targetSize = target[DIMS.offsetSize];
    const maxScrollPos = container[DIMS.scrollSize] - containerSize;

    if (maxScrollPos <= 0) return 0;

    let targetAnchorPos = targetPos;
    if (targetAnchor === Anchors.middle) targetAnchorPos += targetSize / 2;
    if (targetAnchor === Anchors.end) targetAnchorPos += targetSize;

    let containerAnchorPos = 0;
    if (typeof containerAnchor === "number") {
        containerAnchorPos = containerSize * (containerAnchor / 100);
    } else {
        if (containerAnchor === Anchors.middle) containerAnchorPos = containerSize / 2;
        if (containerAnchor === Anchors.end) containerAnchorPos = containerSize;
    }

    let targetOffset = targetAnchorPos - containerAnchorPos;

    const finalPixelOffset = parseOffset(offset, targetSize);
    targetOffset += finalPixelOffset;

    return Math.max(0, Math.min(targetOffset, maxScrollPos));
}

