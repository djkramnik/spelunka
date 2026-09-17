import AudioBoard from '../AudioBoard.js';
import Entity, {Sides} from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import type {CollisionTile} from '../TileCollider.js';
import Damageable from '../traits/Damageable.js';
import Health from '../traits/Health.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Player from '../traits/Player.js';
import PlayerHit from '../traits/PlayerHit.js';
import Stomper from '../traits/Stomper.js';
import Whip, {
    SPELUNKY_WHIP_ENEMY_KNOCKBACK_SPEED,
    SPELUNKY_WHIP_ENEMY_UPWARD_SPEED,
    SPELUNKY_WHIP_STARTUP_TIME,
} from '../traits/Whip.js';
import {
    CAVEMAN_CHARGE_SPEED,
    CAVEMAN_CONTACT_DAMAGE,
    CAVEMAN_CONTACT_INVULNERABILITY_DURATION,
    CAVEMAN_HIT_POINTS,
    CAVEMAN_PATROL_SPEED,
    CAVEMAN_STOMP_HORIZONTAL_SPEED,
    CAVEMAN_STOMP_UPWARD_SPEED,
    CAVEMAN_STUN_DURATION,
    CAVEMAN_WAKE_DURATION,
    CavemanBehavior,
    createCavemanFactory,
    noCavemanHitEffect,
} from './Caveman.js';
import {createMarioFactory} from './Mario.js';
import {createRockFactory, ROCK_ENEMY_UPWARD_SPEED} from './Rock.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

interface DrawCall {
    name: string;
    pivotX: number;
    pivotY: number;
    flip: boolean;
}

const drawCalls: DrawCall[] = [];
const sprite = {
    getAnimation: (name: string): ((time: number) => string) => {
        return (time: number): string => `${name}-${Math.floor(time * 10)}`;
    },
    drawFrame: (
        name: string,
        _context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip = false,
    ): void => {
        drawCalls.push({name, pivotX, pivotY, flip});
    },
} as unknown as SpriteSheet;

function context(deltaTime = 1 / 60): GameContext {
    return {deltaTime} as GameContext;
}

function floorLevel(startX = 0, endX = 20): Level {
    const level = new Level();
    level.gravity = 0;
    const floor = new Matrix<CollisionTile>();
    for (let x = startX; x <= endX; x++) {
        floor.set(x, 2, {type: 'ground'});
    }
    level.tileCollider.addGrid(floor);
    return level;
}

function createPlayer(): Entity {
    const player = new Entity();
    player.size.set(14, 16);
    player.addTrait(new Player());
    player.addTrait(new Health());
    player.addTrait(new Killable());
    player.addTrait(new PlayerHit());
    player.addTrait(new Stomper());
    return player;
}

const visual = createCavemanFactory(
    sprite,
    new AudioBoard(),
    {onHit: noCavemanHitEffect},
)();
const visualBehavior = visual.traits.get(CavemanBehavior);
assertEqual([visual.size.x, visual.size.y], [12, 16], 'Caveman collider size');
assertEqual([visual.offset.x, visual.offset.y], [2, 0], 'Classic horizontal inset');
assertEqual(
    [
        visual.traits.has(Damageable),
        visual.traits.get(Damageable).hitPoints,
        visual.traits.has(Physics),
        visual.traits.get(Killable).removeAfter,
    ],
    [true, CAVEMAN_HIT_POINTS, true, Infinity],
    'Caveman owns three-hit physics and a persistent corpse',
);

visual.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1), {
    name: 'sleeping',
    pivotX: 8,
    pivotY: 16,
    flip: false,
}, 'Caveman begins in the dedicated HD sleeping pose');

