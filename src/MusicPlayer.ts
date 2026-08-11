export default class MusicPlayer {
    private readonly tracks = new Map<string, HTMLAudioElement>();

    addTrack(name: string, url: string): void {
        const audio = new Audio();
        audio.loop = true;
        audio.src = url;
        this.tracks.set(name, audio);
    }

    playTrack(name: string): HTMLAudioElement {
        const audio = this.tracks.get(name);
        if (!audio) {
            throw new Error(`Unknown music track: ${name}`);
        }

        this.pauseAll();
        void audio.play();
        return audio;
    }

    pauseAll(): void {
        for (const audio of this.tracks.values()) {
            audio.pause();
        }
    }
}
