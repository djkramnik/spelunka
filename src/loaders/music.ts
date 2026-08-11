import {loadJSON} from '../loaders.js';
import MusicPlayer from '../MusicPlayer.js';
import {MusicSheetSchema} from './schemas.js';

export async function loadMusicSheet(name: string): Promise<MusicPlayer> {
    const musicSheet = await loadJSON(`/music/${name}.json`, MusicSheetSchema);
    const musicPlayer = new MusicPlayer();

    for (const [trackName, track] of Object.entries(musicSheet)) {
        musicPlayer.addTrack(trackName, track.url);
    }

    return musicPlayer;
}
