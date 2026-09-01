import Entity from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import {makePlayer} from '../player.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import type {CollisionTile} from '../TileCollider.js';
import Carrier from '../traits/Carrier.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Pickable from '../traits/Pickable.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';
import {createBulletFactory} from './Bullet.js';
import {createGoombaFactory} from './Goomba.js';
import {createKoopaFactory} from './Koopa.js';
import {createRedShellFactory, RedShellBehavior} from './RedShell.js';

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
    drawFrame: (name: string): void => {
        drawCalls.push(name);
    },
} as unknown as SpriteSheet;
const shell = createRedShellFactory(sprite)();

assertEqual([shell.size.x, shell.size.y], [16, 16], 'Red shell size');
assertEqual([shell.offset.x, shell.offset.y], [0, 8], 'Red shell bounds offset');
assertEqual(shell.traits.has(Pickable), true, 'Red shell pickup capability');
assertEqual(shell.traits.has(Physics), true, 'Red shell free-item physics');
assertEqual(shell.traits.has(Solid), true, 'Red shell solid-tile collision');
assertEqual(shell.traits.has(RedShellBehavior), true, 'Red shell collision behavior');
assertEqual(
    [
        shell.traits.get(Solid).wallRebound,
        shell.traits.get(Solid).floorRebound,
        shell.traits.get(Solid).ceilingRebound,
        shell.traits.get(Solid).floorFriction,
        shell.traits.get(Solid).horizontalSettleSpeed,
        shell.traits.get(Solid).verticalSettleSpeed,
    ],
    [0.5, 0.5, 0.8, 0.3, 6, 60],
    'Red shell rebound, friction, and settling tuning',
);

shell.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls, ['idle'], 'Red shell sprite frame');

const mario = new Entity();
mario.size.set(14, 16);
mario.pos.set(64, 208);
mario.vel.set(30, 0);
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
assertEqual([mario.vel.x, mario.vel.y], [30, 0], 'Mario velocity');
assertEqual(mario.traits.get(Killable).dead, false, 'Mario alive state');
assertEqual(player.score, 0, 'Mario score');
assertEqual([shell.pos.x, shell.pos.y], [64, 200], 'Red shell position');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Red shell velocity');

interface ShellCollisionResult {
    mario: Entity;
    shell: Entity;
    stomper: Stomper;
}

function collideMarioWithShell(
    shellVelocityX: number,
    marioVelocityY = 0,
    marioY = marioVelocityY > 0 ? 193 : 208,
): ShellCollisionResult {
    const collisionMario = new Entity();
    const stomper = new Stomper();
    collisionMario.size.set(14, 16);
    collisionMario.pos.set(64, marioY);
    collisionMario.vel.y = marioVelocityY;
    collisionMario.addTrait(new Killable());
    collisionMario.addTrait(stomper);

    const collisionShell = createRedShellFactory(sprite)();
    collisionShell.pos.set(64, 200);
    collisionShell.vel.x = shellVelocityX;

    new EntityCollider(new Set([collisionMario, collisionShell])).check();
    collisionMario.finalize();
    collisionShell.finalize();

    return {mario: collisionMario, shell: collisionShell, stomper};
}

const shellBehavior = shell.traits.get(RedShellBehavior);
assertEqual(
    [
        shellBehavior.dangerousHorizontalSpeed,
        shellBehavior.stompDownwardSpeed,
        shellBehavior.stompRegionDepth,
    ],
    [240, 200, 8],
    'Red shell danger and stomp response tuning',
);

const enemySprite = {
    drawFrame: (): void => {},
    getAnimation: (): (() => string) => (): string => 'walk',
} as unknown as SpriteSheet;

type EnemyFactory = () => Entity;

