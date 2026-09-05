import AudioBoard from '../AudioBoard.js';
import Entity, {Sides} from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import type {CollisionTile} from '../TileCollider.js';
import AttackAnimation from '../traits/AttackAnimation.js';
import Health from '../traits/Health.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import PlayerDeath from '../traits/PlayerDeath.js';
import PlayerHit from '../traits/PlayerHit.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';
import {
    createSnakeFactory,
    SNAKE_ATTACK_DURATION,
    SNAKE_ATTACK_IMPACT_TIME,
    SNAKE_CONTACT_DAMAGE,
    SNAKE_DEATH_KNOCKBACK_SPEED,
    SNAKE_DEATH_UPWARD_SPEED,
    SNAKE_INITIAL_DIRECTION,
    SNAKE_INVULNERABILITY_DURATION,
    SNAKE_KNOCKBACK_SPEED,
    SNAKE_WALK_SPEED,
    SnakeBehavior,
} from './Snake.js';
import {createMarioFactory} from './Mario.js';

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
        flip: boolean,
    ): void => {
        drawCalls.push({name, pivotX, pivotY, flip});
    },
} as unknown as SpriteSheet;

const gameContext = {
    deltaTime: 1 / 60,
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

const visualSnake = createSnakeFactory(sprite)();
const visualBehavior = visualSnake.traits.get(SnakeBehavior);

assertEqual([visualSnake.size.x, visualSnake.size.y], [12, 16], 'Snake collider size');
assertEqual([visualSnake.offset.x, visualSnake.offset.y], [2, 0], 'Snake collider inset');
assertEqual(visualSnake.traits.has(Physics), true, 'Snake physics');
assertEqual(visualSnake.traits.has(Solid), true, 'Snake terrain collision');
assertEqual(visualSnake.traits.get(Killable).removeAfter, 0, 'Snake prompt cleanup');
assertEqual(
    [
        visualBehavior.walkSpeed,
        visualBehavior.direction,
        visualBehavior.knockbackSpeed,
        visualBehavior.deathKnockbackSpeed,
        visualBehavior.deathUpwardSpeed,
    ],
    [
        SNAKE_WALK_SPEED,
        SNAKE_INITIAL_DIRECTION,
        SNAKE_KNOCKBACK_SPEED,
        SNAKE_DEATH_KNOCKBACK_SPEED,
        SNAKE_DEATH_UPWARD_SPEED,
    ],
    'Snake named movement tunables',
);

visualSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1), {
    name: 'walk-0',
    pivotX: 8,
    pivotY: 16,
    flip: false,
}, 'Walking snake HD animation, pivot, and facing');

visualBehavior.animationTime = 0.2;
visualSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1)?.name, 'walk-2', 'Living snake continuously walks');

visualBehavior.direction = -1;
visualSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1)?.flip, true, 'Left movement mirrors the HD source');

const movementLevel = new Level();
movementLevel.gravity = 0;
const floor = new Matrix<CollisionTile>();
floor.set(4, 1, {type: 'ground'});
movementLevel.tileCollider.addGrid(floor);

const patrolSnake = createSnakeFactory(sprite, {
    initialDirection: 1,
})();
patrolSnake.pos.set(64, 0);
patrolSnake.traits.get(Physics).grounded = true;
patrolSnake.traits.get(SnakeBehavior).update(
    patrolSnake,
    gameContext,
    movementLevel,
);
assertEqual(patrolSnake.vel.x, SNAKE_WALK_SPEED, 'Snake patrol speed');

patrolSnake.pos.x = 66;
patrolSnake.traits.get(SnakeBehavior).update(
    patrolSnake,
    gameContext,
    movementLevel,
);
assertEqual(
    [patrolSnake.traits.get(SnakeBehavior).direction, patrolSnake.vel.x],
    [-1, -SNAKE_WALK_SPEED],
    'Snake turns before the right end of its ledge',
);

patrolSnake.pos.x = 62;
patrolSnake.traits.get(SnakeBehavior).update(
    patrolSnake,
    gameContext,
    movementLevel,
);
assertEqual(
    [patrolSnake.traits.get(SnakeBehavior).direction, patrolSnake.vel.x],
    [1, SNAKE_WALK_SPEED],
    'Snake turns before the left end of its ledge',
);

patrolSnake.traits.get(SnakeBehavior).obstruct(patrolSnake, Sides.LEFT);
assertEqual(patrolSnake.traits.get(SnakeBehavior).direction, 1, 'Left wall turn');
patrolSnake.traits.get(SnakeBehavior).obstruct(patrolSnake, Sides.RIGHT);
assertEqual(patrolSnake.traits.get(SnakeBehavior).direction, -1, 'Right wall turn');

let deathEffects = 0;
const lethalSnake = createSnakeFactory(sprite, {
    onDeath: (): void => {
        deathEffects++;
    },
})();
lethalSnake.pos.set(64, 200);

