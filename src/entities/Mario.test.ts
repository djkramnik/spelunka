import AudioBoard from '../AudioBoard.js';
import {createAnim} from '../anim.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import Carrier from '../traits/Carrier.js';
import Crouch from '../traits/Crouch.js';
import Go from '../traits/Go.js';
import Health, {SPELUNKY_STARTING_HEARTS} from '../traits/Health.js';
import Jump from '../traits/Jump.js';
import Killable from '../traits/Killable.js';
import LadderClimb from '../traits/LadderClimb.js';
import LedgeHang from '../traits/LedgeHang.js';
import LedgeTeeter from '../traits/LedgeTeeter.js';
import LookUp, {
    SPELUNKY_LOOK_UP_ENTER_TIME,
} from '../traits/LookUp.js';
import PlayerDeath from '../traits/PlayerDeath.js';
import PlayerHit, {
    SPELUNKY_SMALL_HIT_REACTION_DURATION,
} from '../traits/PlayerHit.js';
import Pickable from '../traits/Pickable.js';
import Physics from '../traits/Physics.js';
import {
    createMarioFactory,
    PLAYER_FRAME_NAMES,
    PLAYER_INVULNERABILITY_MINIMUM_OPACITY,
} from './Mario.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const draws: Array<{
    name: string;
    pivotX: number;
    pivotY: number;
    flip: boolean;
}> = [];
const drawOpacities: number[] = [];
const sprite = {
    getAnimation: (name: string) => {
        const frameCounts: Readonly<Record<string, number>> = {
            walk: 8,
            run: 8,
            skid: 8,
            teeter: 8,
            jump: 4,
            fall: 4,
            'look-up-enter': 4,
            'look-up-exit': 4,
            'crouch-enter': 3,
            'crouch-exit': 3,
            crawl: 7,
            'ledge-flip': 7,
            'ledge-hang': 4,
            'ledge-climb': 7,
            'ladder-climb': 6,
            'carry-run': 8,
            throw: 5,
            'reaction-hit': 2,
        };
        const frameCount = frameCounts[name];
        if (frameCount === undefined) {
            throw new Error(`Unexpected animation: ${name}`);
        }
        const timed = [
            'skid',
            'teeter',
            'jump',
            'fall',
            'look-up-enter',
            'look-up-exit',
            'crouch-enter',
            'crouch-exit',
            'crawl',
            'ledge-flip',
            'ledge-hang',
            'ledge-climb',
            'ladder-climb',
            'throw',
            'reaction-hit',
        ].includes(name);
        return createAnim(
            Array.from(
                {length: frameCount},
                (_, index) => `${name}-${index + 1}`,
            ),
            name === 'look-up-enter'
                ? 2 / 60
                : name === 'look-up-exit' || name === 'reaction-hit'
                    ? 4 / 60
                    : timed ? 0.05 : 3,
            ![
                'jump',
                'fall',
                'look-up-enter',
                'look-up-exit',
                'crouch-enter',
                'crouch-exit',
                'ledge-flip',
                'ledge-hang',
                'ledge-climb',
                'throw',
                'reaction-hit',
            ].includes(name),
        );
    },
    drawFrame: (
        name: string,
        context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip: boolean,
    ): void => {
        draws.push({name, pivotX, pivotY, flip});
        drawOpacities.push(context.globalAlpha);
    },
} as unknown as SpriteSheet;
const mario = createMarioFactory(sprite, new AudioBoard())();
const jump = mario.traits.get(Jump);
const go = mario.traits.get(Go);
const health = mario.traits.get(Health);
const carrier = mario.traits.get(Carrier);
const killable = mario.traits.get(Killable);
const ledgeHang = mario.traits.get(LedgeHang);
const ledgeTeeter = mario.traits.get(LedgeTeeter);
const ladderClimb = mario.traits.get(LadderClimb);
const crouch = mario.traits.get(Crouch);
const playerDeath = mario.traits.get(PlayerDeath);
const playerHit = mario.traits.get(PlayerHit);
const lookUp = mario.traits.get(LookUp);
const physics = mario.traits.get(Physics);
const animationClock = mario as typeof mario & {
    animationState: string;
    animationStateTime: number;
};
const drawContext = {globalAlpha: 1} as CanvasRenderingContext2D;
const draw = (): string => {
    mario.draw(drawContext);
    const frame = draws.at(-1)?.name;
    if (!frame) {
        throw new Error('Mario did not draw a frame');
    }
    return frame;
};

assertEqual(
    health.hearts,
    SPELUNKY_STARTING_HEARTS,
    'New Spelunky player owns the default heart count',
);