function collideEnemyWithShell(
    createEnemy: EnemyFactory,
    shellVelocityX: number,
    carried = false,
): Entity {
    const enemy = createEnemy();
    const projectileShell = createRedShellFactory(sprite)();
    projectileShell.vel.x = shellVelocityX;

    if (carried) {
        projectileShell.traits.get(Pickable).attach(
            projectileShell,
            new Entity(),
        );
    }

    projectileShell.collides(enemy);
    enemy.finalize();
    projectileShell.finalize();
    return enemy;
}

const enemyCases: readonly [name: string, createEnemy: EnemyFactory][] = [
    ['Bullet', createBulletFactory(enemySprite)],
    ['Goomba', createGoombaFactory(enemySprite)],
    ['Koopa', createKoopaFactory(enemySprite)],
];

for (const [name, createEnemy] of enemyCases) {
    const hitEnemy = collideEnemyWithShell(
        createEnemy,
        shellBehavior.dangerousHorizontalSpeed,
    );
    assertEqual(
        hitEnemy.traits.get(Killable).dead,
        true,
        `Fast thrown shell kills ${name}`,
    );
}

const stationaryEnemy = collideEnemyWithShell(
    createGoombaFactory(enemySprite),
    0,
);
assertEqual(
    stationaryEnemy.traits.get(Killable).dead,
    false,
    'Stationary shell does not kill enemy targets',
);

const slowEnemy = collideEnemyWithShell(
    createGoombaFactory(enemySprite),
    shellBehavior.dangerousHorizontalSpeed - 1,
);
assertEqual(
    slowEnemy.traits.get(Killable).dead,
    false,
    'Below-threshold shell does not kill enemy targets',
);

const carriedShellEnemy = collideEnemyWithShell(
    createGoombaFactory(enemySprite),
    shellBehavior.dangerousHorizontalSpeed,
    true,
);
assertEqual(
    carriedShellEnemy.traits.get(Killable).dead,
    false,
    'Carried shell does not kill enemy targets',
);

const stationaryImpact = collideMarioWithShell(0);
assertEqual(
    stationaryImpact.mario.traits.get(Killable).dead,
    false,
    'Stationary shell does not kill Mario',
);

const slowImpact = collideMarioWithShell(
    shellBehavior.dangerousHorizontalSpeed - 1,
);
assertEqual(
    slowImpact.mario.traits.get(Killable).dead,
    false,
    'Below-threshold shell does not kill Mario',
);

const sideFallImpact = collideMarioWithShell(0, 25, 208);
assertEqual(
    sideFallImpact.mario.vel.y,
    25,
    'Downward side contact does not bounce Mario',
);

const outsideTopRegion = collideMarioWithShell(0, 300, 201);
assertEqual(
    outsideTopRegion.mario.vel.y,
    300,
    'Contact below top stomp region does not bounce Mario',
);

const topRegionBoundary = collideMarioWithShell(0, 300, 200);
assertEqual(
    topRegionBoundary.mario.vel.y,
    -topRegionBoundary.stomper.reboundSpeedFor(300),
    'Contact at top stomp-region boundary bounces Mario',
);

const pickupMario = new Entity();
const pickupCarrier = new Carrier();
pickupMario.size.set(14, 16);
pickupMario.pos.set(64, 208);
pickupMario.vel.y = 25;
pickupMario.addTrait(new Killable());
pickupMario.addTrait(new Stomper());
pickupMario.addTrait(pickupCarrier);
const sidePickupShell = createRedShellFactory(sprite)();
sidePickupShell.pos.set(64, 200);
new EntityCollider(new Set([pickupMario, sidePickupShell])).check();
assertEqual(
    pickupCarrier.pickup(pickupMario) === sidePickupShell,
    true,
    'Side-contact shell remains eligible for pickup',
);
pickupMario.finalize();
sidePickupShell.finalize();
assertEqual(
    pickupMario.vel.y,
    25,
    'Side pickup does not queue a stomp bounce',
);

const rightDangerousImpact = collideMarioWithShell(
    shellBehavior.dangerousHorizontalSpeed,
);
assertEqual(
    rightDangerousImpact.mario.traits.get(Killable).dead,
    true,
    'Right-moving shell kills Mario at threshold',
);