const wakeLevel = floorLevel();
const nearbyPlayer = createPlayer();
nearbyPlayer.pos.set(128, 16);
visual.pos.set(64, 16);
wakeLevel.entities.add(visual);
wakeLevel.entities.add(nearbyPlayer);
visualBehavior.update(visual, context(), wakeLevel);
assertEqual(
    [visualBehavior.state, visualBehavior.direction, visual.vel.x],
    ['waking', 1, 0],
    'Nearby player wakes and faces the sleeping caveman',
);
visual.draw({} as CanvasRenderingContext2D);
assertEqual(
    drawCalls.at(-1)?.name,
    'wake-0',
    'Wake state uses the adapted HD sleep-to-stand sequence',
);
visualBehavior.update(visual, context(CAVEMAN_WAKE_DURATION), wakeLevel);
assertEqual(visualBehavior.state, 'walking', 'Wake sequence completes into patrol');
visualBehavior.update(visual, context(), wakeLevel);
assertEqual(
    [visualBehavior.state, visual.vel.x],
    ['charging', CAVEMAN_CHARGE_SPEED],
    'A visible player inside the Classic sight distance starts pursuit',
);
visual.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1)?.name.startsWith('charge-'), true, 'Fast HD run cadence');

const patrolLevel = floorLevel(4, 4);
const patrol = createCavemanFactory(sprite, new AudioBoard(), {
    initialDirection: 1,
    onHit: noCavemanHitEffect,
})();
patrol.pos.set(66, 16);
const patrolBehavior = patrol.traits.get(CavemanBehavior);
patrolBehavior.state = 'walking';
patrol.traits.get(Physics).grounded = true;
patrolBehavior.update(patrol, context(), patrolLevel);
assertEqual(
    [patrolBehavior.direction, patrol.vel.x],
    [-1, -CAVEMAN_PATROL_SPEED],
    'Patrol reverses before walking off a ledge',
);
patrolBehavior.obstruct(patrol, Sides.LEFT);
assertEqual(patrolBehavior.direction, 1, 'Left wall turns patrol right');
patrolBehavior.state = 'charging';
patrolBehavior.direction = 1;
patrolBehavior.update(patrol, context(), floorLevel(0, 0));
assertEqual(
    patrol.vel.x,
    CAVEMAN_CHARGE_SPEED,
    'Classic pursuit commits forward instead of checking ledges',
);
patrolBehavior.obstruct(patrol, Sides.RIGHT);
assertEqual(patrolBehavior.direction, -1, 'Right wall reverses pursuit');

const contactCaveman = createCavemanFactory(sprite, new AudioBoard(), {
    onHit: noCavemanHitEffect,
})();
contactCaveman.traits.get(CavemanBehavior).state = 'walking';
const contactPlayer = createPlayer();
contactPlayer.pos.x = -14;
contactCaveman.collides(contactPlayer);
contactPlayer.finalize();
assertEqual(
    [
        contactPlayer.traits.get(Health).hearts,
        contactPlayer.traits.get(Health).invulnerabilityTime,
        contactPlayer.traits.get(PlayerHit).active,
        contactPlayer.vel.x,
        contactPlayer.vel.y,
    ],
    [
        4 - CAVEMAN_CONTACT_DAMAGE,
        CAVEMAN_CONTACT_INVULNERABILITY_DURATION,
        true,
        -180,
        -180,
    ],
    'Active caveman contact damages and launches the player once',
);
contactCaveman.collides(contactPlayer);
contactPlayer.finalize();
assertEqual(
    contactPlayer.traits.get(Health).hearts,
    3,
    'Player invulnerability rejects repeated overlap damage',
);

let hitEffects = 0;
const stompCaveman = createCavemanFactory(sprite, new AudioBoard(), {
    onHit: (): void => {
        hitEffects++;
    },
})();
stompCaveman.pos.set(64, 16);
stompCaveman.traits.get(CavemanBehavior).state = 'walking';
const stompPlayer = createPlayer();
stompPlayer.pos.set(64, 4);
stompPlayer.vel.y = 240;
new EntityCollider(new Set([stompPlayer, stompCaveman])).check();
stompPlayer.finalize();
stompCaveman.finalize();
stompCaveman.traits.get(CavemanBehavior).update(
    stompCaveman,
    context(),
    floorLevel(),
);
assertEqual(
    [
        stompCaveman.traits.get(Damageable).hitPoints,
        stompCaveman.traits.get(CavemanBehavior).state,
        stompCaveman.vel.x,
        stompCaveman.vel.y,
        hitEffects,
    ],
    [
        CAVEMAN_HIT_POINTS - 1,
        'stunned',
        CAVEMAN_STOMP_HORIZONTAL_SPEED,
        -CAVEMAN_STOMP_UPWARD_SPEED,
        1,
    ],
    'Stomp removes one HP and enters the Classic knockback stun',
);

