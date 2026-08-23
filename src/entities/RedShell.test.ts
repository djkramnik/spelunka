import Entity from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import {makePlayer} from '../player.js';
import type SpriteSheet from '../SpriteSheet.js';
import Killable from '../traits/Killable.js';
import Pickable from '../traits/Pickable.js';
import Stomper from '../traits/Stomper.js';
import {createRedShellFactory} from './RedShell.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const drawCalls: string[] = [];
const sprite = {
    draw: (name: string): void => {
        drawCalls.push(name);
    },
} as unknown as SpriteSheet;
const shell = createRedShellFactory(sprite)();

assertEqual([shell.size.x, shell.size.y], [16, 16], 'Red shell size');
assertEqual([shell.offset.x, shell.offset.y], [0, 8], 'Red shell bounds offset');
assertEqual(shell.traits.has(Pickable), true, 'Red shell pickup capability');

shell.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls, ['idle'], 'Red shell sprite frame');

const mario = new Entity();
mario.size.set(14, 16);
mario.pos.set(64, 208);
mario.vel.set(30, 40);
const player = makePlayer(mario, 'MARIO');
mario.addTrait(new Killable());
mario.addTrait(new Stomper());

shell.pos.set(64, 200);
shell.vel.set(0, 0);

const collisionResult = new EntityCollider(new Set([mario, shell])).check();
mario.finalize();
shell.finalize();

assertEqual(collisionResult, {candidateChecks: 1, overlaps: 2}, 'Collision result');
assertEqual([mario.pos.x, mario.pos.y], [64, 208], 'Mario position');
assertEqual([mario.vel.x, mario.vel.y], [30, 40], 'Mario velocity');
assertEqual(mario.traits.get(Killable).dead, false, 'Mario alive state');
assertEqual(player.score, 0, 'Mario score');
assertEqual([shell.pos.x, shell.pos.y], [64, 200], 'Red shell position');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Red shell velocity');

console.log('Pickup-capable red shell collision regression passed');