const leftDangerousImpact = collideMarioWithShell(
    -shellBehavior.dangerousHorizontalSpeed,
);
assertEqual(
    leftDangerousImpact.mario.traits.get(Killable).dead,
    true,
    'Left-moving shell kills Mario at threshold',
);

const stompImpact = collideMarioWithShell(
    shellBehavior.dangerousHorizontalSpeed * 2,
    300,
);
assertEqual(
    stompImpact.mario.traits.get(Killable).dead,
    false,
    'Stomp takes precedence over fast-shell damage',
);
assertEqual(
    stompImpact.mario.vel.y,
    -stompImpact.stomper.reboundSpeedFor(300),
    'Mario keeps normal stomp bounce',
);
assertEqual(
    [stompImpact.shell.vel.x, stompImpact.shell.vel.y],
    [0, shellBehavior.stompDownwardSpeed],
    'Stomp stops horizontal shell motion and pushes it downward',
);

const carryingMario = new Entity();
const carryingStomper = new Stomper();
carryingMario.size.set(14, 16);
carryingMario.pos.set(64, 208);
carryingMario.vel.y = 300;
carryingMario.addTrait(new Killable());
carryingMario.addTrait(carryingStomper);
const carriedCollisionShell = createRedShellFactory(sprite)();
assertEqual(
    carriedCollisionShell.traits.get(Pickable).attach(
        carriedCollisionShell,
        carryingMario,
    ),
    true,
    'Collision test shell is carried',
);
new EntityCollider(new Set([carryingMario, carriedCollisionShell])).check();
carryingMario.finalize();
carriedCollisionShell.finalize();
assertEqual(
    carryingMario.vel.y,
    300,
    'Mario does not bounce off his carried shell',
);
assertEqual(
    carryingMario.traits.get(Killable).dead,
    false,
    'Carried shell cannot hurt Mario',
);

function createShellCollisionTarget(): Entity {
    const target = new Entity();
    target.size.set(14, 16);
    target.addTrait(new Killable());
    target.addTrait(new Stomper());
    return target;
}

const airborneThrower = createShellCollisionTarget();
airborneThrower.pos.set(64, 208);
airborneThrower.vel.set(0, -300);
const newlyThrownShell = createRedShellFactory(sprite)();
const newlyThrownPickable = newlyThrownShell.traits.get(Pickable);
assertEqual(
    newlyThrownPickable.throwerGraceUpdates,
    10,
    'Newly thrown item protects its thrower for ten collision updates',
);
assertEqual(
    newlyThrownPickable.attach(newlyThrownShell, airborneThrower),
    true,
    'Airborne Mario can carry grace-period test shell',
);
assertEqual(
    newlyThrownPickable.release(newlyThrownShell, airborneThrower),
    true,
    'Airborne Mario releases grace-period test shell',
);
assertEqual(
    newlyThrownPickable.isThrowerProtected(newlyThrownShell, airborneThrower),
    true,
    'Release starts thrower protection',
);
newlyThrownShell.collides(airborneThrower);
airborneThrower.finalize();
newlyThrownShell.finalize();
assertEqual(
    airborneThrower.traits.get(Killable).dead,
    false,
    'A newly thrown shell cannot kill airborne Mario during release overlap',
);
assertEqual(
    airborneThrower.vel.y,
    -300,
    'Grace-period contact does not trigger a shell stomp response',
);

const otherTarget = createShellCollisionTarget();
otherTarget.pos.copy(airborneThrower.pos);
newlyThrownShell.collides(otherTarget);
otherTarget.finalize();
assertEqual(
    otherTarget.traits.get(Killable).dead,
    true,
    'Thrower protection does not make the shell harmless to other targets',
);

