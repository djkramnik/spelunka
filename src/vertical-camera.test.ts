import Entity from './Entity.js';
import Level, {focusPlayer} from './Level.js';
import {makePlayer} from './player.js';
import Crouch, {
    SPELUNKY_CROUCH_LOOK_CAMERA_DISTANCE,
} from './traits/Crouch.js';
import LookUp, {
    SPELUNKY_LOOK_UP_CAMERA_DISTANCE,
} from './traits/LookUp.js';
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
assertEqual(level.camera.pos.y, 92, 'Camera follows sustained descent');

mario.pos.y = 195;
focusPlayer(level);
assertEqual(level.camera.pos.y, 92, 'Jump inside dead zone leaves camera still');

mario.pos.y = 448;
focusPlayer(level);
assertEqual(level.camera.pos.y, 300, 'Camera clamps at level floor');

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
    44,
    'Widescreen camera follows Mario to the ground in an existing level',
);

existingMario.pos.y = 400;
focusPlayer(existingLevel);
assertEqual(
    existingLevel.camera.pos.y,
    60,
    'Widescreen camera clamps at the bottom of an existing level',
);

const transitionLevel = new Level();
transitionLevel.setDimensions(30, 30);
const transitionMario = new Entity();
transitionMario.size.set(14, 16);
transitionMario.pos.set(200, 200);
const transitionCrouch = new Crouch();
transitionMario.addTrait(transitionCrouch);
makePlayer(transitionMario, 'MARIO');
transitionLevel.entities.add(transitionMario);
focusPlayer(transitionLevel);
const cameraBeforeTransition = [
    transitionLevel.camera.pos.x,
    transitionLevel.camera.pos.y,
];
transitionMario.pos.x += 8;
transitionMario.pos.y += 10;
transitionCrouch.transitionOffset.set(-8, -10);
transitionCrouch.transitionAnchorActive = true;
focusPlayer(transitionLevel);
assertEqual(
    [transitionLevel.camera.pos.x, transitionLevel.camera.pos.y],
    cameraBeforeTransition,
    'Scripted crawl-to-hang correction preserves the camera focus anchor',
);

const lookLevel = new Level();
lookLevel.setDimensions(30, 30);
const lookingMario = new Entity();
lookingMario.size.set(14, 16);
lookingMario.pos.set(200, 240);
const lookUp = new LookUp();
lookingMario.addTrait(lookUp);
makePlayer(lookingMario, 'MARIO');
lookLevel.entities.add(lookingMario);
focusPlayer(lookLevel);
assertEqual(lookLevel.camera.pos.y, 92, 'Look-up test starts at ordinary framing');
lookUp.cameraOffset = SPELUNKY_LOOK_UP_CAMERA_DISTANCE / 2;
focusPlayer(lookLevel);
assertEqual(
    lookLevel.camera.pos.y,
    60,
    'Partial look-up offset pans upward without accumulating between frames',
);
lookUp.cameraOffset = SPELUNKY_LOOK_UP_CAMERA_DISTANCE;
focusPlayer(lookLevel);
assertEqual(lookLevel.camera.pos.y, 28, 'Full look-up offset reaches four tiles upward');
lookUp.cameraOffset = 0;
focusPlayer(lookLevel);
assertEqual(lookLevel.camera.pos.y, 92, 'Removing look-up offset restores ordinary framing');
lookingMario.pos.y = 64;
lookUp.cameraOffset = SPELUNKY_LOOK_UP_CAMERA_DISTANCE;
focusPlayer(lookLevel);
assertEqual(lookLevel.camera.pos.y, 0, 'Upward look clamps at the level ceiling');
focusPlayer(lookLevel);
assertEqual(lookLevel.camera.pos.y, 0, 'Ceiling clamp remains stable across frames');

const downLevel = new Level();
downLevel.setDimensions(30, 30);
const downMario = new Entity();
downMario.size.set(14, 10);
downMario.pos.set(200, 246);
const downCrouch = new Crouch();
downMario.addTrait(downCrouch);
makePlayer(downMario, 'MARIO');
downLevel.entities.add(downMario);
focusPlayer(downLevel);
assertEqual(downLevel.camera.pos.y, 92, 'Downward-look test starts at ordinary framing');
downCrouch.cameraOffset = SPELUNKY_CROUCH_LOOK_CAMERA_DISTANCE / 2;
focusPlayer(downLevel);
assertEqual(
    downLevel.camera.pos.y,
    124,
    'Partial crouch-look offset pans down without accumulating between frames',
);
downCrouch.cameraOffset = SPELUNKY_CROUCH_LOOK_CAMERA_DISTANCE;
focusPlayer(downLevel);
assertEqual(downLevel.camera.pos.y, 156, 'Full crouch look reaches four tiles downward');
downCrouch.cameraOffset = 0;
focusPlayer(downLevel);
assertEqual(downLevel.camera.pos.y, 92, 'Removing crouch-look offset restores ordinary framing');
downMario.pos.y = 438;
downCrouch.cameraOffset = SPELUNKY_CROUCH_LOOK_CAMERA_DISTANCE;
focusPlayer(downLevel);
assertEqual(downLevel.camera.pos.y, 300, 'Downward look clamps at the level floor');
focusPlayer(downLevel);
assertEqual(downLevel.camera.pos.y, 300, 'Floor clamp remains stable across frames');

const drawEvents: string[] = [];
const videoContext = {
    canvas: {width: 320, height: 180},
    clearRect: (x: number, y: number, width: number, height: number): void => {
        drawEvents.push(`clear:${x},${y},${width},${height}`);
    },
} as unknown as CanvasRenderingContext2D;
existingLevel.comp.layers.push(() => drawEvents.push('layer'));
existingLevel.draw({videoContext} as GameContext);
assertEqual(
    drawEvents,
    ['clear:0,0,320,180', 'layer'],
    'Level clears stale pixels before drawing camera layers',
);

console.log('Vertical camera following regression passed');
