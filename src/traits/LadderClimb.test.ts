import Entity from '../Entity.js';
import {createRockFactory} from '../entities/Rock.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import Carrier from './Carrier.js';
import Climbable from './Climbable.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LadderClimb, {
    SPELUNKY_LADDER_CLIMB_SPEED,
    SPELUNKY_LADDER_JUMP_HORIZONTAL_VELOCITY,
    SPELUNKY_LADDER_MOUNT_TOLERANCE,
    SPELUNKY_LADDER_TOP_MOUNT_TOLERANCE,
} from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import Physics from './Physics.js';
import Pickable from './Pickable.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertClose(actual: number, expected: number, message: string): void {
    if (Math.abs(actual - expected) > 1e-9) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

const deltaTime = 1 / 60;
const gameContext = {deltaTime} as GameContext;

function createLadder(level: Level): Entity {
    const ladder = new Entity();
    ladder.pos.set(32, 32);
    ladder.size.set(16, 64);
    ladder.addTrait(new Climbable());
    level.entities.add(ladder);
    return ladder;
}

function createPlayer(): {
    entity: Entity;
    carrier: Carrier;
    crouch: Crouch;
    go: Go;
    jump: Jump;
    killable: Killable;
    climb: LadderClimb;
    physics: Physics;
} {
    const entity = new Entity();
    const physics = new Physics();
    const crouch = new Crouch();
    const go = new Go();
    const jump = new Jump();
    const killable = new Killable();
    const carrier = new Carrier();
    const climb = new LadderClimb();
    entity.size.set(14, 16);
    entity.addTrait(physics);
    entity.addTrait(crouch);
    entity.addTrait(go);
    entity.addTrait(jump);
    entity.addTrait(killable);
    entity.addTrait(carrier);
    entity.addTrait(climb);
    entity.addTrait(new LedgeHang());
    return {entity, carrier, crouch, go, jump, killable, climb, physics};
}

function update(climb: LadderClimb, entity: Entity, level: Level): void {
    climb.update(entity, gameContext, level);
}

const level = new Level();
const ladder = createLadder(level);

const airborne = createPlayer();
airborne.entity.pos.set(35, 48);
airborne.entity.vel.set(22, 40);
airborne.jump.phase = 'falling';
airborne.jump.ready = -1;
airborne.climb.setVerticalInput(-1, true);
update(airborne.climb, airborne.entity, level);
assertEqual(
    [
        airborne.climb.phase,
        airborne.entity.pos.x,
        airborne.entity.vel.x,
        airborne.entity.vel.y,
        airborne.physics.enabled,
        airborne.physics.grounded,
        airborne.go.enabled,
        airborne.jump.phase,
    ],
    ['clinging', 33, 0, 0, false, false, false, 'falling'],
    'Up mounts an aligned airborne player, centers them, and suspends gravity',
);

for (const [phase, velocityY] of [
    ['rising', -40],
    ['falling', 40],
] as const) {
    const airborneDown = createPlayer();
    airborneDown.entity.pos.set(33, 48);
    airborneDown.entity.vel.y = velocityY;
    airborneDown.jump.phase = phase;
    airborneDown.jump.ready = -1;
    airborneDown.climb.setVerticalInput(1, true);
    update(airborneDown.climb, airborneDown.entity, level);
    assertEqual(
        [
            airborneDown.climb.active,
            airborneDown.entity.pos.x,
            airborneDown.entity.vel.y,
            airborneDown.physics.enabled,
            airborneDown.jump.phase,
        ],
        [false, 33, velocityY, true, phase],
        `Down cannot remount the ladder while ${phase}`,
    );
}

const mountedY = airborne.entity.pos.y;
update(airborne.climb, airborne.entity, level);
assertEqual(airborne.climb.phase, 'climbing', 'Held Up begins vertical traversal after the cling frame');
assertClose(
    airborne.entity.pos.y,
    mountedY - SPELUNKY_LADDER_CLIMB_SPEED * deltaTime,
    'Up traverses at the named Classic ladder speed',
);
airborne.climb.setVerticalInput(-1, false);
update(airborne.climb, airborne.entity, level);
const clingingY = airborne.entity.pos.y;
update(airborne.climb, airborne.entity, level);
assertEqual(airborne.climb.phase, 'clinging', 'Releasing vertical input returns to the held pose');
assertClose(airborne.entity.pos.y, clingingY, 'Clinging remains fixed without gravity drift');

