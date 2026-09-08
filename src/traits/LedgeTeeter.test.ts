import Entity from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
import Carrier from './Carrier.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Killable from './Killable.js';
import LadderClimb from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import LedgeTeeter from './LedgeTeeter.js';
import Physics from './Physics.js';
import Pickable from './Pickable.js';
import PlayerDeath from './PlayerDeath.js';
import PlayerHit from './PlayerHit.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const context = {
    deltaTime: 1 / 60,
    performanceMetrics: {recordTileCandidates: (): void => {}},
} as unknown as GameContext;

function createLevel(tileType: 'ground' | 'platform' = 'ground'): Level {
    const level = new Level();
    const floor = new Matrix<CollisionTile>();
    floor.set(4, 4, {type: tileType});
    level.tileCollider.addGrid(floor);
    return level;
}

function createPlayer(x: number, direction: -1 | 1): {
    entity: Entity;
    physics: Physics;
    go: Go;
    carrier: Carrier;
    teeter: LedgeTeeter;
} {
    const entity = new Entity();
    entity.pos.set(x, 48);
    entity.size.set(14, 16);

    const physics = new Physics();
    physics.grounded = true;
    physics.groundSupportWidth = 10;
    const go = new Go();
    go.heading = direction;
    const carrier = new Carrier();
    const teeter = new LedgeTeeter();

    entity.addTrait(physics);
    entity.addTrait(new Crouch());
    entity.addTrait(go);
    entity.addTrait(new Killable());
    entity.addTrait(new LadderClimb());
    entity.addTrait(new LedgeHang());
    entity.addTrait(new PlayerDeath());
    entity.addTrait(new PlayerHit());
    entity.addTrait(teeter);
    entity.addTrait(carrier);
    return {entity, physics, go, carrier, teeter};
}

function createCarriedItem(): {entity: Entity; pickable: Pickable; physics: Physics} {
    const entity = new Entity();
    entity.size.set(8, 8);
    const pickable = new Pickable();
    pickable.carryOffset.set(4, 6);
    pickable.alignCarryCenters = true;
    pickable.carryBottomOffset = -2;
    const physics = new Physics();
    entity.addTrait(pickable);
    entity.addTrait(physics);
    return {entity, pickable, physics};
}

const level = createLevel();
const safe = createPlayer(75, 1);
safe.teeter.update(safe.entity, context, level);
assertEqual(safe.teeter.active, false, 'Ordinary supported idle remains outside the teeter state');

for (const direction of [-1, 1] as const) {
    const fixture = createPlayer(direction > 0 ? 76 : 54, direction);
    fixture.teeter.update(fixture.entity, context, level);
    assertEqual(
        [fixture.teeter.active, fixture.teeter.side],
        [true, direction],
        `${direction < 0 ? 'Left' : 'Right'} final ledge margin enters teeter`,
    );

    fixture.go.dir = direction;
    fixture.teeter.update(fixture.entity, context, level);
    assertEqual(
        fixture.teeter.active,
        false,
        'Held movement input exits teeter',
    );
}

const platform = createPlayer(76, 1);
platform.teeter.update(platform.entity, context, createLevel('platform'));
assertEqual(platform.teeter.active, true, 'One-way platform edges can enter teeter');

for (const direction of [-1, 1] as const) {
    const fixture = createPlayer(direction > 0 ? 76 : 54, direction);
    const item = createCarriedItem();
    fixture.carrier.update(fixture.entity, context, level);
    fixture.carrier.collides(fixture.entity, item.entity);
    fixture.carrier.pickup(fixture.entity);

    fixture.teeter.update(fixture.entity, context, level);

    assertEqual(fixture.teeter.active, true, 'Carrying does not block teeter');
    assertEqual(fixture.carrier.carried, null, 'Teeter automatically clears the carried item');
    assertEqual(item.pickable.carrier, null, 'Teeter releases pickable ownership');
    assertEqual(item.physics.enabled, true, 'Teeter restores dropped-item physics');
    assertEqual(
        [item.entity.vel.x, item.entity.vel.y],
        [0, 0],
        'Automatic teeter release is a drop rather than a throw',
    );
    assertEqual(
        direction > 0
            ? item.entity.bounds.left > 80
            : item.entity.bounds.right < 64,
        true,
        `${direction < 0 ? 'Left' : 'Right'} teeter drops the item forward beyond the ledge`,
    );
    assertEqual(
        fixture.entity.sounds.has('throw-item'),
        false,
        'Automatic teeter drop does not play the throw sound',
    );
}

console.log('Ledge-edge teeter and forward item drop passed');
