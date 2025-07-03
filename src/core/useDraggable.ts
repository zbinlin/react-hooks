import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEventCallback } from "./useEventCallback.js";

export interface Point {
    x: number;
    y: number;
}

export interface Bounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface DragInfo<T extends HTMLElement> extends Point {
    ref: React.Ref<T>;
    isDragging: boolean;
}

export interface DraggableOptions {
    mode?: "object" | "slider";
    initialPosition?: Point;
    bounds?: Bounds;
}

export const useDraggable = <T extends HTMLElement>(options: DraggableOptions = {}): DragInfo<T> => {
    const { initialPosition,  bounds, mode = "object" } = options;
    const [ position, setPosition ] = useState<Point | null>(null);
    const [ isDragging, setIsDragging ] = useState(false);
    const animationFrameId = useRef<number | null>(null);

    const currentPosition = position ?? initialPosition ?? { x: 0, y: 0 };

    const [ handleNode, setHandleNode ] = useState<T | null>(null);
    const handleRefCallback: React.RefCallback<T> = useCallback((node) => {
        setHandleNode(node);
        return () => {
            setHandleNode(null);
        };
    }, []);

    const dragInfo = useRef<{
        initialPosition: Point;
        startPoint: Point;
        lastPoint: Point;
    }>(null);

    const animate = useEventCallback(() => {
        if (!dragInfo.current) return;

        const newPosition = {
            x: dragInfo.current.initialPosition.x + (dragInfo.current.lastPoint.x - dragInfo.current.startPoint.x),
            y: dragInfo.current.initialPosition.y + (dragInfo.current.lastPoint.y - dragInfo.current.startPoint.y),
        };

        if (bounds) {
            newPosition.x = Math.max(bounds.left, Math.min(newPosition.x, bounds.right));
            newPosition.y = Math.max(bounds.top, Math.min(newPosition.y, bounds.bottom));
        }

        setPosition(newPosition);
        animationFrameId.current = requestAnimationFrame(animate);
    });

    const handlePointerMove = useEventCallback((event: PointerEvent) => {
        if (dragInfo.current) {
            dragInfo.current.lastPoint = { x: event.clientX, y: event.clientY };
        }
    });

    const handlePointerUp = useEventCallback(() => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        dragInfo.current = null;
        setIsDragging(false);
    });

    const handlePointerDown = useEventCallback((event: PointerEvent) => {
        if (event.button !== 0) return;
        event.preventDefault();

        const isSliderMode = mode === "slider";
        const startPosition = isSliderMode
            ? { x: event.clientX, y: event.clientY }
            : { ... currentPosition };

        dragInfo.current = {
            initialPosition: startPosition,
            startPoint: { x: event.clientX, y: event.clientY },
            lastPoint: { x: event.clientX, y: event.clientY },
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        animationFrameId.current = requestAnimationFrame(animate);

        setIsDragging(true);
    });

    useEffect(() => {
        if (!handleNode) return;

        handleNode.addEventListener("pointerdown", handlePointerDown);

        return () => {
            handleNode.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                if (animationFrameId) {
                    animationFrameId.current = null;
                }
            }
            dragInfo.current = null;
        };
    }, [handleNode]);

    return { ...currentPosition, isDragging, ref: handleRefCallback };
};
