import { useRef, useState, useCallback, useEffect } from "react";
import { useEventCallback } from "./useEventCallback.js"; // 根据你的实际路径调整

interface Point {
    x: number;
    y: number;
}

export interface DragDelta {
    deltaX: number;
    deltaY: number;
}

export interface HitArea {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface DragGestureOptions {
    onDragStart?: (event: PointerEvent) => void;
    onDrag?: (state: DragDelta) => void;
    onDragEnd?: (event: PointerEvent) => void;
    hitArea?: number | Partial<HitArea>;
    shouldPreventDrag?: (event: React.PointerEvent) => boolean | void;
}

export interface DragHandleProps {
    onPointerDown: (event: React.PointerEvent) => void;
}

function normalizeHitArea(input?: DragGestureOptions["hitArea"]): HitArea {
    if (typeof input === "number") {
        return {
            top: input,
            right: input,
            bottom: input,
            left: input,
        };
    }
    return {
        top: input?.top ?? 0,
        right: input?.right ?? 0,
        bottom: input?.bottom ?? 0,
        left: input?.left ?? 0,
    };
}

export function useDragGesture(options: DragGestureOptions) {
    const [isDragging, setIsDragging] = useState(false);
    const startPositionRef = useRef<Point>({ x: 0, y: 0 });
    const dragTargetRef = useRef<HTMLElement | null>(null);

    const latestDeltaRef = useRef<DragDelta | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const handleDragStart = useEventCallback((event: PointerEvent) => {
        options.onDragStart?.(event);
    });

    const handleDrag = useEventCallback((delta: DragDelta) => {
        options.onDrag?.(delta);
    });

    const handleDragEnd = useEventCallback((event: PointerEvent) => {
        options.onDragEnd?.(event);
    });

    const handlePointerMove = useEventCallback((event: PointerEvent) => {
        if (!isDragging) return;

        latestDeltaRef.current = {
            deltaX: event.clientX - startPositionRef.current.x,
            deltaY: event.clientY - startPositionRef.current.y,
        };

        if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
                if (latestDeltaRef.current) {
                    handleDrag(latestDeltaRef.current);
                    latestDeltaRef.current = null;
                }
                rafIdRef.current = null;
            });
        }
    });

    const handlePointerUp = useEventCallback((event: PointerEvent) => {
        setIsDragging(false);

        if (dragTargetRef.current) {
            dragTargetRef.current.releasePointerCapture(event.pointerId);
        }

        handleDragEnd(event);

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        dragTargetRef.current = null;
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
    });

    const onHitTest = useEventCallback((event: React.PointerEvent) => {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const hit = normalizeHitArea(options.hitArea);
        const within =
            event.clientX >= rect.left - hit.left &&
            event.clientX <= rect.right + hit.right &&
            event.clientY >= rect.top - hit.top &&
            event.clientY <= rect.bottom + hit.bottom;

        return within;
    });

    const onStartingDragTest = useEventCallback((event: React.PointerEvent) => {
        return options.shouldPreventDrag?.(event);
    });

    const handlePointerDown = useCallback((event: React.PointerEvent) => {
        if (onStartingDragTest(event) === true) return;

        const within = onHitTest(event);
        if (!within) return;

        event.preventDefault();
        event.stopPropagation();

        setIsDragging(true);
        startPositionRef.current = { x: event.clientX, y: event.clientY };

        const target = event.currentTarget as HTMLElement;
        dragTargetRef.current = target;
        target.setPointerCapture(event.pointerId);

        handleDragStart(event.nativeEvent);

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }, [onStartingDragTest, onHitTest, handleDragStart, handlePointerMove, handlePointerUp]); // 这些引用是稳定的

    useEffect(() => {
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [handlePointerMove, handlePointerUp]);

    return {
        isDragging,
        getDragHandleProps: () => ({
            onPointerDown: handlePointerDown,
        }),
    };
};