const toleranceEdge = createPlayer();
toleranceEdge.entity.pos.set(
    33 + SPELUNKY_LADDER_MOUNT_TOLERANCE - 0.01,
    48,
);
toleranceEdge.climb.setVerticalInput(-1, true);
update(toleranceEdge.climb, toleranceEdge.entity, level);
assertEqual(toleranceEdge.climb.active, true, 'Player just inside the named horizontal tolerance can mount');

const outsideTolerance = createPlayer();
outsideTolerance.entity.pos.set(
    33 + SPELUNKY_LADDER_MOUNT_TOLERANCE,
    48,
);
outsideTolerance.climb.setVerticalInput(-1, true);
update(outsideTolerance.climb, outsideTolerance.entity, level);
assertEqual(outsideTolerance.climb.active, false, 'Classic four-pixel boundary cannot snap sideways');

const headOnly = createPlayer();
headOnly.entity.pos.set(33, 17);
headOnly.climb.setVerticalInput(-1, true);
update(headOnly.climb, headOnly.entity, level);
assertEqual(
    headOnly.climb.active,
    false,
    'A head-only overlap above the ladder does not count as sufficiently inside',
);

const fromTop = createPlayer();
fromTop.entity.pos.set(33, 16);
fromTop.physics.grounded = true;
fromTop.crouch.phase = 'crouched';
fromTop.entity.size.y = 10;
fromTop.entity.bounds.bottom = ladder.bounds.top;
fromTop.climb.setVerticalInput(1, true);
update(fromTop.climb, fromTop.entity, level);
assertEqual(
    [fromTop.climb.phase, fromTop.entity.size.y, fromTop.entity.bounds.bottom],
    ['clinging', 16, 32],
    'Down mounts from the walkable top and cancels the simultaneous crouch shape',
);
update(fromTop.climb, fromTop.entity, level);
assertEqual(
    fromTop.entity.bounds.bottom > ladder.bounds.top,
    true,
    'Held Down descends into the ladder column',
);

const forgivingTop = createPlayer();
forgivingTop.entity.pos.set(
    33 + SPELUNKY_LADDER_TOP_MOUNT_TOLERANCE,
    16,
);
forgivingTop.physics.grounded = true;
forgivingTop.crouch.phase = 'entering';
forgivingTop.entity.size.y = 10;
forgivingTop.entity.bounds.bottom = ladder.bounds.top;
forgivingTop.climb.setVerticalInput(1, true);
update(forgivingTop.climb, forgivingTop.entity, level);
assertEqual(
    [
        forgivingTop.climb.phase,
        forgivingTop.entity.pos.x,
        forgivingTop.entity.size.y,
        forgivingTop.crouch.phase,
    ],
    ['clinging', 33, 16, 'standing'],
    'Down anywhere over the ladder cap wins over crouch and centers the player',
);

const beyondTop = createPlayer();
beyondTop.entity.pos.set(
    33 + SPELUNKY_LADDER_TOP_MOUNT_TOLERANCE + 0.01,
    16,
);
beyondTop.physics.grounded = true;
beyondTop.climb.setVerticalInput(1, true);
update(beyondTop.climb, beyondTop.entity, level);
assertEqual(
    beyondTop.climb.active,
    false,
    'Down does not pull a player whose center is beyond the ladder cap',
);

const topOut = createPlayer();
topOut.entity.pos.set(33, 24);
topOut.climb.setVerticalInput(-1, true);
update(topOut.climb, topOut.entity, level);
for (let index = 0; index < 30 && topOut.climb.active; index++) {
    update(topOut.climb, topOut.entity, level);
}
assertEqual(
    [
        topOut.climb.phase,
        topOut.entity.bounds.bottom,
        topOut.physics.enabled,
        topOut.physics.grounded,
        topOut.jump.phase,
    ],
    ['inactive', ladder.bounds.top, true, true, 'grounded'],
    'Climbing through the cap transitions directly to standing on the ladder top',
);

