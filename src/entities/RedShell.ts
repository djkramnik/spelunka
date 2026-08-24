import Entity from '../Entity.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import Physics from '../traits/Physics.js';
import Pickable from '../traits/Pickable.js';
import Solid from '../traits/Solid.js';

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
        const solid = new Solid();
        solid.wallRebound = 0.5;
        solid.floorRebound = 0.5;
        solid.ceilingRebound = 0.8;

        redShell.size.set(16, 16);
        redShell.offset.y = 8;
        redShell.addTrait(new Pickable());
        redShell.addTrait(new Physics());
        redShell.addTrait(solid);
        redShell.draw = context => sprite.draw('idle', context, 0, 0);

        return redShell;
    };
}
