import Entity from '../Entity.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import Pickable from '../traits/Pickable.js';

export type RedShellFactory = () => Entity;

export async function loadRedShell(): Promise<RedShellFactory> {
    const sprite = await loadSpriteSheet('red-shell');
    return createRedShellFactory(sprite);
}

export function createRedShellFactory(
    sprite: SpriteSheet,
): RedShellFactory {
    return function createRedShell(): Entity {
        const redShell = new Entity();
        redShell.size.set(16, 16);
        redShell.offset.y = 8;
        redShell.addTrait(new Pickable());
        redShell.draw = context => sprite.draw('idle', context, 0, 0);

        return redShell;
    };
}
