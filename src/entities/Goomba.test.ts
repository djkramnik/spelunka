import {createAnim} from '../anim.js';
import type SpriteSheet from '../SpriteSheet.js';
import Killable from '../traits/Killable.js';
import PendulumMove from '../traits/PendulumMove.js';
import {createGoombaFactory} from './Goomba.js';

interface DrawCall {
    readonly name: string;
    readonly pivotX: number;
    readonly pivotY: number;
    readonly flip: boolean;
}

const draws: DrawCall[] = [];
const sprite = {
    getAnimation: (): ((distance: number) => string) => createAnim(
        ['walk-1', 'walk-2'],
        0.15,
    ),
    drawFrame: (
        name: string,
        _context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip: boolean,
    ): void => {
        draws.push({name, pivotX, pivotY, flip});
    },
} as unknown as SpriteSheet;

const snake = createGoombaFactory(sprite, true)();
const draw = (): DrawCall => {
    snake.draw({} as CanvasRenderingContext2D);
    const call = draws.at(-1);
    if (call === undefined) {
        throw new Error('Enemy did not draw');
    }
    return call;
};

if (JSON.stringify([snake.size.x, snake.size.y]) !== JSON.stringify([16, 16])) {
    throw new Error('HD artwork changed the enemy collision size');
}
if (JSON.stringify(draw()) !== JSON.stringify({
    name: 'walk-1',
    pivotX: 8,
    pivotY: 16,
    flip: true,
})) {
    throw new Error('Left-moving HD enemy did not face or anchor correctly');
}

snake.lifetime = 0.16;
snake.traits.get(PendulumMove).speed = 30;
if (JSON.stringify(draw()) !== JSON.stringify({
    name: 'walk-2',
    pivotX: 8,
    pivotY: 16,
    flip: false,
})) {
    throw new Error('Right-moving HD enemy did not animate or face correctly');
}

snake.traits.get(Killable).dead = true;
if (draw().name !== 'flat') {
    throw new Error('Defeated HD enemy did not select the intentional fallback');
}

console.log('Spelunky HD enemy state, facing, and collider regression passed');