assertEqual(draw(), 'idle', 'Idle frame');
physics.grounded = true;
lookUp.setUp(true);
lookUp.update(
    mario,
    {deltaTime: 1 / 60} as GameContext,
    new Level(),
);
assertEqual(draw(), 'look-up-enter-1', 'Grounded Up starts the HD look-up entry');
animationClock.animationState = 'look-up-enter';
animationClock.animationStateTime = SPELUNKY_LOOK_UP_ENTER_TIME;
assertEqual(draw(), 'look-up-enter-4', 'Look-up entry holds its terminal source frame');
lookUp.update(
    mario,
    {deltaTime: SPELUNKY_LOOK_UP_ENTER_TIME} as GameContext,
    new Level(),
);
assertEqual(draw(), 'look-up', 'Held grounded Up uses the dedicated HD look pose');
lookUp.setUp(false);
lookUp.update(
    mario,
    {deltaTime: 1 / 60} as GameContext,
    new Level(),
);
assertEqual(draw(), 'look-up-exit-1', 'Up release starts the HD look-up exit');
lookUp.update(
    mario,
    {deltaTime: 1} as GameContext,
    new Level(),
);
assertEqual(draw(), 'idle', 'Idle pose returns after look-up exit');
go.distance = 7;
assertEqual(draw(), 'walk-3', 'Walk animation uses the dense source sequence');
mario.turbo(true);
assertEqual(draw(), 'run-3', 'Turbo run animation uses the dense source sequence');
mario.turbo(false);
go.dir = -1;
mario.vel.x = 10;
assertEqual(draw(), 'skid-1', 'Skid animation starts at its first source frame');
go.dir = 0;
go.distance = 0;
mario.vel.x = 0;
ledgeTeeter.active = true;
ledgeTeeter.side = 1;
assertEqual(draw(), 'teeter-1', 'Paused ledge margin starts the HD Lost Balance strip');
assertEqual(draws.at(-1)?.flip, false, 'Right-edge teeter faces out over the ledge');
ledgeTeeter.side = -1;
draw();
assertEqual(draws.at(-1)?.flip, true, 'Left-edge teeter mirrors toward the open edge');
ledgeTeeter.active = false;
ledgeTeeter.side = 0;

jump.ready = -1;
mario.vel.y = -10;
assertEqual(draw(), 'jump-1', 'Rising animation starts at its first source frame');
mario.vel.y = 10;
assertEqual(draw(), 'fall-1', 'Falling animation starts at its first source frame');
jump.rebound(mario, 180);
assertEqual(draw(), 'jump-1', 'Enemy rebound returns to the rising animation');

jump.phase = 'grounded';
jump.ready = 1;
mario.vel.set(0, 0);
go.dir = 0;
go.distance = 0;
crouch.phase = 'entering';
assertEqual(draw(), 'crouch-enter-1', 'Crouch starts with the HD crouch-in record');
animationClock.animationState = 'crouch-enter';
animationClock.animationStateTime = 1;
assertEqual(draw(), 'crouch-enter-3', 'Crouch-in holds its terminal source frame');
crouch.phase = 'crouched';
assertEqual(draw(), 'crouch', 'Stationary crouch uses the dedicated HD held pose');
go.dir = 1;
assertEqual(draw(), 'crawl-1', 'Down plus direction routes to the HD crawl record');
crouch.phase = 'exiting';
assertEqual(draw(), 'crouch-exit-1', 'Standing up starts the HD crouch-out record');
crouch.phase = 'flipping';
crouch.flipDirection = 1;
assertEqual(draw(), 'ledge-flip-1', 'Crawling off an edge starts the reversed HD ledge flip');
assertEqual(draws.at(-1)?.flip, true, 'Right-edge flip faces back toward its left supporting wall');
crouch.phase = 'standing';
crouch.flipDirection = 0;
go.dir = 0;

