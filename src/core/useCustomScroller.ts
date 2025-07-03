import {
    useRef, useCallback,
} from "react";
import {
    ScrollDirections,
    AnimatedScrollOptions,
    animatedScrollTo,
    calculateScrollOffset,
} from "../utils/scroll-helper.js";

export function useCustomScroller<T extends HTMLElement>() {
    const containerRef = useRef<T>(null);
    const runningAnimation = useRef<(() => void) | null>(null);

    const scrollTo = useCallback((
        target: HTMLElement,
        options: AnimatedScrollOptions = {}
    ) => {
        if (!containerRef.current) {
            console.warn("滚动容器的 ref 尚未附加到元素上。");
            return;
        }

        if (runningAnimation.current) {
            runningAnimation.current();
        }

        const { direction = ScrollDirections.vertical, ...restOptions } = options;
        const container = containerRef.current;

        const targetOffset = calculateScrollOffset(container, target, direction, options);

        runningAnimation.current = animatedScrollTo(container, targetOffset, direction, restOptions);
    }, []);

    return { containerRef, scrollTo };
}

