import { useState, useRef } from "react";
import { useEventCallback } from "./useEventCallback.js";
import { useDragGesture, type DragHandleProps } from "./useDragGesture.js";
import { clamp } from "../utils/index.js";

export interface Position {
    x: number;
    y: number;
}

interface Bounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface DraggableInfo {
    position: Position,
    isDragging: boolean;
    draggableProps: DragHandleProps;
}

export interface DraggableOptions {
    position?: Position;
    onPositionChange?: (pos: Position) => void;
    initialPosition?: Position;
    bounds?: Bounds;
    gridSize?: number;
    lockAxis?: "x" | "y";
    onDragStart?: (pos: Position) => void;
    onDragEnd?: (pos: Position) => void;
    updatePositionOnDragStart?: boolean;
    shouldPreventDrag?: (event: React.PointerEvent) => boolean | undefined;
}

export function useDraggable(options: DraggableOptions = {}): DraggableInfo {
    const {
        position: controlledPosition,
        onPositionChange,
        initialPosition = { x: 0, y: 0 },
        bounds,
        gridSize,
        lockAxis,
        onDragStart,
        onDragEnd,
        updatePositionOnDragStart,
        shouldPreventDrag,
    } = options;

    const [ uncontrolledPosition, setUncontrolledPosition ] = useState<Position>(initialPosition);

    const isControlled = controlledPosition !== undefined && typeof onPositionChange === "function";

    const position = isControlled ? controlledPosition! : uncontrolledPosition;

    const dragStartPosRef = useRef<Position>({ x: 0, y: 0 });

    const clampPosition = (pos: Position): Position => {
        if (!bounds) return pos;
        return {
            x: clamp(pos.x, bounds.left, bounds.right),
            y: clamp(pos.y, bounds.top, bounds.bottom),
        };
    };

    const snapToGrid = (pos: Position): Position => {
        if (!gridSize || gridSize <= 1) return pos;
        return {
            x: Math.round(pos.x / gridSize) * gridSize,
            y: Math.round(pos.y / gridSize) * gridSize,
        };
    };

    const updatePosition = useEventCallback((nextPos: Position) => {
        let pos = snapToGrid(clampPosition(nextPos));

        if (lockAxis === "x") {
            pos.y = position.y;
        } else if (lockAxis === "y") {
            pos.x = position.x;
        }

        if (isControlled) {
            onPositionChange(pos);
        } else {
            setUncontrolledPosition(pos);
        }
    });

    // Use our perfected, underlying drag gesture hook.
    const { isDragging, getDragHandleProps } = useDragGesture({
        onDragStart: (event) => {
            // When the drag starts, lock in the current position.
            const startPosition = updatePositionOnDragStart ? {
                x: event.clientX,
                y: event.clientY,
            } : {
                ...position,
            };
            dragStartPosRef.current = startPosition;
            onDragStart?.(startPosition);
            updatePositionOnDragStart && updatePosition(startPosition);
        },
        onDrag: ({ deltaX, deltaY }) => {
            let nextPos = {
                x: dragStartPosRef.current.x + deltaX,
                y: dragStartPosRef.current.y + deltaY,
            };
            updatePosition(nextPos);
        },
        onDragEnd: () => {
            onDragEnd?.(position);
        },
        shouldPreventDrag,
    });

    // Return the current state and the props getter for the component to use.
    return {
        position,
        isDragging,
        draggableProps: getDragHandleProps(),
    };
};