const bottomLevel = new Level();
const bottomLadder = createLadder(bottomLevel);
const terrain = new Matrix<{type: string}>();
terrain.set(2, 6, {type: 'ground'});
bottomLevel.tileCollider.addGrid(terrain);
const bottomOut = createPlayer();
bottomOut.entity.pos.set(33, 76);
bottomOut.jump.phase = 'falling';
bottomOut.climb.setVerticalInput(-1, true);
update(bottomOut.climb, bottomOut.entity, bottomLevel);
bottomOut.climb.setVerticalInput(-1, false);
bottomOut.climb.setVerticalInput(1, true);
for (let index = 0; index < 30 && bottomOut.climb.active; index++) {
    update(bottomOut.climb, bottomOut.entity, bottomLevel);
}
assertEqual(
    [
        bottomOut.climb.phase,
        bottomOut.entity.bounds.bottom,
        bottomOut.physics.grounded,
        bottomOut.jump.phase,
    ],
    ['inactive', bottomLadder.bounds.bottom, true, 'grounded'],
    'The ladder bottom exits cleanly onto supporting terrain',
);

const jumpOff = createPlayer();
jumpOff.entity.pos.set(33, 48);
jumpOff.climb.setVerticalInput(-1, true);
update(jumpOff.climb, jumpOff.entity, level);
jumpOff.go.dir = 1;
jumpOff.jump.start();
update(jumpOff.climb, jumpOff.entity, level);
assertEqual(
    [
        jumpOff.climb.phase,
        jumpOff.physics.enabled,
        jumpOff.go.enabled,
        jumpOff.entity.vel.x,
        jumpOff.entity.vel.y,
        jumpOff.jump.phase,
    ],
    [
        'inactive',
        true,
        true,
        SPELUNKY_LADDER_JUMP_HORIZONTAL_VELOCITY,
        -jumpOff.jump.launchVelocity,
        'rising',
    ],
    'Jump plus side input exits the ladder with the Classic horizontal launch',
);

const drop = createPlayer();
drop.entity.pos.set(33, 48);
drop.climb.setVerticalInput(-1, true);
update(drop.climb, drop.entity, level);
drop.climb.setVerticalInput(-1, false);
drop.climb.setVerticalInput(1, true);
const dropPosition = [drop.entity.pos.x, drop.entity.pos.y];
drop.jump.start();
update(drop.climb, drop.entity, level);
assertEqual(
    [
        drop.climb.phase,
        drop.physics.enabled,
        drop.physics.grounded,
        drop.jump.phase,
        drop.jump.requestTime,
        drop.entity.vel.x,
        drop.entity.vel.y,
        [drop.entity.pos.x, drop.entity.pos.y],
    ],
    ['inactive', true, false, 'falling', 0, 0, 0, dropPosition],
    'Down plus Jump drops from the current ladder position without launching',
);

const carrying = createPlayer();
carrying.entity.pos.set(33, 48);
const carriedRock = createRockFactory({
    drawFrame: (): void => {},
} as unknown as SpriteSheet)();
const carriedPickable = carriedRock.traits.get(Pickable);
carriedPickable.attach(carriedRock, carrying.entity, 1);
carrying.carrier.carried = carriedRock;
carrying.climb.setVerticalInput(-1, true);
update(carrying.climb, carrying.entity, level);
assertEqual(
    [
        carrying.climb.phase,
        carrying.carrier.carried === carriedRock,
        carriedPickable.carrier === carrying.entity,
        carriedRock.traits.get(Physics).enabled,
        carriedRock.zIndex,
    ],
    ['clinging', true, true, false, carrying.entity.zIndex + 1],
    'A carried rock stays attached while mounting a ladder',
);
carrying.go.dir = -1;
carrying.carrier.update(carrying.entity, gameContext, level);
assertEqual(
    [carriedRock.pos.x, carriedRock.pos.y],
    [carrying.entity.pos.x - 1, carrying.entity.pos.y + 6],
    'Left input places the carried rock on the left while clinging',
);
carrying.go.dir = 1;
carrying.carrier.update(carrying.entity, gameContext, level);
assertEqual(
    [carriedRock.pos.x, carriedRock.pos.y],
    [carrying.entity.pos.x + 7, carrying.entity.pos.y + 6],
    'Right input places the carried rock on the right while clinging',
);
update(carrying.climb, carrying.entity, level);
assertEqual(
    [carrying.climb.phase, carrying.carrier.carried === carriedRock],
    ['climbing', true],
    'A carried rock stays attached during ladder traversal',
);
carrying.jump.start();
update(carrying.climb, carrying.entity, level);
assertEqual(
    [carrying.climb.phase, carrying.carrier.carried === carriedRock],
    ['inactive', true],
    'A carried rock stays attached when jumping away from the ladder',
);

