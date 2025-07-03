import {
    useRef, useCallback, useEffect,
} from "react";

import {
    type AnimatedScrollOptions,
    useScrollIntoViewHelper,
} from "./useScrollIntoViewHelper.js";

interface UseKeepActiveItemIntoViewOptions<T, K = T> extends AnimatedScrollOptions {
    activeItem?: T | null;
    getKey?: (item: T) => K;
}

type SetContainerRef = (element: HTMLElement | null) => void;
type SetItemRef<K> = (key: K, element: HTMLElement | null) => void;
type ManualScrollToItem<T> = (item: T, overrideOptions?: AnimatedScrollOptions) => void;

/**
 * 维持列表中的活动项始终在视图内的 Hook.
 * @param options 配置项，包括活动项、key 生成函数和滚动选项
 * @returns 返回一个元组：[设置容器的 ref 回调, 设置列表项的 ref 回调, 手动滚动函数]
 */
export function useKeepActiveItemIntoView<T, K = T>(
    options: UseKeepActiveItemIntoViewOptions<T, K> = {}
) {
    const { activeItem, getKey, ...scrollOptions } = options;

    const containerRef = useRef<HTMLElement | null>(null);
    const itemsRef = useRef<Map<K, HTMLElement>>(new Map());
    const scrollHelper = useScrollIntoViewHelper(containerRef.current);

    // 检查并更新滚动助手的容器
    const setContainerRef: SetContainerRef = useCallback((element: HTMLElement | null) => {
        containerRef.current = element;
        scrollHelper.current?.setContainer(element);
    }, [scrollHelper]);

    // 注册或注销列表项及其对应的 DOM 元素
    const setItemRef: SetItemRef<K> = useCallback((key: K, element: HTMLElement | null) => {
        if (element) {
            itemsRef.current.set(key, element);
        } else {
            itemsRef.current.delete(key);
        }
    }, []);

    // 手动滚动函数
    const scrollToItem: ManualScrollToItem<T> = useCallback((item, overrideOptions) => {
        const key = getKey ? getKey(item) : (item as unknown as K);
        const element = itemsRef.current.get(key);
        if (element) {
            // 合并默认选项和手动覆盖选项
            const finalOptions = { ...scrollOptions, ...overrideOptions };
            scrollHelper.current?.scrollTo(element, finalOptions);
        }
    }, [getKey, scrollHelper, scrollOptions]);

    // 自动滚动逻辑
    useEffect(() => {
        if (activeItem) {
            // 使用 setTimeout 确保 DOM 元素已经渲染并注册
            setTimeout(() => scrollToItem(activeItem), 0);
        }
    }, [activeItem, scrollToItem]);

    return { setContainerRef, setItemRef, scrollToItem };
}
