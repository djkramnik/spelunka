import Entity from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
import Carrier from './Carrier.js';
import Go from './Go.js';
import LedgeHang from './LedgeHang.js';
import Pickable from './Pickable.js';
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

const gameContext = {} as GameContext;
const level = {} as Level;
const physicsContext = {
    deltaTime: 1 / 60,
    performanceMetrics: {recordTileCandidates: (): void => {}},
} as unknown as GameContext;

function createCarrier(movement?: Go): [Entity, Carrier] {
    const entity = new Entity();
    const carrier = new Carrier();
    if (movement) {
        entity.addTrait(movement);
    }
    entity.addTrait(carrier);
    return [entity, carrier];
}

function createPickable(): [Entity, Pickable] {
    const entity = new Entity();
    entity.size.set(16, 16);
    const pickable = new Pickable();
    entity.addTrait(pickable);
    return [entity, pickable];
}

function createPhysicalPickable(): [Entity, Pickable, Physics] {
    const [entity, pickable] = createPickable();
    const physics = new Physics();
    entity.addTrait(physics);
    return [entity, pickable, physics];
}

const movement = new Go();
const [mario, carrier] = createCarrier(movement);
const [shell, pickable] = createPickable();
mario.pos.set(40, 80);
mario.zIndex = 3;
shell.pos.set(44, 80);
shell.vel.set(90, -120);
shell.zIndex = 2;

assertEqual(carrier.pickup(mario), null, 'Pickup without collision eligibility');

carrier.update(mario, gameContext, level);
carrier.collides(mario, shell);
assertEqual([shell.pos.x, shell.pos.y], [44, 80], 'Collision-only shell position');
assertEqual([shell.vel.x, shell.vel.y], [90, -120], 'Collision-only shell velocity');
assertEqual(pickable.carrier, null, 'Collision-only carrier state');

assertEqual(carrier.pickup(mario) === shell, true, 'Eligible shell pickup');
assertEqual(carrier.carried === shell, true, 'Carrier owns picked-up shell');
assertEqual(pickable.carrier === mario, true, 'Pickable records its carrier');
assertEqual([shell.pos.x, shell.pos.y], [48, 72], 'Immediate carry position');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Pickup neutralizes velocity');
assertEqual(shell.zIndex, 4, 'Carried shell z-index');

const [otherShell, otherPickable] = createPickable();
otherShell.pos.set(40, 80);
carrier.collides(mario, otherShell);
assertEqual(carrier.pickup(mario) === shell, true, 'Repeated pickup retains shell');
assertEqual(otherPickable.carrier, null, 'Carrier cannot pick up a second item');

mario.pos.set(120, 160);
mario.zIndex = 9;
movement.heading = -1;
shell.pos.set(-500, -500);
shell.vel.set(300, 400);
carrier.update(mario, gameContext, level);
assertEqual([shell.pos.x, shell.pos.y], [112, 152], 'Left-facing position tracking');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Carrier-side velocity neutralization');
assertEqual(shell.zIndex, 10, 'Carrier-side z-index tracking');

shell.pos.set(-200, -200);
shell.vel.set(-300, -400);
pickable.finalize(shell);
assertEqual([shell.pos.x, shell.pos.y], [112, 152], 'Final left-facing carry position');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Final carry velocity neutralization');

movement.heading = 1;
carrier.update(mario, gameContext, level);
assertEqual([shell.pos.x, shell.pos.y], [128, 152], 'Return to right-facing position');

const ledgeHang = new LedgeHang();
mario.addTrait(ledgeHang);
ledgeHang.phase = 'hanging';
ledgeHang.side = -1;
movement.dir = 1;
carrier.update(mario, gameContext, level);
assertEqual(
    [shell.pos.x, shell.pos.y],
    [112, 152],
    'Right input cannot turn a carried item away from a left ledge',
);
movement.dir = -1;
carrier.update(mario, gameContext, level);
assertEqual(
    [shell.pos.x, shell.pos.y],
    [112, 152],
    'Left input leaves the item oriented toward the same left ledge',
);
ledgeHang.side = 1;
movement.dir = -1;
carrier.update(mario, gameContext, level);
assertEqual(
    [shell.pos.x, shell.pos.y],
    [128, 152],
    'Left input cannot turn a carried item away from a right ledge',
);
ledgeHang.phase = 'airborne';
ledgeHang.side = 0;
movement.dir = 0;

