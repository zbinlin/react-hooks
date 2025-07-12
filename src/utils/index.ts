export function ensureNotNull<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) {
        throw new Error('Value is null or undefined');
    }
    return value;
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