newlyThrownShell.vel.x *= -1;
newlyThrownShell.collides(airborneThrower);
airborneThrower.finalize();
assertEqual(
    airborneThrower.traits.get(Killable).dead,
    true,
    'Direction reversal ends grace before a shell returns to its thrower',
);
assertEqual(
    newlyThrownPickable.isThrowerProtected(newlyThrownShell, airborneThrower),
    false,
    'Direction reversal permanently clears thrower protection',
);
airborneThrower.traits.get(Killable).revive();

const expiringShell = createRedShellFactory(sprite)();
const expiringPickable = expiringShell.traits.get(Pickable);
expiringPickable.attach(expiringShell, airborneThrower);
expiringPickable.release(expiringShell, airborneThrower);
for (let update = 0;
    update < expiringPickable.throwerGraceUpdates;
    update++) {
    expiringShell.finalize();
}
assertEqual(
    expiringPickable.isThrowerProtected(expiringShell, airborneThrower),
    false,
    'Same-direction thrower protection still expires after ten updates',
);
airborneThrower.vel.y = 0;
expiringShell.collides(airborneThrower);
airborneThrower.finalize();
assertEqual(
    airborneThrower.traits.get(Killable).dead,
    true,
    'The shell can hurt its thrower after grace expires',
);

const repickedShell = createRedShellFactory(sprite)();
const repickedPickable = repickedShell.traits.get(Pickable);
const repeatThrower = new Entity();
repickedPickable.attach(repickedShell, repeatThrower);
repickedPickable.release(repickedShell, repeatThrower);
assertEqual(
    repickedPickable.isThrowerProtected(repickedShell, repeatThrower),
    true,
    'Each release starts fresh thrower protection',
);
repickedPickable.attach(repickedShell, repeatThrower);
assertEqual(
    repickedPickable.isThrowerProtected(repickedShell, repeatThrower),
    false,
    'Picking a shell up clears stale thrower protection',
);
repickedPickable.release(repickedShell, repeatThrower);
assertEqual(
    repickedPickable.isThrowerProtected(repickedShell, repeatThrower),
    true,
    'A later release starts a new grace-period lifecycle',
);

