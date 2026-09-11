import AudioBoard from './AudioBoard.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
            `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
    }
}

const destination = {name: 'destination'};
const gainNode = {
    gain: {value: 1},
    connectTarget: null as unknown,
    connect(target: unknown): void {
        this.connectTarget = target;
    },
};
const sources: Array<{
    buffer: AudioBuffer | null;
    connectTarget: unknown;
    startTime: number | null;
}> = [];
const context = {
    destination,
    createBufferSource: () => {
        const state = {
            buffer: null as AudioBuffer | null,
            connectTarget: null as unknown,
            startTime: null as number | null,
            connect(target: unknown): void {
                this.connectTarget = target;
            },
            start(time: number): void {
                this.startTime = time;
            },
        };
        sources.push(state);
        return state;
    },
    createGain: () => gainNode,
} as unknown as AudioContext;

const board = new AudioBoard();
const fullBuffer = {name: 'full'} as unknown as AudioBuffer;
const softBuffer = {name: 'soft'} as unknown as AudioBuffer;
board.addAudio('full', fullBuffer);
board.addAudio('soft', softBuffer, 0.55);

board.playAudio('full', context);
assertEqual(
    [sources[0]?.buffer, sources[0]?.connectTarget, sources[0]?.startTime],
    [fullBuffer, destination, 0],
    'Default effects connect directly to the destination at full gain',
);

board.playAudio('soft', context);
assertEqual(
    [
        sources[1]?.buffer,
        sources[1]?.connectTarget === gainNode,
        gainNode.gain.value,
        gainNode.connectTarget,
        sources[1]?.startTime,
    ],
    [softBuffer, true, 0.55, destination, 0],
    'Configured effects pass through their per-effect gain node',
);

console.log('Per-effect audio gain regression passed');
