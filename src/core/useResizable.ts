import { useState, useRef } from "react";
import { useDragGesture, type DragHandleProps, type HitArea } from "./useDragGesture.js";
import { useEventCallback } from "./useEventCallback.js";
import { clamp } from "../utils/index.js";

export interface Size {
    width: number;
    height: number;
}

export interface ResizableInfo {
    size: Size;
    isResizing: boolean;
    getResizeHandleProps: (direction?: ResizeDirection, hitArea?: number | Partial<HitArea>) => DragHandleProps;
}

export interface ResizableOptions {
    size?: Size;
    onSizeChange?: (size: Size) => void;
    initialSize?: Size;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    axis?: "both" | "x" | "y";
    lockAspectRatio?: boolean;
    disabled?: boolean;
}

export type ResizeDirection = "right" | "bottom" | "bottom-right";

export function useResizable(options: ResizableOptions = {}): ResizableInfo {
    const {
        size: controlledSize,
        onSizeChange,
        initialSize = { width: 100, height: 100 },
        minWidth = 0,
        maxWidth = Infinity,
        minHeight = 0,
        maxHeight = Infinity,
        axis = "both",
        lockAspectRatio = false,
        disabled = false,
    } = options;

    const [uncontrolledSize, setUncontrolledSize] = useState(initialSize);
    const dragStartSizeRef = useRef<Size>({ width: 0, height: 0 });

    const isControlled = controlledSize !== undefined && typeof onSizeChange === "function";
    const size = isControlled ? controlledSize : uncontrolledSize;

    const updateSize = useEventCallback((newSize: Size) => {
        const clampedSize = {
            width: clamp(newSize.width, minWidth, maxWidth),
            height: clamp(newSize.height, minHeight, maxHeight),
        };

        if (isControlled) {
            onSizeChange?.(clampedSize);
        } else {
            setUncontrolledSize(clampedSize);
        }
    });

    function createResizeHandler(direction: ResizeDirection, hitArea?: ResizableInfo["getResizeHandleProps"] extends (...args: infer A) => any ? A[1] : never) {
        return useDragGesture({
            hitArea,
            onDragStart: () => {
                if (disabled) return;
                dragStartSizeRef.current = size;
            },
            onDrag: ({ deltaX, deltaY }) => {
                if (disabled) return;

                let width = dragStartSizeRef.current.width;
                let height = dragStartSizeRef.current.height;

                if (direction === "right" || direction === "bottom-right") {
                    width += deltaX;
                }
                if (direction === "bottom" || direction === "bottom-right") {
                    height += deltaY;
                }

                if (axis === "x") {
                    height = dragStartSizeRef.current.height;
                } else if (axis === "y") {
                    width = dragStartSizeRef.current.width;
                }

                if (lockAspectRatio) {
                    const aspect = dragStartSizeRef.current.width / dragStartSizeRef.current.height;
                    if (direction === "right") {
                        height = width / aspect;
                    } else if (direction === "bottom") {
                        width = height * aspect;
                    } else {
                        const avgDelta = (deltaX + deltaY) / 2;
                        width = dragStartSizeRef.current.width + avgDelta;
                        height = width / aspect;
                    }
                }

                updateSize({ width, height });
            },
        });
    }

    const handlers = {
        right: (hitArea?: ResizableInfo["getResizeHandleProps"] extends (...args: infer A) => any ? A[1] : never) => createResizeHandler("right", hitArea),
        bottom: (hitArea?: ResizableInfo["getResizeHandleProps"] extends (...args: infer A) => any ? A[1] : never) => createResizeHandler("bottom", hitArea),
        "bottom-right": (hitArea?: ResizableInfo["getResizeHandleProps"] extends (...args: infer A) => any ? A[1] : never) => createResizeHandler("bottom-right", hitArea),
    } as const;

    return {
        size,
        isResizing: handlers.right().isDragging || handlers.bottom().isDragging || handlers["bottom-right"]().isDragging,
        getResizeHandleProps: (direction: ResizeDirection = "bottom-right", hitArea) => {
            return handlers[direction](hitArea).getDragHandleProps();
        },
    };
}

