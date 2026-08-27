export type Animation = (distance: number) => string;

export function createAnim(
    frames: readonly string[],
    frameLength: number,
    loop = true,
): Animation {
    if (frames.length === 0) {
        throw new Error('Animation requires at least one frame');
    }

    return function resolveFrame(distance: number): string {
        const unboundedIndex = Math.max(0, Math.floor(distance / frameLength));
        const frameIndex = loop
            ? unboundedIndex % frames.length
            : Math.min(unboundedIndex, frames.length - 1);
        const frame = frames[frameIndex];
        if (frame === undefined) {
            throw new Error(`Animation frame is missing at index ${frameIndex}`);
        }
        return frame;
    };
}
