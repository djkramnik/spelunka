import Entity from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type MusicPlayer from '../MusicPlayer.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
import Carrier from './Carrier.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Health from './Health.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LadderClimb from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import Physics from './Physics.js';
import Pickable from './Pickable.js';
import PlayerController from './PlayerController.js';
import PlayerDeath, {
    SPELUNKY_DEAD_BODY_CEILING_REBOUND,
    SPELUNKY_DEAD_BODY_FLOOR_FRICTION,
    SPELUNKY_DEAD_BODY_FLOOR_REBOUND,
    SPELUNKY_DEAD_BODY_GRAVITY,
    SPELUNKY_DEAD_BODY_HORIZONTAL_SETTLE_SPEED,
    SPELUNKY_DEAD_BODY_TERMINAL_VELOCITY,
    SPELUNKY_DEAD_BODY_VERTICAL_SETTLE_SPEED,
    SPELUNKY_DEAD_BODY_WALL_REBOUND,
} from './PlayerDeath.js';
import Solid from './Solid.js';

function assertEqual<Value>(actual: Value, expected: Value, message: string): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
            `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
    }
}

function createPlayer(): Entity {
    const player = new Entity();
    player.size.set(14, 16);
    player.addTrait(new Physics());
    player.addTrait(new Solid());
    player.addTrait(new Crouch());
    player.addTrait(new PlayerDeath());
    player.addTrait(new Go());
    player.addTrait(new Health());
    player.addTrait(new Jump());
    player.addTrait(new Killable());
    player.addTrait(new Carrier());
    player.addTrait(new LadderClimb());
    player.addTrait(new LedgeHang());
    return player;
}

const context = {
    deltaTime: 1 / 60,
    audioContext: {},
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

const level = new Level();
let musicPlayCalls = 0;
let musicPauseCalls = 0;
level.music.setPlayer({
    playTrack: (): HTMLAudioElement => {
        musicPlayCalls++;
        return {
            playbackRate: 1,
            loop: true,
            addEventListener: (): void => {},
        } as unknown as HTMLAudioElement;
    },
    pauseAll: (): void => {
        musicPauseCalls++;
    },
} as unknown as MusicPlayer);
const floor = new Matrix<CollisionTile>();
for (let x = 0; x < 64; x++) {
    floor.set(x, 10, {type: 'ground'});
}
level.tileCollider.addGrid(floor);

const player = createPlayer();
player.pos.set(64, 120);
const death = player.traits.get(PlayerDeath);
const go = player.traits.get(Go);
const jump = player.traits.get(Jump);
const solid = player.traits.get(Solid);
const killable = player.traits.get(Killable);
const carrier = player.traits.get(Carrier);

const carried = new Entity();
const carriedPhysics = new Physics();
const pickable = new Pickable();
carried.addTrait(carriedPhysics);
carried.addTrait(pickable);
carrier.collides(player, carried);
carrier.pickup(player);

go.dir = -1;
jump.start();
assertEqual(death.kill(player, 180, 120), true, 'First lethal launch is accepted');
assertEqual(death.kill(player, -999, 999), false, 'Terminal death cannot relaunch');
player.finalize();

assertEqual(
    [
        death.phase,
        killable.dead,
        player.vel.x,
        player.vel.y,
        player.entityCollisionsEnabled,
        go.enabled,
        go.dir,
        death.direction,
        jump.enabled,
        jump.requestTime,
    ],
    ['airborne', true, 180, -120, false, false, 0, 1, false, 0],
    'Death atomically launches the body and disables controls and contact',
);
assertEqual(
    [carrier.carried, pickable.carrier, carriedPhysics.enabled, carried.vel.x, carried.vel.y],
    [null, null, true, 180, -120],
    'Death drops a carried item with the body launch velocity',
);
assertEqual(
    [
        solid.wallRebound,
        solid.floorRebound,
        solid.ceilingRebound,
        solid.floorFriction,
        solid.horizontalSettleSpeed,
        solid.verticalSettleSpeed,
    ],
    [
        SPELUNKY_DEAD_BODY_WALL_REBOUND,
        SPELUNKY_DEAD_BODY_FLOOR_REBOUND,
        SPELUNKY_DEAD_BODY_CEILING_REBOUND,
        SPELUNKY_DEAD_BODY_FLOOR_FRICTION,
        SPELUNKY_DEAD_BODY_HORIZONTAL_SETTLE_SPEED,
        SPELUNKY_DEAD_BODY_VERTICAL_SETTLE_SPEED,
    ],
    'Death installs the Classic rebound, friction, and settle coefficients',
);
if (killable.removeAfter !== Infinity) {
    throw new Error('Terminal body must not be scheduled for removal');
}

player.update(context, level);
player.finalize();
assertEqual(musicPauseCalls, 1, 'Terminal death stops level music once');
level.music.playTheme();
level.music.playHurryTheme();
assertEqual(
    musicPlayCalls,
    0,
    'Timer theme requests cannot restart music after terminal death',
);
assertEqual(
    player.vel.y,
    -120 + SPELUNKY_DEAD_BODY_GRAVITY * context.deltaTime,
    'Dead body uses converted Classic gravity rather than live jump gravity',
);

player.vel.x = -90;
death.update(player, {...context, deltaTime: 0}, level);
assertEqual(
    death.direction,
    -1,
    'Airborne body facing follows reversed horizontal travel',
);
player.vel.x = 180;

for (let update = 0; update < 300 && death.phase !== 'settled'; update++) {
    player.update(context, level);
    player.finalize();
    if (player.vel.y > SPELUNKY_DEAD_BODY_TERMINAL_VELOCITY) {
        throw new Error('Dead body exceeded its Classic terminal velocity');
    }
}

assertEqual(
    [death.phase, player.vel.x, player.vel.y, level.entities.has(player)],
    ['settled', 0, 0, false],
    'Rebounds decay into a motionless unconscious body',
);

level.entities.add(player);
for (let update = 0; update < 180; update++) {
    player.update(context, level);
    player.finalize();
}
assertEqual(
    [level.entities.has(player), death.phase, musicPauseCalls],
    [true, 'settled', 1],
    'Terminal body remains in the level indefinitely',
);

const controllerEntity = new Entity();
const controller = new PlayerController();
controllerEntity.addTrait(controller);
level.entities.delete(player);
controller.setPlayer(player);
player.traits.get(Health).damage(4);
controller.update(controllerEntity, context, level);
assertEqual(
    level.entities.has(player),
    false,
    'A depleted player cannot trigger legacy checkpoint auto-respawn',
);

console.log('Terminal player death physics and lifecycle passed');
