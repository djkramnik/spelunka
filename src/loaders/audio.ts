import AudioBoard from '../AudioBoard.js';
import {loadJSON} from '../loaders.js';
import {SoundSheetSchema} from './schemas.js';

export async function loadAudioBoard(
    name: string,
    audioContext: AudioContext,
): Promise<AudioBoard> {
    const loadAudio = createAudioLoader(audioContext);
    const audioSheet = await loadJSON(`/sounds/${name}.json`, SoundSheetSchema);
    const audioBoard = new AudioBoard();

    await Promise.all(Object.entries(audioSheet.fx).map(async ([effectName, effect]) => {
        const buffer = await loadAudio(effect.url);
        audioBoard.addAudio(effectName, buffer);
    }));

    return audioBoard;
}

export function createAudioLoader(
    context: BaseAudioContext,
): (url: string) => Promise<AudioBuffer> {
    return async function loadAudio(url: string): Promise<AudioBuffer> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Unable to load audio (${response.status}): ${url}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return context.decodeAudioData(arrayBuffer);
    };
}