const mario = new Entity();
mario.size.set(14, 16);
mario.pos.set(64, 192);
mario.vel.y = 300;
mario.addTrait(new Killable());
const stomper = new Stomper();
mario.addTrait(stomper);

new EntityCollider(new Set([mario, lethalSnake])).check();
mario.finalize();
lethalSnake.finalize();
assertEqual(lethalSnake.traits.get(Killable).dead, true, 'Descending stomp kills snake');
assertEqual(mario.traits.get(Killable).dead, false, 'Stomp takes precedence over contact damage');
assertEqual(
    mario.vel.y,
    -stomper.reboundSpeedFor(300),
    'Stomp bounces Mario through the named rebound rule',
);

const callsBeforeDeadDraw = drawCalls.length;
lethalSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.length, callsBeforeDeadDraw, 'Dead snake has no corpse frame');

const deathLevel = new Level();
deathLevel.gravity = 0;
deathLevel.entities.add(lethalSnake);
lethalSnake.update(gameContext, deathLevel);
lethalSnake.finalize();
assertEqual(deathEffects, 1, 'Future splatter hook runs once');
assertEqual(deathLevel.entities.has(lethalSnake), false, 'Dead snake is removed promptly');
lethalSnake.update(gameContext, deathLevel);
lethalSnake.finalize();
assertEqual(deathEffects, 1, 'Future splatter hook remains exactly once');

const contactSnake = createSnakeFactory(sprite)();
const contactMario = createMarioFactory(sprite, new AudioBoard())();
contactMario.pos.x = -16;
const contactHealth = contactMario.traits.get(Health);
contactMario.vel.y = 0;
contactSnake.vel.y = 0;
contactSnake.collides(contactMario);
contactMario.finalize();
contactSnake.finalize();
assertEqual(
    [
        contactHealth.hearts,
        contactMario.vel.x,
        contactHealth.invulnerabilityTime,
        contactMario.traits.get(Killable).dead,
    ],
    [4, 0, 0, false],
    'Initial snake contact begins its wind-up without applying damage',
);
assertEqual(contactSnake.traits.get(Killable).dead, false, 'Snake survives non-stomp contact');
assertEqual(
    [
        contactMario.traits.get(PlayerHit).active,
        contactSnake.traits.get(AttackAnimation).active,
        contactSnake.traits.get(SnakeBehavior).direction,
    ],
    [false, true, -1],
    'Wind-up faces the target without starting the player reaction early',
);
contactMario.draw({globalAlpha: 1} as CanvasRenderingContext2D);
assertEqual(
    drawCalls.at(-1)?.name,
    'idle',
    'Player remains in their ordinary pose during the snake wind-up',
);
contactSnake.draw({} as CanvasRenderingContext2D);
assertEqual(
    drawCalls.at(-1)?.name,
    'attack-0',
    'Accepted damage starts the snake bite animation',
);
contactSnake.vel.x = SNAKE_WALK_SPEED;
contactSnake.traits.get(SnakeBehavior).update(
    contactSnake,
    gameContext,
    new Level(),
);
assertEqual(contactSnake.vel.x, 0, 'Snake pauses patrol during its bite animation');
assertEqual(
    contactMario.sounds.has('snakebite'),
    false,
    'The bite sound does not play before the attack reaches impact',
);

const attackAnimation = contactSnake.traits.get(AttackAnimation);
attackAnimation.update(
    contactSnake,
    {deltaTime: 0.1} as GameContext,
    new Level(),
);
contactSnake.traits.get(SnakeBehavior).update(
    contactSnake,
    {deltaTime: 0.1} as GameContext,
    new Level(),
);
contactSnake.collides(contactMario);
contactMario.finalize();
assertEqual(
    [
        contactHealth.hearts,
        contactMario.vel.x,
        contactMario.sounds.size,
        attackAnimation.time,
    ],
    [4, 0, 0, 0.1],
    'Repeated wind-up overlap cannot restart the pending attack',
);
attackAnimation.update(
    contactSnake,
    {deltaTime: SNAKE_ATTACK_IMPACT_TIME - 0.1} as GameContext,
    new Level(),
);
contactSnake.traits.get(SnakeBehavior).update(
    contactSnake,
    {deltaTime: SNAKE_ATTACK_IMPACT_TIME - 0.1} as GameContext,
    new Level(),
);
assertEqual(
    [
        contactHealth.hearts,
        contactMario.vel.x,
        contactHealth.invulnerabilityTime,
        contactMario.traits.get(PlayerHit).active,
        contactMario.traits.get(PlayerHit).direction,
        contactMario.sounds.has('snakebite'),
    ],
    [
        4 - SNAKE_CONTACT_DAMAGE,
        -SNAKE_KNOCKBACK_SPEED,
        SNAKE_INVULNERABILITY_DURATION,
        true,
        -1,
        true,
    ],
    'Attack impact applies damage, small recoil, protection, and sound together',
);
contactMario.draw({globalAlpha: 1} as CanvasRenderingContext2D);
assertEqual(
    [drawCalls.at(-1)?.name, drawCalls.at(-1)?.flip],
    ['reaction-hit-0', false],
    'Leftward small knockback uses the upright arms-back HD frame',
);