mario.vel.set(35, 0);
const releasePosition = [shell.pos.x, shell.pos.y];
assertEqual(carrier.throw(mario) === shell, true, 'Right-facing throw releases shell');
assertEqual(carrier.carried, null, 'Throw clears carrier ownership');
assertEqual(pickable.carrier, null, 'Throw clears pickable ownership');
assertEqual(
    [shell.vel.x, shell.vel.y],
    [35 + pickable.throwVelocity.x, pickable.throwVelocity.y],
    'Right-facing throw velocity inherits carrier momentum',
);
assertEqual(shell.zIndex, 2, 'Throw restores uncarried z-index');

mario.pos.set(200, 200);
carrier.update(mario, gameContext, level);
pickable.finalize(shell);
assertEqual(
    [shell.pos.x, shell.pos.y],
    releasePosition,
    'Released shell no longer follows carrier',
);

const leftMovement = new Go();
leftMovement.heading = -1;
const [leftMario, leftCarrier] = createCarrier(leftMovement);
const [leftShell, leftPickable] = createPickable();
leftMario.vel.x = -25;
leftCarrier.update(leftMario, gameContext, level);
leftCarrier.collides(leftMario, leftShell);
assertEqual(
    leftCarrier.pickupOrThrow(leftMario) === leftShell,
    true,
    'Pickup-or-throw picks up while empty',
);
assertEqual(
    leftCarrier.pickupOrThrow(leftMario) === leftShell,
    true,
    'Pickup-or-throw releases while carrying',
);
assertEqual(
    [leftShell.vel.x, leftShell.vel.y],
    [-25 - leftPickable.throwVelocity.x, leftPickable.throwVelocity.y],
    'Left-facing throw velocity inherits carrier momentum',
);
assertEqual(leftCarrier.carried, null, 'Left throw clears carrier ownership');
assertEqual(leftPickable.carrier, null, 'Left throw clears pickable ownership');
assertEqual(leftCarrier.throw(leftMario), null, 'Throw while empty has no effect');

const [defaultCarrierEntity, defaultCarrier] = createCarrier();
const [defaultShell] = createPickable();
defaultCarrierEntity.pos.set(20, 30);
defaultCarrier.update(defaultCarrierEntity, gameContext, level);
defaultCarrier.collides(defaultCarrierEntity, defaultShell);
defaultCarrier.pickup(defaultCarrierEntity);
assertEqual(
    [defaultShell.pos.x, defaultShell.pos.y],
    [28, 22],
    'Carrier without movement defaults to right-facing offset',
);

const upwardMovement = new Go();
upwardMovement.heading = 1;
const [upwardMario, upwardCarrier] = createCarrier(upwardMovement);
const [upwardShell, upwardPickable] = createPickable();
upwardPickable.upwardThrowVelocity.set(360, -540);
upwardMario.vel.x = 25;
upwardCarrier.collides(upwardMario, upwardShell);
upwardCarrier.pickup(upwardMario);
upwardCarrier.throw(upwardMario, 'upward');
assertEqual(
    [upwardShell.vel.x, upwardShell.vel.y],
    [385, -540],
    'Upward mode selects the item-specific launch while inheriting momentum',
);

const [separateMario, separateCarrier] = createCarrier();
const [separatedShell] = createPickable();
separateCarrier.update(separateMario, gameContext, level);
separateCarrier.collides(separateMario, separatedShell);
separateCarrier.update(separateMario, gameContext, level);
assertEqual(
    separateCarrier.pickup(separateMario),
    null,
    'Leaving collision expires pickup eligibility',
);

const placeMovement = new Go();
placeMovement.heading = 1;
const [placeMario, placeCarrier] = createCarrier(placeMovement);
placeMario.pos.set(100, 50);
placeMario.size.set(14, 16);
const [placedRight, placedRightPickable, placedRightPhysics] = createPhysicalPickable();
placedRight.size.set(8, 8);
placedRightPickable.alignCarryCenters = true;
placedRightPickable.carryOffset.set(4, 6);
placedRight.zIndex = 2;
placeCarrier.collides(placeMario, placedRight);
placeCarrier.pickup(placeMario);
assertEqual(placeCarrier.place(placeMario), placedRight, 'Right placement releases the item');
assertEqual(
    [
        placedRight.bounds.left,
        placedRight.bounds.bottom,
        placedRight.vel.x,
        placedRight.vel.y,
        placedRightPhysics.enabled,
        placedRightPhysics.grounded,
        placedRight.zIndex,
    ],
    [107, 66, 0, 0, true, true, 2],
    'Right placement lowers the carried pose directly in front at floor height',
);
assertEqual(
    placedRightPickable.isThrowerProtected(placedRight, placeMario),
    false,
    'Placement does not create thrower protection',
);