const killed = createPlayer();
killed.entity.pos.set(33, 48);
killed.climb.setVerticalInput(-1, true);
update(killed.climb, killed.entity, level);
killed.killable.dead = true;
update(killed.climb, killed.entity, level);
assertEqual(
    [killed.climb.active, killed.physics.enabled, killed.physics.grounded],
    [false, true, false],
    'Death releases a clinging player back to ordinary airborne physics',
);

const ropeLevel = new Level();
const rope = new Entity();
rope.pos.set(36, 32);
rope.size.set(8, 64);
rope.addTrait(new Climbable('rope'));
ropeLevel.entities.add(rope);

const ropeDownMount = createPlayer();
ropeDownMount.entity.pos.set(33, 48);
ropeDownMount.entity.vel.y = 40;
ropeDownMount.jump.phase = 'falling';
ropeDownMount.jump.ready = -1;
ropeDownMount.climb.setVerticalInput(1, true);
update(ropeDownMount.climb, ropeDownMount.entity, ropeLevel);
assertEqual(
    [
        ropeDownMount.climb.active,
        ropeDownMount.climb.climbableKind,
        ropeDownMount.entity.pos.x,
        ropeDownMount.physics.enabled,
        ropeDownMount.entity.vel.y,
    ],
    [false, null, 33, true, 40],
    'Down does not catch a rope while the player is airborne',
);

const ropeUpMount = createPlayer();
ropeUpMount.entity.pos.set(33, 48);
ropeUpMount.entity.vel.y = 40;
ropeUpMount.jump.phase = 'falling';
ropeUpMount.jump.ready = -1;
ropeUpMount.climb.setVerticalInput(-1, true);
update(ropeUpMount.climb, ropeUpMount.entity, ropeLevel);
assertEqual(
    [
        ropeUpMount.climb.phase,
        ropeUpMount.climb.climbableKind,
        ropeUpMount.entity.pos.x,
        ropeUpMount.physics.enabled,
        ropeUpMount.entity.vel.y,
    ],
    ['clinging', 'rope', 33, false, 0],
    'Up catches an aligned rope during a fall and immediately stops velocity',
);

const ropeTop = createPlayer();
ropeTop.entity.pos.set(33, 36);
ropeTop.climb.setVerticalInput(-1, true);
update(ropeTop.climb, ropeTop.entity, ropeLevel);
for (let index = 0; index < 30; index++) {
    update(ropeTop.climb, ropeTop.entity, ropeLevel);
}
assertEqual(
    [
        ropeTop.climb.phase,
        ropeTop.climb.climbableKind,
        ropeTop.entity.bounds.top,
        ropeTop.physics.enabled,
        ropeTop.physics.grounded,
    ],
    ['clinging', 'rope', rope.bounds.top, false, false],
    'Climbing above a rope anchor clamps to its top without inventing a platform',
);

const dormantRope = new Entity();
dormantRope.pos.set(52, 32);
dormantRope.size.set(8, 64);
const dormantClimbable = new Climbable('rope');
dormantClimbable.active = false;
dormantRope.addTrait(dormantClimbable);
ropeLevel.entities.add(dormantRope);
const dormantMount = createPlayer();
dormantMount.entity.pos.set(49, 48);
dormantMount.climb.setVerticalInput(-1, true);
update(dormantMount.climb, dormantMount.entity, ropeLevel);
assertEqual(
    dormantMount.climb.active,
    false,
    'A tossed rope cannot be mounted before its anchor catches',
);

console.log('Spelunky ladder and rope climbing movement regression passed');
