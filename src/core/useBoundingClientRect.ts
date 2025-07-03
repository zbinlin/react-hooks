import { useState, useCallback, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";
import { useEventCallback } from "./useEventCallback.js";

export interface BoundingClientRectOptions {
    measureOnce?: boolean;
    trackElementResize?: boolean;
    trackScroll?: boolean;
    trackResize?: boolean;
}

export interface BoundingClientRectResults<T extends HTMLElement> {
    rect: DOMRect | null;
    ref: React.RefCallback<T>;
}

export function useBoundingClientRect<T extends HTMLElement>(
    options: BoundingClientRectOptions = {},
): BoundingClientRectResults<T> {
    const {
        measureOnce = false,
        trackElementResize = true,
        trackScroll = true,
        trackResize = true,
    } = options;
    const [ node, setNode ] = useState<T | null>();
    const [ rect, setRect ] = useState<DOMRect | null>(null);

    const animationFrameId = useRef<number | null>(null);

    const ref: React.RefCallback<T> = useCallback(nodeInstance => {
        setNode(nodeInstance);
        return () => {
            setNode(undefined);
        };
    }, []);

    const updateRect = useEventCallback(() => {
        if (node) {
            setRect(node.getBoundingClientRect());
        }
    });

    useIsomorphicLayoutEffect(() => {
        const element = node;
        if (!element) {
            setRect(null);
            return;
        }

        updateRect();

        if (measureOnce) return;

        const handleScrollAndResize = () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }

            animationFrameId.current = requestAnimationFrame(updateRect);
        };

        if (trackScroll) {
            window.addEventListener("scroll", handleScrollAndResize, {
                capture: true,
                passive: true,
            });
        }
        if (trackResize) {
            window.addEventListener("resize", handleScrollAndResize, {
                passive: true,
            });
        }

        let resizeObserver: ResizeObserver | undefined;
        if (trackElementResize) {
            resizeObserver = new ResizeObserver(handleScrollAndResize);
            resizeObserver.observe(element);
        }

        return () => {
            if (trackScroll) {
                window.removeEventListener("scroll", handleScrollAndResize, true);
            }
            if (trackResize) {
                window.removeEventListener("resize", handleScrollAndResize);
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
        };
    }, [node, measureOnce, trackElementResize, trackScroll, trackResize]);

    return {
        rect,
        ref,
    }
}
