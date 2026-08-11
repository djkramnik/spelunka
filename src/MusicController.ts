import MusicPlayer from './MusicPlayer.js';

export default class MusicController {
    private player: MusicPlayer | null = null;

    setPlayer(player: MusicPlayer): void {
        this.player = player;
    }

    playTheme(speed = 1): void {
        const audio = this.getPlayer().playTrack('main');
        audio.playbackRate = speed;
    }

    playHurryTheme(): void {
        const audio = this.getPlayer().playTrack('hurry');
        audio.loop = false;
        audio.addEventListener('ended', () => {
            this.playTheme(1.3);
        }, {once: true});
    }

    pause(): void {
        this.getPlayer().pauseAll();
    }

    private getPlayer(): MusicPlayer {
        if (!this.player) {
            throw new Error('Music player has not been configured');
        }
        return this.player;
    }
}
