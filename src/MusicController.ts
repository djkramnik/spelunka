import MusicPlayer from './MusicPlayer.js';

export default class MusicController {
    private player: MusicPlayer | null = null;
    private stopped = false;

    setPlayer(player: MusicPlayer): void {
        this.player = player;
        this.stopped = false;
    }

    playTheme(speed = 1): void {
        if (this.stopped) {
            return;
        }
        const audio = this.getPlayer().playTrack('main');
        audio.playbackRate = speed;
    }

    playHurryTheme(): void {
        if (this.stopped) {
            return;
        }
        const audio = this.getPlayer().playTrack('hurry');
        audio.loop = false;
        audio.addEventListener('ended', () => {
            this.playTheme(1.3);
        }, {once: true});
    }

    pause(): void {
        this.player?.pauseAll();
    }

    stop(): void {
        this.stopped = true;
        this.pause();
    }

    private getPlayer(): MusicPlayer {
        if (!this.player) {
            throw new Error('Music player has not been configured');
        }
        return this.player;
    }
}