placeMovement.heading = -1;
const [placedLeft, placedLeftPickable, placedLeftPhysics] = createPhysicalPickable();
placedLeft.size.set(8, 8);
placedLeftPickable.alignCarryCenters = true;
placedLeftPickable.carryOffset.set(4, 6);
placeCarrier.collides(placeMario, placedLeft);
placeCarrier.pickup(placeMario);
assertEqual(placeCarrier.place(placeMario), placedLeft, 'Left placement releases the item');
assertEqual(
    [placedLeft.bounds.right, placedLeft.bounds.bottom, placedLeftPhysics.grounded],
    [107, 66, true],
    'Left placement mirrors the carried pose directly in front at floor height',
);

function createWallSafeItem(): [Entity, Pickable] {
    const [entity, itemPickable] = createPhysicalPickable();
    entity.size.set(8, 8);
    itemPickable.alignCarryCenters = true;
    itemPickable.carryOffset.set(4, 6);
    itemPickable.carryBottomOffset = -2;
    itemPickable.throwVelocity.set(240, -90);
    entity.addTrait(new Solid());
    return [entity, itemPickable];
}

function createWallLevel(tileX: number): Level {
    const wallLevel = new Level();
    wallLevel.gravity = 0;
    const wall = new Matrix<CollisionTile>();
    wall.set(tileX, 3, {type: 'ground'});
    wallLevel.tileCollider.addGrid(wall);
    return wallLevel;
}

for (const direction of [-1, 1] as const) {
    const wallMovement = new Go();
    wallMovement.heading = direction;
    const [wallPlayer, wallCarrier] = createCarrier(wallMovement);
    wallPlayer.size.set(14, 16);
    wallPlayer.pos.set(direction > 0 ? 98 : 112, 48);
    const wallLevel = createWallLevel(direction > 0 ? 7 : 6);
    const [wallItem] = createWallSafeItem();
    wallCarrier.update(wallPlayer, physicsContext, wallLevel);
    wallCarrier.collides(wallPlayer, wallItem);
    wallCarrier.pickup(wallPlayer);
    wallCarrier.throw(wallPlayer);
    assertEqual(
        wallItem.pos.x,
        direction > 0 ? 97 : 119,
        `${direction < 0 ? 'Left' : 'Right'} wall overlap moves the throw one rock width toward the player`,
    );
    wallItem.update(physicsContext, wallLevel);
    assertEqual(
        wallItem.vel.x,
        direction * 240,
        `${direction < 0 ? 'Left' : 'Right'} corrected throw does not rebound on its first update`,
    );

    const [wallPlacementItem] = createWallSafeItem();
    wallCarrier.collides(wallPlayer, wallPlacementItem);
    wallCarrier.pickup(wallPlayer);
    wallCarrier.place(wallPlayer);
    assertEqual(
        [wallPlacementItem.pos.x, wallPlacementItem.bounds.bottom],
        [direction > 0 ? 97 : 119, wallPlayer.bounds.bottom],
        `${direction < 0 ? 'Left' : 'Right'} wall placement moves one rock width back toward the player`,
    );
}

for (const direction of [-1, 1] as const) {
    const ledgeWallMovement = new Go();
    ledgeWallMovement.heading = direction;
    const [ledgeWallPlayer, ledgeWallCarrier] = createCarrier(
        ledgeWallMovement,
    );
    const ledgeWall = new LedgeHang();
    ledgeWall.phase = 'hanging';
    ledgeWall.side = direction;
    ledgeWallPlayer.addTrait(ledgeWall);
    ledgeWallPlayer.size.set(14, 16);
    ledgeWallPlayer.pos.set(direction > 0 ? 98 : 112, 48);
    const ledgeWallLevel = createWallLevel(direction > 0 ? 7 : 6);
    const [ledgeWallItem] = createWallSafeItem();
    ledgeWallCarrier.update(ledgeWallPlayer, physicsContext, ledgeWallLevel);
    ledgeWallCarrier.collides(ledgeWallPlayer, ledgeWallItem);
    ledgeWallCarrier.pickup(ledgeWallPlayer);
    ledgeWallCarrier.update(ledgeWallPlayer, physicsContext, ledgeWallLevel);
    ledgeWallCarrier.drop(ledgeWallPlayer);
    assertEqual(
        [ledgeWallItem.pos.x, ledgeWallItem.vel.x, ledgeWallItem.vel.y],
        [direction > 0 ? 97 : 119, 0, 0],
        `${direction < 0 ? 'Left' : 'Right'} ledge drop moves the rock clear without throw velocity`,
    );
}

console.log('Pickup and carrying regression passed');
