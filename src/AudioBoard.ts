export default class AudioBoard {
    private readonly effects = new Map<string, {
        readonly buffer: AudioBuffer;
        readonly gain: number;
    }>();

    addAudio(name: string, buffer: AudioBuffer, gain = 1): void {
        this.effects.set(name, {buffer, gain});
    }

    playAudio(name: string, context: AudioContext): void {
        const effect = this.effects.get(name);
        if (!effect) {
            throw new Error(`Unknown audio effect: ${name}`);
        }

        const source = context.createBufferSource();
        source.buffer = effect.buffer;
        if (effect.gain === 1) {
            source.connect(context.destination);
        } else {
            const gainNode = context.createGain();
            gainNode.gain.value = effect.gain;
            source.connect(gainNode);
            gainNode.connect(context.destination);
        }
        source.start(0);
    }
}
