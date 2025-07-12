import { useState, useRef, useMemo } from "react";
import { useDragGesture } from "./useDragGesture.js";
import { useEventCallback } from "./useEventCallback.js";
import { clamp } from "../utils/index.js";

export interface SliderInfo {
    value: number;
    isDragging: boolean;
    trackProps: React.HTMLAttributes<HTMLDivElement> & { ref: React.Ref<HTMLDivElement> };
    handleProps: React.HTMLAttributes<HTMLElement>;
    axis: "horizontal" | "vertical";
    direction: "ltr" | "rtl";
}

export interface SliderOptions {
    value?: number;
    onChange?: (value: number) => void;
    initialValue?: number;
    min?: number;
    max?: number;
    step?: number;
    axis?: "horizontal" | "vertical";
    direction?: "ltr" | "rtl";
}

export function useSlider(options: SliderOptions = {}): SliderInfo {
    const {
        value: controlledValue,
        onChange,
        initialValue = 0,
        min = 0,
        max = 100,
        step = 1,
        axis = "horizontal",
        direction = "ltr",
    } = options;

    const [ uncontrolledValue, setUncontrolledValue ] = useState(initialValue);
    const trackRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledValue !== undefined && typeof onChange === "function";
    const value = isControlled ? controlledValue : uncontrolledValue;

    const updateValue = useEventCallback((rawValue: number) => {
        const clamped = clamp(rawValue, min, max);
        const stepped = Math.round((clamped - min) / step) * step + min;
        const final = clamp(Number(stepped.toFixed(6)), min, max);

        if (isControlled) {
            onChange(final);
        } else {
            setUncontrolledValue(final);
        }
    });

    const { isDragging, getDragHandleProps } = useDragGesture({
        onDrag: ({ deltaX, deltaY }) => {
            if (!trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const trackLength = axis === "horizontal" ? rect.width : rect.height;
            const range = max - min;
            let delta = axis === "horizontal" ? deltaX : deltaY;
            if (axis === "horizontal" && direction === "rtl") delta = -delta;
            const deltaValue = (delta / trackLength) * range;
            updateValue(value + deltaValue);
        },
    });

    const handleTrackClick = useEventCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        let clickOffset = axis === "horizontal"
            ? event.clientX - rect.left
            : event.clientY - rect.top;
            if (axis === "horizontal" && direction === "rtl") {
                clickOffset = rect.width - clickOffset;
            }
            const ratio = clamp(clickOffset / (axis === "horizontal" ? rect.width : rect.height), 0, 1);
            const newValue = min + ratio * (max - min);
            updateValue(newValue);
    });

    const trackProps = useMemo(() => ({
        ref: trackRef,
        onClick: handleTrackClick,
        "aria-orientation": axis,
        "data-direction": direction,
    }), [handleTrackClick, axis, direction]);

    const handleProps = useMemo(() => getDragHandleProps(), [getDragHandleProps]);

    return {
        value,
        isDragging,
        trackProps,
        handleProps,
        axis,
        direction,
    };
}
