export type Animation = (distance: number) => string;

export function createAnim(
    frames: readonly string[],
    frameLength: number,
): Animation {
    if (frames.length === 0) {
        throw new Error('Animation requires at least one frame');
    }

    return function resolveFrame(distance: number): string {
        const frameIndex = Math.floor(distance / frameLength) % frames.length;
        const frame = frames[frameIndex];
        if (frame === undefined) {
            throw new Error(`Animation frame is missing at index ${frameIndex}`);
        }
        return frame;
    };
}
