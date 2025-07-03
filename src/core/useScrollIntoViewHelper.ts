import {
    type RefObject,
    useRef, useEffect,
} from "react";
import { ensureNotNull } from "../utils/index.js";
import {
    type AnimatedScrollOptions,
    ScrollDirections,
    animatedScrollTo,
    calculateScrollOffset,
} from "../utils/scroll-helper.js";

export type { AnimatedScrollOptions };

/**
 * A helper class that encapsulates scrolling logic.
 * This is managed by the useScrollIntoViewHelper hook.
 */
class ScrollIntoViewHelper {
    private _container: HTMLElement | null;
    private _runningAnimation: (() => void) | null = null; // 用于停止动画

    constructor(container: HTMLElement | null) {
        this._container = container;
    }

    public scrollTo(element: HTMLElement, options: AnimatedScrollOptions = {}): void {
        if (!this._container || !element) {
            return;
        }

        // [新引擎] 功能强大

        // 1. 如果有正在进行的动画，先停止它
        if (this._runningAnimation) {
            this._runningAnimation();
        }

        // 2. 解构出 direction，因为它决定了计算方式
        const { direction = ScrollDirections.vertical, ...restOptions } = options;

        // 3. 调用我们的核心计算函数
        const targetOffset = calculateScrollOffset(this._container, element, direction, options);

        // 4. 调用我们的核心动画函数，并保存停止句柄
        this._runningAnimation = animatedScrollTo(this._container, targetOffset, direction, restOptions);
    }

    // 别忘了在 stopScroll 和 destroy 方法里也调用它
    public stopScroll(): void {
        if (this._runningAnimation) {
            this._runningAnimation();
            this._runningAnimation = null;
        }
    }

    // These two methods are what useKeepActiveItemIntoView needs.
    public getContainer(): HTMLElement | null {
        return this._container;
    }
    public setContainer(container: HTMLElement | null): void {
        this._container = container;
    }

    public destroy(): void {
        this.stopScroll();
        this._container = null;
    }
}


/**
 * 创建并管理一个 ScrollIntoViewHelper 实例的 Hook.
 * @param container 初始的滚动容器元素
 * @returns 返回一个包含 ScrollIntoViewHelper 实例的 RefObject
 */
export function useScrollIntoViewHelper(
    container: HTMLElement | null
): RefObject<ScrollIntoViewHelper | null> {
    const helperRef = useRef<ScrollIntoViewHelper | null>(null);

    useEffect(() => {
        helperRef.current = new ScrollIntoViewHelper(container);

        return () => {
            // 在组件卸载时销毁实例，防止内存泄漏
            ensureNotNull(helperRef.current).destroy();
        };
    }, [container]); // 当容器变化时重新创建实例

    return helperRef;
}
