import Entity from './Entity.js';
import Level, {focusPlayer} from './Level.js';
import {makePlayer} from './player.js';
import type {GameContext} from './Scene.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const level = new Level();
level.setDimensions(16, 30);

const mario = new Entity();
mario.size.set(14, 16);
makePlayer(mario, 'MARIO');
level.entities.add(mario);

mario.pos.set(64, 64);
focusPlayer(level);
assertEqual(
    [level.camera.pos.x, level.camera.pos.y],
    [0, 0],
    'Initial camera position',
);

mario.pos.y = 240;
focusPlayer(level);
assertEqual(level.camera.pos.y, 32, 'Camera follows sustained descent');

mario.pos.y = 195;
focusPlayer(level);
assertEqual(level.camera.pos.y, 32, 'Jump inside dead zone leaves camera still');

mario.pos.y = 448;
focusPlayer(level);
assertEqual(level.camera.pos.y, 240, 'Camera clamps at level floor');

mario.pos.y = 240;
focusPlayer(level);
assertEqual(level.camera.pos.y, 176, 'Camera follows sustained ascent');

level.camera.pos.y = 240;
mario.pos.y = 64;
focusPlayer(level);
assertEqual(level.camera.pos.y, 0, 'Camera catches a teleport to spawn');

const marioScreenTop = mario.bounds.top - level.camera.pos.y;
const marioScreenBottom = mario.bounds.bottom - level.camera.pos.y;
if (marioScreenTop < 0 || marioScreenBottom > level.camera.size.y) {
    throw new Error('Mario must be visible immediately after teleport camera catch-up');
}

const existingLevel = new Level();
existingLevel.setDimensions(212, 15);
const existingMario = new Entity();
existingMario.size.set(14, 16);
existingMario.pos.set(64, 192);
makePlayer(existingMario, 'MARIO');
existingLevel.entities.add(existingMario);
focusPlayer(existingLevel);
assertEqual(
    existingLevel.camera.pos.y,
    0,
    'Existing level remains vertically aligned while Mario stands on the ground',
);

existingMario.pos.y = 400;
focusPlayer(existingLevel);
assertEqual(
    existingLevel.camera.pos.y,
    0,
    'A canvas-height level remains vertically fixed when Mario falls out of bounds',
);

const drawEvents: string[] = [];
const videoContext = {
    canvas: {width: 256, height: 240},
    clearRect: (x: number, y: number, width: number, height: number): void => {
        drawEvents.push(`clear:${x},${y},${width},${height}`);
    },
} as unknown as CanvasRenderingContext2D;
existingLevel.comp.layers.push(() => drawEvents.push('layer'));
existingLevel.draw({videoContext} as GameContext);
assertEqual(
    drawEvents,
    ['clear:0,0,256,240', 'layer'],
    'Level clears stale pixels before drawing camera layers',
);

console.log('Vertical camera following regression passed');
