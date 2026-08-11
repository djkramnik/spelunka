export default class AudioBoard {
    private readonly buffers = new Map<string, AudioBuffer>();

    addAudio(name: string, buffer: AudioBuffer): void {
        this.buffers.set(name, buffer);
    }

    playAudio(name: string, context: AudioContext): void {
        const buffer = this.buffers.get(name);
        if (!buffer) {
            throw new Error(`Unknown audio effect: ${name}`);
        }

        const source = context.createBufferSource();
        source.connect(context.destination);
        source.buffer = buffer;
        source.start(0);
    }
}