ledgeHang.phase = 'hanging';
ledgeHang.side = -1;
assertEqual(draw(), 'ledge-hang-1', 'Left ledge starts the dedicated HD grab sequence');
assertEqual(draws.at(-1)?.flip, true, 'Hang facing follows the supporting ledge');
go.dir = 1;
draw();
assertEqual(
    draws.at(-1)?.flip,
    true,
    'Right input cannot turn the player sprite away from a left ledge',
);
go.dir = -1;
draw();
assertEqual(
    draws.at(-1)?.flip,
    true,
    'Left input leaves the player sprite facing the same left ledge',
);
go.dir = 0;
carrier.carried = new Entity();
assertEqual(
    draw(),
    'ledge-hang-1',
    'Carrying preserves the ledge-hang animation while attached',
);
carrier.carried = null;
animationClock.animationState = 'ledge-hang';
animationClock.animationStateTime = 1;
assertEqual(draw(), 'ledge-hang-4', 'Hanging holds the terminal HD suspended pose');
ledgeHang.enteredFromTop = true;
animationClock.animationStateTime = 0;
assertEqual(draw(), 'ledge-hang-4', 'Top flip enters directly into the held hanging pose');
ledgeHang.enteredFromTop = false;
ledgeHang.phase = 'climbing';
assertEqual(draw(), 'ledge-climb-1', 'Ledge climb starts the HD ledge-flip sequence');
ledgeHang.climbIntoCrawl = true;
crouch.phase = 'crouched';
go.dir = 1;
assertEqual(
    draw(),
    'crawl-1',
    'Upward crouch-jump entry never renders the reverse ledge-climb sequence',
);
ledgeHang.climbIntoCrawl = false;
crouch.phase = 'standing';
go.dir = 0;
crouch.transitionAnchorActive = true;
crouch.transitionOffset.set(5, -6);
draw();
assertEqual(
    [draws.at(-1)?.pivotX, draws.at(-1)?.pivotY],
    [7, 16],
    'Forward mantle ignores the completed crawl-to-hang positional correction',
);
crouch.transitionAnchorActive = false;
crouch.transitionOffset.set(0, 0);
ledgeHang.phase = 'airborne';
ledgeHang.side = 0;

ladderClimb.phase = 'clinging';
assertEqual(draw(), 'ladder-cling', 'Ladder mount holds the dedicated HD cling pose');
carrier.carried = new Entity();
assertEqual(
    draw(),
    'ladder-cling',
    'Ladder cling sprite remains active while carrying an item',
);
ladderClimb.phase = 'climbing';
ladderClimb.animationTime = 0.11;
assertEqual(draw(), 'ladder-climb-3', 'Ladder motion advances through the HD climb loop');
assertEqual(
    draw(),
    'ladder-climb-3',
    'Ladder climbing sprite remains active while carrying an item',
);
ladderClimb.phase = 'inactive';
ladderClimb.animationTime = 0;

jump.ready = 1;
jump.phase = 'grounded';
go.distance = 0;
assertEqual(draw(), 'carry-idle', 'Carry idle frame');
go.distance = 7;
assertEqual(draw(), 'carry-run-3', 'Carry run fallback uses dense movement frames');
crouch.phase = 'crouched';
go.dir = 1;
assertEqual(draw(), 'crawl-1', 'Carrying crawl keeps the ordinary crawl artwork');
crouch.phase = 'standing';
go.dir = 0;
jump.ready = -1;
mario.vel.y = -10;
assertEqual(draw(), 'carry-jump', 'Carry rising frame');
mario.vel.y = 10;
assertEqual(draw(), 'carry-fall', 'Carry falling frame');