contactMario.sounds.clear();
const impactAnimationTime = attackAnimation.time;
contactSnake.collides(contactMario);
contactMario.finalize();
assertEqual(
    [
        contactHealth.hearts,
        contactMario.vel.x,
        contactMario.sounds.size,
        attackAnimation.time,
    ],
    [3, -SNAKE_KNOCKBACK_SPEED, 0, impactAnimationTime],
    'Protected overlap cannot retrigger damage, recoil, sound, or attack timing',
);
attackAnimation.update(
    contactSnake,
    {deltaTime: SNAKE_ATTACK_DURATION - SNAKE_ATTACK_IMPACT_TIME} as GameContext,
    new Level(),
);
contactSnake.traits.get(SnakeBehavior).update(
    contactSnake,
    {deltaTime: SNAKE_ATTACK_DURATION - SNAKE_ATTACK_IMPACT_TIME} as GameContext,
    new Level(),
);
contactSnake.draw({} as CanvasRenderingContext2D);
assertEqual(
    drawCalls.at(-1)?.name.startsWith('walk-'),
    true,
    'Snake returns to walking after one complete bite and recovery',
);

const gentleSnake = createSnakeFactory(sprite, {knockbackSpeed: 24})();
const gentleTarget = new Entity();
gentleTarget.size.set(14, 16);
gentleTarget.pos.x = -16;
gentleTarget.addTrait(new Killable());
gentleTarget.addTrait(new Stomper());
gentleTarget.addTrait(new Health());
gentleSnake.collides(gentleTarget);
gentleSnake.traits.get(AttackAnimation).update(
    gentleSnake,
    {deltaTime: SNAKE_ATTACK_IMPACT_TIME} as GameContext,
    new Level(),
);
gentleSnake.traits.get(SnakeBehavior).update(
    gentleSnake,
    {deltaTime: SNAKE_ATTACK_IMPACT_TIME} as GameContext,
    new Level(),
);
assertEqual(
    gentleTarget.vel.x,
    -24,
    'Knockback magnitude belongs to the individual enemy behavior',
);

const rightContactMario = createMarioFactory(sprite, new AudioBoard())();
rightContactMario.pos.x = 16;
const lastHeart = rightContactMario.traits.get(Health);
lastHeart.damage(3);
contactSnake.collides(rightContactMario);
rightContactMario.finalize();
assertEqual(
    [lastHeart.hearts, rightContactMario.traits.get(Killable).dead],
    [1, false],
    'Lethal contact also waits for the snake attack impact',
);
contactSnake.traits.get(AttackAnimation).update(
    contactSnake,
    {deltaTime: SNAKE_ATTACK_IMPACT_TIME} as GameContext,
    new Level(),
);
contactSnake.traits.get(SnakeBehavior).update(
    contactSnake,
    {deltaTime: SNAKE_ATTACK_IMPACT_TIME} as GameContext,
    new Level(),
);
rightContactMario.finalize();
assertEqual(
    [
        lastHeart.hearts,
        rightContactMario.vel.x,
        rightContactMario.vel.y,
        rightContactMario.traits.get(Killable).dead,
        rightContactMario.traits.get(PlayerDeath).phase,
        rightContactMario.entityCollisionsEnabled,
    ],
    [
        0,
        SNAKE_DEATH_KNOCKBACK_SPEED,
        -SNAKE_DEATH_UPWARD_SPEED,
        true,
        'airborne',
        false,
    ],
    'Snake contact on the last heart launches the terminal player body',
);
assertEqual(
    rightContactMario.traits.get(PlayerHit).active,
    false,
    'A lethal hit goes directly to terminal death without a small reaction',
);
rightContactMario.sounds.clear();
const playerDeathLevel = new Level();
playerDeathLevel.entities.add(rightContactMario);
rightContactMario.update(gameContext, playerDeathLevel);
rightContactMario.finalize();
assertEqual(
    playerDeathLevel.entities.has(rightContactMario),
    true,
    'A player with no hearts remains in the level as a physical body',
);

const externallyKilledSnake = createSnakeFactory(sprite, {
    onDeath: (): void => {
        deathEffects++;
    },
})();
externallyKilledSnake.traits.get(Killable).kill();
externallyKilledSnake.finalize();
externallyKilledSnake.update(gameContext, deathLevel);
assertEqual(deathEffects, 2, 'Projectile-compatible Killable death uses shared hook');

console.log('Snake entity behavior, animation, collision, and lifecycle passed');