stompCaveman.vel.set(0, 0);
stompCaveman.traits.get(Physics).grounded = true;
stompCaveman.traits.get(CavemanBehavior).update(
    stompCaveman,
    context(CAVEMAN_STUN_DURATION),
    floorLevel(),
);
assertEqual(
    [
        stompCaveman.traits.get(CavemanBehavior).state,
        stompCaveman.traits.get(Damageable).stunned,
    ],
    ['walking', false],
    'Living caveman recovers after the Classic 200-update stun',
);

const whipAudio = new AudioBoard();
const whippingPlayer = createMarioFactory(sprite, whipAudio)();
const whipCaveman = createCavemanFactory(sprite, new AudioBoard(), {
    onHit: noCavemanHitEffect,
})();
whippingPlayer.pos.set(0, 16);
whipCaveman.pos.set(14, 16);
whipCaveman.traits.get(CavemanBehavior).state = 'walking';
const whipLevel = floorLevel();
whipLevel.entities.add(whippingPlayer);
whipLevel.entities.add(whipCaveman);
const whip = whippingPlayer.traits.get(Whip);
whip.start(whippingPlayer);
whip.update(
    whippingPlayer,
    context(SPELUNKY_WHIP_STARTUP_TIME + 1 / 60),
    whipLevel,
);
whipCaveman.traits.get(CavemanBehavior).update(
    whipCaveman,
    context(),
    whipLevel,
);
assertEqual(
    [
        whipCaveman.traits.get(Damageable).hitPoints,
        whipCaveman.traits.get(CavemanBehavior).state,
        whipCaveman.vel.x,
        whipCaveman.vel.y,
    ],
    [
        CAVEMAN_HIT_POINTS - 1,
        'stunned',
        SPELUNKY_WHIP_ENEMY_KNOCKBACK_SPEED,
        -SPELUNKY_WHIP_ENEMY_UPWARD_SPEED,
    ],
    'Whip uses shared multi-hit damage instead of instantly deleting cavemen',
);

const rockCaveman = createCavemanFactory(sprite, new AudioBoard(), {
    onHit: noCavemanHitEffect,
})();
rockCaveman.traits.get(CavemanBehavior).state = 'walking';
const rock = createRockFactory(sprite)();
rock.vel.set(240, 0);
rock.collides(rockCaveman);
rockCaveman.traits.get(CavemanBehavior).update(
    rockCaveman,
    context(),
    floorLevel(),
);
assertEqual(
    [
        rockCaveman.traits.get(Damageable).hitPoints,
        rockCaveman.vel.x,
        rockCaveman.vel.y,
    ],
    [CAVEMAN_HIT_POINTS - 1, 240, -ROCK_ENEMY_UPWARD_SPEED],
    'Dangerous thrown rock transfers one hit and its horizontal motion',
);

const deadCaveman = createCavemanFactory(sprite, new AudioBoard(), {
    onHit: noCavemanHitEffect,
})();
const deadDamage = deadCaveman.traits.get(Damageable);
deadDamage.hit(CAVEMAN_HIT_POINTS, {velocityX: 60, velocityY: -90});
deadCaveman.traits.get(CavemanBehavior).update(
    deadCaveman,
    context(),
    floorLevel(),
);
deadCaveman.finalize();
assertEqual(
    [deadDamage.depleted, deadCaveman.traits.get(Killable).dead],
    [true, true],
    'Final accepted hit enters the shared Killable death path',
);
deadCaveman.vel.set(0, 0);
deadCaveman.traits.get(Physics).grounded = true;
deadCaveman.traits.get(CavemanBehavior).update(
    deadCaveman,
    context(),
    floorLevel(),
);
assertEqual(
    deadCaveman.traits.get(CavemanBehavior).state,
    'dead',
    'Depleted caveman settles into its persistent corpse state',
);
deadCaveman.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1)?.name, 'dead', 'Corpse uses the prone HD frame');

console.log('Classic caveman behavior with Spelunky HD presentation passed');
