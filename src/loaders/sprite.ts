import {createAnim} from '../anim.js';
import {loadImage, loadJSON} from '../loaders.js';
import SpriteSheet from '../SpriteSheet.js';
import {SpriteSheetSchema} from './schemas.js';

export async function loadSpriteSheet(name: string): Promise<SpriteSheet> {
    const sheetSpec = await loadJSON(`/sprites/${name}.json`, SpriteSheetSchema);
    const image = await loadImage(sheetSpec.imageURL);
    const sprites = new SpriteSheet(
        image,
        sheetSpec.tileW,
        sheetSpec.tileH,
        sheetSpec.frameScale,
    );

    sheetSpec.tiles.forEach(tileSpec => {
        sprites.defineTile(
            tileSpec.name,
            tileSpec.index[0],
            tileSpec.index[1],
        );
    });

    sheetSpec.tileSets.forEach(tileSetSpec => {
        const [width, height] = tileSetSpec.size;
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                sprites.defineTile(
                    `${tileSetSpec.namePrefix}-${x}-${y}`,
                    tileSetSpec.index[0] + x,
                    tileSetSpec.index[1] + y,
                );
            }
        }
    });

    sheetSpec.frames.forEach(frameSpec => {
        sprites.define(
            frameSpec.name,
            frameSpec.rect[0],
            frameSpec.rect[1],
            frameSpec.rect[2],
            frameSpec.rect[3],
            frameSpec.pivot,
            sheetSpec.frameScale,
        );
    });

    sheetSpec.animations.forEach(animationSpec => {
        const animation = createAnim(
            animationSpec.frames,
            animationSpec.frameLen,
            animationSpec.loop,
        );
        sprites.defineAnim(animationSpec.name, animation);
    });

    return sprites;
}