(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0.1;
assertEqual(draw(), 'throw-1', 'Throw animation starts at its first source frame');

carrier.carried = null;
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0;
animationClock.animationState = 'jump';
animationClock.animationStateTime = 0.11;
mario.vel.y = -10;
assertEqual(draw(), 'jump-3', 'Rising animation advances through source frames');
animationClock.animationStateTime = 1;
assertEqual(draw(), 'jump-4', 'Rising animation holds its terminal source frame');

animationClock.animationState = 'fall';
animationClock.animationStateTime = 0.11;
mario.vel.y = 10;
assertEqual(draw(), 'fall-3', 'Falling animation advances through source frames');
animationClock.animationStateTime = 1;
assertEqual(draw(), 'fall-4', 'Falling animation holds its terminal source frame');

go.dir = -1;
mario.vel.x = 10;
go.distance = 7;
jump.ready = 1;
animationClock.animationState = 'skid';
animationClock.animationStateTime = 0.11;
assertEqual(draw(), 'skid-3', 'Skid animation advances through source frames');

go.dir = 1;
mario.vel.x = 0;
go.distance = 0;
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0.1;
animationClock.animationState = 'throw';
animationClock.animationStateTime = 1;
assertEqual(draw(), 'throw-5', 'Throw animation holds its terminal source frame');
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0;

const aimedItem = new Entity();
const aimedPickable = new Pickable();
aimedPickable.throwVelocity.set(100, -20);
aimedPickable.upwardThrowVelocity.set(90, -200);
aimedItem.addTrait(aimedPickable);
carrier.collides(mario, aimedItem);
assertEqual(mario.pickupOrThrow(), aimedItem, 'Player picks up an aimed-throw test item');
ladderClimb.verticalDirection = -1;
assertEqual(mario.pickupOrThrow(), aimedItem, 'Up plus action releases the carried item');
assertEqual(
    [aimedItem.vel.x, aimedItem.vel.y],
    [90, -200],
    'Held Up routes the item-specific upward throw through the player action',
);
ladderClimb.verticalDirection = 0;
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0;

const placedItem = new Entity();
placedItem.size.set(8, 8);
const placedPickable = new Pickable();
const placedPhysics = new Physics();
placedItem.addTrait(placedPickable);
placedItem.addTrait(placedPhysics);
mario.pos.set(100, 50);
mario.size.set(14, 16);
mario.vel.set(0, 0);
go.dir = 0;
go.heading = 1;
jump.phase = 'grounded';
jump.ready = 1;
mario.traits.get(Physics).grounded = true;
carrier.collides(mario, placedItem);
assertEqual(mario.pickupOrThrow(), placedItem, 'Player picks up a placement test item');
crouch.downHeld = true;
assertEqual(mario.pickupOrThrow(), placedItem, 'Grounded Down plus D places the item');
assertEqual(
    [placedItem.bounds.left, placedItem.bounds.bottom, placedItem.vel.x, placedItem.vel.y],
    [108, 66, 0, 0],
    'Grounded placement lowers the item directly in front at floor height',
);
assertEqual(
    (mario as typeof mario & {throwFrameTime: number}).throwFrameTime,
    0,
    'Placement does not play the throw animation',
);

const airborneItem = new Entity();
airborneItem.addTrait(new Pickable());
carrier.collides(mario, airborneItem);
crouch.downHeld = false;
assertEqual(mario.pickupOrThrow(), airborneItem, 'Player picks up an airborne test item');
crouch.downHeld = true;
jump.phase = 'falling';
jump.ready = -1;
mario.traits.get(Physics).grounded = false;
mario.vel.y = 30;
assertEqual(mario.pickupOrThrow(), airborneItem, 'Airborne Down plus D still releases the item');
assertEqual(
    [
        airborneItem.pos.x,
        airborneItem.pos.y,
        airborneItem.vel.x,
        airborneItem.vel.y,
    ],
    [108, 42, 480, -180],
    'Airborne Down plus D remains a normal throw from the carried position',
);
crouch.downHeld = false;
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0;
jump.phase = 'grounded';
jump.ready = 1;
mario.traits.get(Physics).grounded = true;
mario.vel.set(0, 0);

const crouchedPickupItem = new Entity();
const crouchedPickupPickable = new Pickable();
crouchedPickupItem.addTrait(crouchedPickupPickable);
crouch.phase = 'crouched';
crouch.downHeld = true;
jump.phase = 'grounded';
jump.ready = 1;
mario.traits.get(Physics).grounded = true;
carrier.collides(mario, crouchedPickupItem);
assertEqual(
    mario.pickupOrThrow(),
    crouchedPickupItem,
    'Grounded Down plus D picks up an item from crouch',
);
assertEqual(
    crouchedPickupPickable.carrier,
    mario,
    'Crouched pickup establishes the normal carrier relationship',
);
carrier.drop(mario);
crouch.phase = 'standing';
crouch.downHeld = false;

const hangingDropItem = new Entity();
const hangingDropPickable = new Pickable();
hangingDropItem.addTrait(hangingDropPickable);
carrier.collides(mario, hangingDropItem);
assertEqual(mario.pickupOrThrow(), hangingDropItem, 'Player picks up the ledge-drop item');
ledgeHang.phase = 'hanging';
ledgeHang.side = 1;
assertEqual(mario.pickupOrThrow(), hangingDropItem, 'D drops the carried item while hanging');
assertEqual(
    [
        ledgeHang.phase,
        carrier.carried,
        hangingDropPickable.carrier,
        hangingDropItem.vel.x,
        hangingDropItem.vel.y,
    ],
    ['hanging', null, null, 0, 0],
    'Item drop leaves the player attached to the ledge without throw velocity',
);
ledgeHang.phase = 'airborne';
ledgeHang.side = 0;

function attachLadderThrowItem(): [Entity, Pickable] {
    const item = new Entity();
    const itemPickable = new Pickable();
    item.addTrait(itemPickable);
    carrier.collides(mario, item);
    assertEqual(mario.pickupOrThrow(), item, 'Player picks up a ladder-throw item');
    return [item, itemPickable];
}

go.heading = -1;
const [ladderThrowItem, ladderThrowPickable] = attachLadderThrowItem();
ladderClimb.phase = 'clinging';
ladderClimb.verticalDirection = 0;
assertEqual(mario.pickupOrThrow(), ladderThrowItem, 'D throws while clinging to a ladder');
assertEqual(
    [
        ladderClimb.phase,
        ladderThrowItem.vel.x,
        ladderThrowItem.vel.y,
        (mario as typeof mario & {throwFrameTime: number}).throwFrameTime,
    ],
    [
        'clinging',
        -ladderThrowPickable.throwVelocity.x,
        ladderThrowPickable.throwVelocity.y,
        0,
    ],
    'Ladder throw follows facing without detaching or starting ground throw artwork',
);

ladderClimb.phase = 'inactive';
go.heading = 1;
const [ladderUpItem, ladderUpPickable] = attachLadderThrowItem();
ladderClimb.phase = 'climbing';
ladderClimb.verticalDirection = -1;
assertEqual(mario.pickupOrThrow(), ladderUpItem, 'Up plus D throws while climbing');
assertEqual(
    [ladderClimb.phase, ladderUpItem.vel.x, ladderUpItem.vel.y],
    [
        'climbing',
        ladderUpPickable.upwardThrowVelocity.x,
        ladderUpPickable.upwardThrowVelocity.y,
    ],
    'Ladder Up throw uses the item-specific high trajectory without detaching',
);
ladderClimb.phase = 'inactive';
ladderClimb.verticalDirection = 0;

health.takeDamage(1, 1);
playerHit.start(-1);
assertEqual(draw(), 'reaction-hit-1', 'Small damage starts the upright HD reaction');
assertEqual(draws.at(-1)?.flip, false, 'Leftward recoil keeps the source-facing reaction');
assertEqual(drawOpacities.at(-1), 1, 'Invulnerability flashing begins at full opacity');
assertEqual(drawContext.globalAlpha, 1, 'Player drawing restores the canvas opacity');

const hitLevel = new Level();
health.update(
    mario,
    {deltaTime: 1 / 16} as GameContext,
    hitLevel,
);
playerHit.update(
    mario,
    {deltaTime: 1 / 16} as GameContext,
    hitLevel,
);
assertEqual(draw(), 'reaction-hit-1', 'The recoil animation remains active during its first frame');
assertEqual(
    drawOpacities.at(-1),
    PLAYER_INVULNERABILITY_MINIMUM_OPACITY,
    'Invulnerability opacity reaches its deterministic low point',
);

playerHit.update(
    mario,
    {deltaTime: 0.01} as GameContext,
    hitLevel,
);
assertEqual(
    draw(),
    'reaction-hit-2',
    'Small recoil advances to the second arms-back frame',
);

playerHit.update(
    mario,
    {deltaTime: SPELUNKY_SMALL_HIT_REACTION_DURATION} as GameContext,
    hitLevel,
);
assertEqual(draw(), 'idle', 'Normal animation resumes when the small reaction ends');

health.update(mario, {deltaTime: 1} as GameContext, hitLevel);
assertEqual(draw(), 'idle', 'Normal animation remains after protection expires');
assertEqual(drawOpacities.at(-1), 1, 'Expired protection restores full opacity');

playerHit.start(1);
assertEqual(draw(), 'reaction-hit-1', 'A rightward recoil can start independently');
assertEqual(draws.at(-1)?.flip, true, 'Rightward recoil mirrors the HD reaction frame');

killable.dead = true;
playerDeath.phase = 'airborne';
playerDeath.direction = -1;
assertEqual(draw(), 'reaction-airborne', 'Airborne death uses the curled HD body');
assertEqual(
    draws.at(-1)?.flip,
    false,
    'Leftward death keeps the HD pose with its head on the left',
);
playerDeath.direction = 1;
assertEqual(draw(), 'reaction-airborne', 'Rightward death keeps the curled HD body');
assertEqual(
    draws.at(-1)?.flip,
    true,
    'Rightward death mirrors the HD pose so its head points right',
);
playerDeath.phase = 'settled';
assertEqual(
    draw(),
    'reaction-unconscious',
    'Settled death uses the final HD unconscious pose',
);

assertEqual(
    draws[0],
    {name: 'idle', pivotX: 7, pivotY: 16, flip: false},
    'Player art uses the collider bottom-centre pivot',
);

assertEqual(
    PLAYER_FRAME_NAMES.length,
    109,
    'The expanded HD player frame catalogue remains explicit',
);

console.log('Expanded Spelunky HD player animation regression passed');