const gameContext = {
    deltaTime: 1 / 60,
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

const gravityLevel = new Level();
gravityLevel.gravity = 600;
const fallingShell = createRedShellFactory(sprite)();
fallingShell.pos.set(64, 64);
fallingShell.vel.set(120, -60);
fallingShell.update(gameContext, gravityLevel);
assertEqual(
    [fallingShell.pos.x, fallingShell.pos.y, fallingShell.vel.x, fallingShell.vel.y],
    [66, 63, 120, -50],
    'Free shell preserves launch velocity while gravity changes vertical velocity',
);

const carriedShell = createRedShellFactory(sprite)();
const carrier = new Entity();
carrier.pos.set(40, 80);
const carriedPickable = carriedShell.traits.get(Pickable);
assertEqual(
    carriedPickable.attach(carriedShell, carrier),
    true,
    'Physics shell attaches to carrier',
);
assertEqual(
    carriedShell.traits.get(Physics).enabled,
    false,
    'Pickup suspends shell physics',
);
carriedShell.update(gameContext, gravityLevel);
assertEqual(
    [carriedShell.pos.x, carriedShell.pos.y, carriedShell.vel.x, carriedShell.vel.y],
    [48, 72, 0, 0],
    'Carried shell has no physics drift',
);
assertEqual(
    carriedPickable.release(carriedShell, carrier),
    true,
    'Carried shell releases',
);
assertEqual(
    carriedShell.traits.get(Physics).enabled,
    true,
    'Release restores shell physics',
);
carriedShell.update(gameContext, gravityLevel);
assertEqual(
    [carriedShell.pos.x, carriedShell.pos.y],
    [56, 69],
    'Released shell converts launch velocity into movement',
);

function createCollisionLevel(tileX: number, tileY: number): Level {
    const level = new Level();
    level.gravity = 0;
    const tiles = new Matrix<CollisionTile>();
    tiles.set(tileX, tileY, {type: 'ground'});
    level.tileCollider.addGrid(tiles);
    return level;
}

function createMovingShell(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
): Entity {
    const movingShell = createRedShellFactory(sprite)();
    movingShell.pos.set(x, y);
    movingShell.vel.set(velocityX, velocityY);
    return movingShell;
}

const rightImpact = createMovingShell(32, 40, 2400, 90);
rightImpact.update(gameContext, createCollisionLevel(5, 3));
assertEqual(
    [rightImpact.pos.x, rightImpact.vel.x, rightImpact.vel.y],
    [64, -1200, 90],
    'Fast shell rebounds from right wall without changing vertical velocity',
);

const wallBounceThrower = new Entity();
wallBounceThrower.pos.set(24, 48);
wallBounceThrower.vel.x = -80;
const wallBounceFallingShell = createRedShellFactory(sprite)();
const wallBouncePickable = wallBounceFallingShell.traits.get(Pickable);
assertEqual(
    wallBouncePickable.attach(
        wallBounceFallingShell,
        wallBounceThrower,
    ),
    true,
    'Wall-bounce reproduction shell attaches before throw',
);
assertEqual(
    wallBouncePickable.release(
        wallBounceFallingShell,
        wallBounceThrower,
    ),
    true,
    'Wall-bounce reproduction starts with a real throw',
);
assertEqual(
    [wallBounceFallingShell.vel.x, wallBounceFallingShell.vel.y],
    [400, -180],
    'Opposing thrower movement lowers the shell launch speed',
);
wallBounceFallingShell.update(gameContext, createCollisionLevel(3, 3));
assertEqual(
    [wallBounceFallingShell.pos.x, wallBounceFallingShell.vel.x],
    [32, -200],
    'Thrown shell rebounds below its horizontal danger threshold',
);
const wallBounceGoomba = createGoombaFactory(enemySprite)();
wallBounceGoomba.pos.set(32, 60);
wallBounceFallingShell.vel.y = 100;
new EntityCollider(new Set([
    wallBounceGoomba,
    wallBounceFallingShell,
])).check();
wallBounceGoomba.finalize();
wallBounceFallingShell.finalize();
assertEqual(
    wallBounceGoomba.traits.get(Killable).dead,
    true,
    'Falling shell squashes Goomba after wall rebound slows horizontal motion',
);

const closeWallThrower = createShellCollisionTarget();
closeWallThrower.pos.set(32, 40);
const closeWallShell = createRedShellFactory(sprite)();
const closeWallPickable = closeWallShell.traits.get(Pickable);
assertEqual(
    closeWallPickable.attach(closeWallShell, closeWallThrower),
    true,
    'Close-wall reproduction shell attaches before throw',
);
assertEqual(
    closeWallPickable.release(closeWallShell, closeWallThrower),
    true,
    'Close-wall reproduction starts with a real throw',
);
const closeWallLevel = createCollisionLevel(4, 3);
new EntityCollider(new Set([closeWallThrower, closeWallShell])).check();
closeWallThrower.finalize();
closeWallShell.finalize();
assertEqual(
    closeWallThrower.traits.get(Killable).dead,
    false,
    'Initial same-direction release overlap remains protected',
);
for (let update = 0; update < 2; update++) {
    closeWallShell.update(gameContext, closeWallLevel);
    new EntityCollider(new Set([closeWallThrower, closeWallShell])).check();
    closeWallThrower.finalize();
    closeWallShell.finalize();
}
assertEqual(
    [closeWallShell.vel.x, closeWallThrower.traits.get(Killable).dead],
    [-240, false],
    'Nearby wall reverses the shell while Mario remains safe before its return',
);
closeWallShell.update(gameContext, closeWallLevel);
new EntityCollider(new Set([closeWallThrower, closeWallShell])).check();
closeWallThrower.finalize();
closeWallShell.finalize();
assertEqual(
    closeWallThrower.traits.get(Killable).dead,
    true,
    'Wall-rebounded shell collides with Mario instead of clipping through',
);

const leftImpact = createMovingShell(64, 40, -2400, 0);
leftImpact.update(gameContext, createCollisionLevel(2, 3));
assertEqual(
    [leftImpact.pos.x, leftImpact.vel.x],
    [48, 1200],
    'Fast shell rebounds from left wall without tunneling',
);

const floorImpact = createMovingShell(64, 32, 120, 2400);
floorImpact.update(gameContext, createCollisionLevel(4, 5));
assertEqual(
    [floorImpact.pos.y, floorImpact.vel.x, floorImpact.vel.y],
    [56, 36, -1200],
    'Fast shell rebounds from floor and loses horizontal velocity',
);

const ceilingImpact = createMovingShell(64, 64, 0, -2400);
ceilingImpact.update(gameContext, createCollisionLevel(4, 2));
assertEqual(
    [ceilingImpact.pos.y, ceilingImpact.vel.y],
    [40, 1920],
    'Fast shell rebounds from ceiling without tunneling',
);

const lowSpeedImpact = createMovingShell(64, 56, 5, 6);
lowSpeedImpact.update(gameContext, createCollisionLevel(4, 5));
assertEqual(
    [lowSpeedImpact.pos.y, lowSpeedImpact.vel.x, lowSpeedImpact.vel.y],
    [56, 0, 0],
    'Low-speed floor impact settles both velocity components',
);

const airborneMotion = createMovingShell(64, 32, 120, 0);
airborneMotion.update(gameContext, new Level());
assertEqual(
    [airborneMotion.pos.x, airborneMotion.vel.x],
    [66, 120],
    'Floor friction does not affect an airborne shell',
);

const corridor = new Level();
corridor.gravity = 0;
const corridorTiles = new Matrix<CollisionTile>();
corridorTiles.set(4, 1, {type: 'ground'});
corridorTiles.set(4, 5, {type: 'ground'});
corridor.tileCollider.addGrid(corridorTiles);

const repeatedBounce = createMovingShell(64, 32, 30, 2400);
repeatedBounce.update(gameContext, corridor);
assertEqual(
    [repeatedBounce.pos.y, repeatedBounce.vel.x, repeatedBounce.vel.y],
    [56, 9, -1200],
    'First floor rebound and slide lose energy',
);
repeatedBounce.update(gameContext, corridor);
repeatedBounce.update(gameContext, corridor);
assertEqual(
    [repeatedBounce.pos.y, repeatedBounce.vel.y],
    [24, 960],
    'Ceiling rebound loses further speed',
);
repeatedBounce.update(gameContext, corridor);
repeatedBounce.update(gameContext, corridor);
repeatedBounce.update(gameContext, corridor);
assertEqual(
    [
        repeatedBounce.pos.y,
        Math.round(repeatedBounce.vel.x * 10) / 10,
        repeatedBounce.vel.y,
    ],
    [56, 2.7, -480],
    'Repeated floor contact continues reducing both velocity components',
);

const restingLevel = createCollisionLevel(4, 5);
restingLevel.gravity = 600;
const restingShell = createMovingShell(64, 56, 5, 10);
restingShell.update(gameContext, restingLevel);
assertEqual(
    [restingShell.pos.y, restingShell.vel.x, restingShell.vel.y],
    [56, 0, 0],
    'Shell settles on a floor under gravity',
);
const restingPosition = [restingShell.pos.x, restingShell.pos.y];
for (let update = 0; update < 120; update++) {
    restingShell.update(gameContext, restingLevel);
}
assertEqual(
    [restingShell.pos.x, restingShell.pos.y],
    restingPosition,
    'Settled shell remains positionally stable over subsequent updates',
);
assertEqual(
    [restingShell.vel.x, restingShell.vel.y],
    [0, 0],
    'Settled shell remains at exactly zero velocity',
);

console.log('Pickup-capable red shell physics and collision regression passed');
