import Entity, {Sides} from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
import Jump, {
    SPELUNKY_HD_JUMP_BUFFER_TIME,
    SPELUNKY_HD_JUMP_COYOTE_TIME,
    SPELUNKY_HD_JUMP_GRAVITY,
    SPELUNKY_HD_JUMP_GRAVITY_RAMP_TIME,
    SPELUNKY_HD_JUMP_LAUNCH_VELOCITY,
    SPELUNKY_HD_JUMP_TARGET_HEIGHT,
} from './Jump.js';
import Physics from './Physics.js';
import Solid from './Solid.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const FIXED_DELTA_TIME = 1 / 60;
const FLOOR_Y = 224;
const START_Y = FLOOR_Y - 16;

const gameContext = {
    deltaTime: FIXED_DELTA_TIME,
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

interface JumpMeasurement {
    height: number;
    apexFrame: number;
    totalFrames: number;
    jump: Jump;
}

function createJumpLevel(withFloor = true): Level {
    const level = new Level();
    if (withFloor) {
        const floor = new Matrix<CollisionTile>();
        for (let x = 0; x < 24; x++) {
            floor.set(x, FLOOR_Y / 16, {type: 'ground'});
        }
        level.tileCollider.addGrid(floor);
    }
    return level;
}

function createJumper(horizontalVelocity = 0): {
    entity: Entity;
    physics: Physics;
    jump: Jump;
} {
    const entity = new Entity();
    const physics = new Physics();
    const jump = new Jump();
    entity.size.set(14, 16);
    entity.pos.set(64, START_Y);
    entity.vel.x = horizontalVelocity;
    entity.addTrait(physics);
    entity.addTrait(new Solid());
    entity.addTrait(jump);
    return {entity, physics, jump};
}

function step(
    entity: Entity,
    physics: Physics,
    jump: Jump,
    level: Level,
    deltaTime = FIXED_DELTA_TIME,
): void {
    const context = {...gameContext, deltaTime} as GameContext;
    physics.update(entity, context, level);
    jump.update(entity, context, level);
    entity.finalize();
}

function measureJump(
    horizontalVelocity: number,
    releaseFrame?: number,
): JumpMeasurement {
    const level = createJumpLevel();
    const {entity, physics, jump} = createJumper(horizontalVelocity);
    physics.grounded = true;
    jump.ready = 1;
    jump.start();

    let minimumY = START_Y;
    let apexFrame = 0;
    for (let frame = 1; frame <= 120; frame++) {
        if (frame === releaseFrame) {
            jump.cancel();
        }
        step(entity, physics, jump, level);

        if (entity.pos.y < minimumY) {
            minimumY = entity.pos.y;
            apexFrame = frame;
        }

        if (frame > 1 && physics.grounded && entity.pos.y === START_Y) {
            return {
                height: START_Y - minimumY,
                apexFrame,
                totalFrames: frame,
                jump,
            };
        }
    }

    throw new Error('Measured jump did not return to the floor');
}

assertEqual(
    [
        SPELUNKY_HD_JUMP_TARGET_HEIGHT,
        SPELUNKY_HD_JUMP_LAUNCH_VELOCITY,
        SPELUNKY_HD_JUMP_GRAVITY,
        SPELUNKY_HD_JUMP_GRAVITY_RAMP_TIME,
        SPELUNKY_HD_JUMP_BUFFER_TIME,
        SPELUNKY_HD_JUMP_COYOTE_TIME,
    ],
    [24, 120, 900, 10 / 30, 0.1, 0.1],
    'Classic-derived HD jump tuning remains explicit',
);

const standingJump = measureJump(0);
if (Math.abs(standingJump.height - SPELUNKY_HD_JUMP_TARGET_HEIGHT) > 0.5) {
    throw new Error(
        `Standing jump height: expected ${SPELUNKY_HD_JUMP_TARGET_HEIGHT}±0.5, got ${standingJump.height}`,
    );
}
if (standingJump.apexFrame < 18 || standingJump.apexFrame > 20) {
    throw new Error(`Standing jump apex: expected frame 18-20, got ${standingJump.apexFrame}`);
}
if (standingJump.totalFrames < 32 || standingJump.totalFrames > 34) {
    throw new Error(`Standing jump airtime: expected 32-34 frames, got ${standingJump.totalFrames}`);
}
assertEqual(standingJump.jump.phase, 'grounded', 'Landing restores grounded phase');

const runningJump = measureJump(180);
if (Math.abs(runningJump.height - standingJump.height) > 0.001) {
    throw new Error(
        `Running should not change jump height: standing ${standingJump.height}, running ${runningJump.height}`,
    );
}
assertEqual(
    [runningJump.apexFrame, runningJump.totalFrames],
    [standingJump.apexFrame, standingJump.totalFrames],
    'Running and standing jump timing',
);

const shortJump = measureJump(0, 3);
if (shortJump.height >= standingJump.height * 0.75 || shortJump.height < 10) {
    throw new Error(
        `Released jump height should be bounded below the held jump: ${shortJump.height}`,
    );
}

const buffered = createJumper();
const bufferedLevel = createJumpLevel();
buffered.entity.pos.y = START_Y - 2;
buffered.entity.vel.y = 90;
buffered.jump.phase = 'falling';
buffered.jump.start();
for (let frame = 0; frame < 10 && buffered.entity.vel.y >= 0; frame++) {
    step(buffered.entity, buffered.physics, buffered.jump, bufferedLevel);
}
assertEqual(buffered.jump.phase, 'rising', 'Buffered request launches on landing');
assertEqual(buffered.entity.vel.y, -buffered.jump.launchVelocity, 'Buffered launch velocity');

const coyote = createJumper();
const noFloor = createJumpLevel(false);
coyote.physics.grounded = false;
coyote.jump.coyoteTime = coyote.jump.coyoteDuration;
coyote.jump.phase = 'falling';
coyote.jump.start();
step(coyote.entity, coyote.physics, coyote.jump, noFloor);
assertEqual(coyote.jump.phase, 'rising', 'Coyote-time request launches after leaving ground');
assertEqual(coyote.entity.vel.y, -coyote.jump.launchVelocity, 'Coyote launch velocity');

const expiredCoyote = createJumper();
expiredCoyote.physics.grounded = false;
expiredCoyote.jump.coyoteTime = 0;
expiredCoyote.jump.phase = 'falling';
expiredCoyote.jump.start();
step(expiredCoyote.entity, expiredCoyote.physics, expiredCoyote.jump, noFloor);
assertEqual(expiredCoyote.jump.phase, 'falling', 'Expired coyote time does not launch');

const ceiling = createJumper();
ceiling.jump.phase = 'rising';
ceiling.entity.vel.y = -100;
ceiling.jump.obstruct(ceiling.entity, Sides.TOP);
assertEqual(ceiling.jump.phase, 'falling', 'Ceiling collision ends rising phase');

const rebound = createJumper();
rebound.jump.start();
rebound.jump.rebound(rebound.entity, 180);
assertEqual(
    [
        rebound.entity.vel.y,
        rebound.jump.phase,
        rebound.jump.requestTime,
        rebound.physics.grounded,
    ],
    [-180, 'rising', 0, false],
    'Enemy rebound resets incompatible jump state',
);
rebound.jump.cancel();
step(rebound.entity, rebound.physics, rebound.jump, noFloor);
assertEqual(
    rebound.entity.vel.y,
    -180 + SPELUNKY_HD_JUMP_GRAVITY * FIXED_DELTA_TIME,
    'Button release does not alter the full-gravity enemy rebound',
);
if (rebound.jump.phase !== 'rising') {
    throw new Error('Enemy rebound remains rising after its first airborne step');
}

console.log(
    `Spelunky HD jump trajectory passed (${standingJump.height.toFixed(2)}px, apex frame ${standingJump.apexFrame}, landed frame ${standingJump.totalFrames}, short ${shortJump.height.toFixed(2)}px)`,
);
