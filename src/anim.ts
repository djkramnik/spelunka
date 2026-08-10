export type Animation = (distance: number) => string;

export function createAnim(
    frames: readonly string[],
    frameLength: number,
): Animation {
    return function resolveFrame(distance: number): string {
        const frameIndex = Math.floor(distance / frameLength) % frames.length;
        return frames[frameIndex];
    };
}
