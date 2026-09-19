import Entity from '../Entity.js';
import {createRockFactory} from '../entities/Rock.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import type {CollisionTile} from '../TileCollider.js';
import Carrier from './Carrier.js';
import Crouch, {SPELUNKY_CROUCH_HEIGHT} from './Crouch.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LedgeHang, {
    SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET,
    SPELUNKY_LEDGE_DROP_REGRAB_DELAY,
    SPELUNKY_LEDGE_JUMP_HORIZONTAL_VELOCITY,
} from './LedgeHang.js';
import Physics from './Physics.js';
import Pickable from './Pickable.js';
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

const DELTA_TIME = 1 / 60;
const context = {
    deltaTime: DELTA_TIME,
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

interface LedgeFixture {
    entity: Entity;
    physics: Physics;
    go: Go;
    jump: Jump;
    killable: Killable;
    carrier: Carrier;
    crouch: Crouch;
    ledge: LedgeHang;
}

function createFixture(side: -1 | 1 = 1): LedgeFixture {
    const entity = new Entity();
    const physics = new Physics();
    const go = new Go();
    const jump = new Jump();
    const killable = new Killable();
    const carrier = new Carrier();
    const crouch = new Crouch();
    const ledge = new LedgeHang();
    entity.size.set(14, 16);
    physics.verticalCollisionWidth = 10;
    entity.pos.set(side > 0 ? 50 : 64, 61);
    entity.vel.set(side * 60, 60);
    go.dir = side;
    go.heading = side;
    jump.phase = 'falling';
    jump.ready = -1;
    entity.addTrait(physics);
    entity.addTrait(new Solid());
    entity.addTrait(crouch);
    entity.addTrait(go);
    entity.addTrait(jump);
    entity.addTrait(killable);
    entity.addTrait(carrier);
    entity.addTrait(ledge);
    return {entity, physics, go, jump, killable, carrier, crouch, ledge};
}

function createLevel(side: -1 | 1 = 1): {
    level: Level;
    tiles: Matrix<CollisionTile>;
} {
    const level = new Level();
    const tiles = new Matrix<CollisionTile>();
    tiles.set(side > 0 ? 4 : 3, 4, {type: 'ground'});
    level.tileCollider.addGrid(tiles);
    return {level, tiles};
}

function grab(fixture: LedgeFixture, level: Level): void {
    fixture.ledge.update(fixture.entity, context, level);
}

function updatePlayer(fixture: LedgeFixture, level: Level): void {
    fixture.physics.update(fixture.entity, context, level);
    fixture.crouch.update(fixture.entity, context, level);
    fixture.go.update(fixture.entity, context, level);
    fixture.jump.update(fixture.entity, context, level);
    fixture.ledge.update(fixture.entity, context, level);
}

const right = createFixture(1);
const rightLevel = createLevel(1);
grab(right, rightLevel.level);
assertEqual(
    [
        right.ledge.phase,
        right.ledge.side,
        right.entity.bounds.top,
        right.entity.bounds.right,
        right.entity.vel.x,
        right.entity.vel.y,
        right.physics.enabled,
    ],
    [
        'hanging',
        1,
        64 + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET,
        64,
        0,
        0,
        false,
    ],
    'Falling toward an exposed right corner enters an aligned hang',
);

const left = createFixture(-1);
const leftLevel = createLevel(-1);
left.go.dir = 0;
grab(left, leftLevel.level);
assertEqual(
    [left.ledge.phase, left.ledge.side, left.entity.bounds.top, left.entity.bounds.left],
    ['hanging', -1, 64 + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET, 64],
    'Left corner grab mirrors geometry and facing',
);

right.entity.vel.set(200, 200);
right.go.dir = -1;
right.go.update(right.entity, context, rightLevel.level);
right.jump.update(right.entity, context, rightLevel.level);
right.ledge.update(right.entity, context, rightLevel.level);
assertEqual(
    [right.ledge.phase, right.ledge.side, right.entity.vel.x, right.entity.vel.y],
    ['hanging', 1, 0, 0],
    'Hanging freezes drift and ignores rapid facing changes',
);

const rising = createFixture();
rising.jump.phase = 'rising';
rising.entity.vel.y = -60;
grab(rising, createLevel().level);
assertEqual(rising.ledge.phase, 'airborne', 'Rising player cannot grab');

const noInput = createFixture();
noInput.go.dir = 0;
grab(noInput, createLevel().level);
assertEqual(
    noInput.ledge.phase,
    'hanging',
    'Approach momentum grabs the corner without held horizontal input',
);

const neutralAdjacent = createFixture();
neutralAdjacent.entity.vel.x = 0;
neutralAdjacent.go.dir = 0;
grab(neutralAdjacent, createLevel().level);
assertEqual(
    [neutralAdjacent.ledge.phase, neutralAdjacent.ledge.side],
    ['hanging', 1],
    'A neutral fall directly beside the corner grabs without horizontal motion',
);

const neutralFacingAway = createFixture();
neutralFacingAway.entity.vel.x = 0;
neutralFacingAway.go.dir = 0;
neutralFacingAway.go.heading = -1;
grab(neutralFacingAway, createLevel().level);
assertEqual(
    neutralFacingAway.ledge.phase,
    'airborne',
    'A neutral fall does not grab an adjacent ledge behind the player',
);

const resolvedContact = createFixture();
resolvedContact.go.dir = 0;
resolvedContact.entity.pos.x = 49;
resolvedContact.entity.vel.set(120, 60);
const resolvedContactLevel = createLevel();
resolvedContact.physics.update(
    resolvedContact.entity,
    context,
    resolvedContactLevel.level,
);
assertEqual(
    resolvedContact.entity.vel.x,
    0,
    'Solid collision consumes horizontal approach velocity before ledge update',
);
grab(resolvedContact, resolvedContactLevel.level);
assertEqual(
    resolvedContact.ledge.phase,
    'hanging',
    'Wall contact preserves the approach side after collision resolution',
);

for (const direction of [-1, 1] as const) {
    const neutralJump = createFixture(direction);
    const neutralJumpLevel = createLevel(direction);
    neutralJump.entity.pos.set(direction > 0 ? 50 : 64, 80);
    neutralJump.entity.vel.set(0, 0);
    neutralJump.go.dir = 0;
    neutralJump.jump.start();
    neutralJump.jump.launch(neutralJump.entity, DELTA_TIME);
    for (let frame = 0;
        frame < 60 && neutralJump.ledge.phase === 'airborne';
        frame++) {
        updatePlayer(neutralJump, neutralJumpLevel.level);
    }
    assertEqual(
        [
            neutralJump.ledge.phase,
            neutralJump.ledge.side,
            neutralJump.entity.bounds.top,
            direction > 0
                ? neutralJump.entity.bounds.right
                : neutralJump.entity.bounds.left,
        ],
        ['hanging', direction, 64 + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET, 64],
        `${direction < 0 ? 'Left' : 'Right'} neutral jump catches a two-tile-height ledge`,
    );

    const adjacent = createFixture(direction);
    const adjacentLevel = createLevel(direction);
    adjacent.entity.pos.x = direction > 0 ? 50 : 64;
    adjacent.entity.vel.set(0, 60);
    adjacent.go.dir = 0;
    updatePlayer(adjacent, adjacentLevel.level);
    assertEqual(
        [
            adjacent.ledge.phase,
            adjacent.ledge.side,
            adjacent.entity.bounds.top,
            direction > 0
                ? adjacent.entity.bounds.right
                : adjacent.entity.bounds.left,
        ],
        ['hanging', direction, 64 + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET, 64],
        `${direction < 0 ? 'Left' : 'Right'} exact-adjacent fall catches the cliff`,
    );

    const nearAdjacent = createFixture(direction);
    const nearAdjacentLevel = createLevel(direction);
    nearAdjacent.entity.pos.x = direction > 0 ? 49.75 : 64.25;
    nearAdjacent.entity.vel.set(0, 60);
    nearAdjacent.go.dir = 0;
    updatePlayer(nearAdjacent, nearAdjacentLevel.level);
    assertEqual(
        [nearAdjacent.ledge.phase, nearAdjacent.ledge.side],
        ['hanging', direction],
        `${direction < 0 ? 'Left' : 'Right'} near-adjacent fall retains the ordinary catch tolerance`,
    );

    const separated = createFixture(direction);
    const separatedLevel = createLevel(direction);
    separated.entity.pos.x = direction > 0 ? 49.49 : 64.51;
    separated.entity.vel.set(0, 60);
    separated.go.dir = 0;
    updatePlayer(separated, separatedLevel.level);
    assertEqual(
        separated.ledge.phase,
        'airborne',
        `${direction < 0 ? 'Left' : 'Right'} position beyond the probe cannot catch`,
    );
}

for (const shoulderCase of [
    {
        label: 'Reported left cliff at (46,96)',
        cliffSide: -1 as const,
        playerX: 46,
        cliffColumn: 2,
        floorColumns: [2, 3] as const,
    },
    {
        label: 'Mirrored right cliff',
        cliffSide: 1 as const,
        playerX: 52,
        cliffColumn: 4,
        floorColumns: [3, 4] as const,
    },
]) {
    const facingAwayJump = createFixture(shoulderCase.cliffSide);
    facingAwayJump.entity.pos.set(shoulderCase.playerX, 96);
    facingAwayJump.entity.vel.set(0, 0);
    facingAwayJump.physics.grounded = true;
    facingAwayJump.go.dir = 0;
    facingAwayJump.go.heading = -shoulderCase.cliffSide;
    facingAwayJump.jump.phase = 'grounded';
    facingAwayJump.jump.ready = 1;
    const facingAwayLevel = new Level();
    const facingAwayTiles = new Matrix<CollisionTile>();
    facingAwayTiles.set(shoulderCase.cliffColumn, 5, {type: 'ground'});
    facingAwayTiles.set(shoulderCase.cliffColumn, 6, {type: 'ground'});
    for (const floorColumn of shoulderCase.floorColumns) {
        facingAwayTiles.set(floorColumn, 7, {type: 'ground'});
    }
    facingAwayLevel.tileCollider.addGrid(facingAwayTiles);
    facingAwayJump.jump.start();
    let facingAwayMinimumTop = facingAwayJump.entity.bounds.top;
    let facingAwayLandedOnUpperLedge = false;
    for (let frame = 0; frame < 60; frame++) {
        updatePlayer(facingAwayJump, facingAwayLevel);
        facingAwayMinimumTop = Math.min(
            facingAwayMinimumTop,
            facingAwayJump.entity.bounds.top,
        );
        if (facingAwayJump.physics.grounded
            && facingAwayJump.entity.bounds.top === 64) {
            facingAwayLandedOnUpperLedge = true;
        }
        if (facingAwayMinimumTop < 96 && facingAwayJump.physics.grounded) {
            break;
        }
    }
    assertEqual(
        [
            facingAwayMinimumTop < 80,
            facingAwayJump.ledge.phase,
            facingAwayJump.physics.grounded,
            facingAwayJump.entity.bounds.top,
            facingAwayJump.go.heading,
            facingAwayLandedOnUpperLedge,
        ],
        [true, 'airborne', true, 96, -shoulderCase.cliffSide, false],
        `${shoulderCase.label} jump returns below instead of transcending the ledge`,
    );
}

const movingAway = createFixture();
movingAway.entity.vel.x = -1;
grab(movingAway, createLevel().level);
assertEqual(movingAway.ledge.phase, 'airborne', 'Moving away cannot grab the opposite corner');

const covered = createFixture();
const coveredLevel = createLevel();
coveredLevel.tiles.set(4, 3, {type: 'ground'});
grab(covered, coveredLevel.level);
assertEqual(covered.ledge.phase, 'airborne', 'Covered wall is not an exposed ledge');

const embedded = createFixture();
const embeddedLevel = createLevel();
embeddedLevel.tiles.set(3, 4, {type: 'ground'});
grab(embedded, embeddedLevel.level);
assertEqual(embedded.ledge.phase, 'airborne', 'Blocked hanging space rejects the grab');

const carrying = createFixture();
carrying.go.dir = 0;
const carriedRock = createRockFactory({
    drawFrame: (): void => {},
} as unknown as SpriteSheet)();
const pickable = carriedRock.traits.get(Pickable);
pickable.attach(carriedRock, carrying.entity, 1);
carrying.carrier.carried = carriedRock;
const carryingLevel = createLevel();
grab(carrying, carryingLevel.level);
carrying.carrier.update(carrying.entity, context, carryingLevel.level);
grab(carrying, carryingLevel.level);
assertEqual(
    [
        carrying.ledge.phase,
        carrying.carrier.carried === carriedRock,
        pickable.carrier === carrying.entity,
        carriedRock.pos.x,
        carriedRock.pos.y,
    ],
    ['hanging', true, true, carrying.entity.pos.x + 7, carrying.entity.pos.y + 6],
    'Carried rock remains attached and follows the player into a ledge hang',
);
carrying.ledge.setVerticalInput(-1, true);
for (let frame = 0; frame < 30; frame++) {
    updatePlayer(carrying, carryingLevel.level);
}
carriedRock.finalize();
assertEqual(
    [
        carrying.ledge.phase,
        carrying.physics.grounded,
        carrying.carrier.carried === carriedRock,
        pickable.carrier === carrying.entity,
        carriedRock.pos.x,
        carriedRock.pos.y,
    ],
    [
        'hanging',
        false,
        true,
        true,
        carrying.entity.pos.x + 7,
        carrying.entity.pos.y + 6,
    ],
    'Up remains a no-op while hanging with a carried item',
);

const dead = createFixture();
dead.killable.dead = true;
grab(dead, createLevel().level);
assertEqual(dead.ledge.phase, 'airborne', 'Dead player cannot grab a ledge');

const deep = createFixture();
deep.entity.pos.y = 70;
grab(deep, createLevel().level);
assertEqual(deep.ledge.phase, 'airborne', 'Player below the corner cannot snap upward into a hang');

const missing = createFixture();
grab(missing, new Level());
assertEqual(missing.ledge.phase, 'airborne', 'Level boundary without a tile cannot be grabbed');

const dropping = createFixture();
const droppingLevel = createLevel();
grab(dropping, droppingLevel.level);
dropping.ledge.setVerticalInput(1, true);
dropping.jump.start();
dropping.ledge.update(dropping.entity, context, droppingLevel.level);
assertEqual(
    [
        dropping.ledge.phase,
        dropping.physics.enabled,
        dropping.jump.phase,
        dropping.jump.requestTime,
        dropping.ledge.cooldown,
    ],
    ['airborne', true, 'falling', 0, SPELUNKY_LEDGE_DROP_REGRAB_DELAY],
    'Classic Down+Jump input deliberately drops with a re-grab delay',
);
dropping.entity.vel.y = 60;
dropping.go.dir = 1;
grab(dropping, droppingLevel.level);
assertEqual(dropping.ledge.phase, 'airborne', 'Drop cooldown prevents immediate re-grab');

const away = createFixture();
const awayLevel = createLevel();
grab(away, awayLevel.level);
away.go.dir = -1;
away.jump.start();
away.ledge.update(away.entity, context, awayLevel.level);
assertEqual(
    [
        away.ledge.phase,
        away.entity.vel.x,
        away.entity.vel.y,
        away.jump.phase,
        away.jump.held,
    ],
    [
        'airborne',
        -SPELUNKY_LEDGE_JUMP_HORIZONTAL_VELOCITY,
        -away.jump.launchVelocity,
        'rising',
        true,
    ],
    'Jump plus away input launches away through the shared Jump state',
);

const upward = createFixture();
const upwardLevel = createLevel();
grab(upward, upwardLevel.level);
const hangingX = upward.entity.pos.x;
upward.jump.start();
upward.ledge.update(upward.entity, context, upwardLevel.level);
assertEqual(
    [
        upward.ledge.phase,
        upward.entity.pos.x,
        upward.entity.vel.y,
        upward.jump.phase,
        upward.jump.held,
    ],
    ['airborne', hangingX, -upward.jump.launchVelocity, 'rising', true],
    'Straight ledge jump preserves horizontal position for stable camera tracking',
);

for (const direction of [-1, 1] as const) {
    const upJump = createFixture(direction);
    const upJumpLevel = createLevel(direction);
    grab(upJump, upJumpLevel.level);
    upJump.ledge.setVerticalInput(-1, true);
    upJump.jump.start();
    updatePlayer(upJump, upJumpLevel.level);
    assertEqual(
        [
            upJump.ledge.phase,
            upJump.jump.requestTime,
            upJump.entity.vel.x,
            upJump.entity.vel.y,
            upJump.physics.enabled,
            upJump.crouch.phase,
            upJump.jump.held,
        ],
        [
            'airborne',
            0,
            0,
            -upJump.jump.launchVelocity,
            true,
            'standing',
            true,
        ],
        `${direction < 0 ? 'Left' : 'Right'} held Up plus Jump starts an upward exit`,
    );

    const phaseTrace = [upJump.ledge.phase];
    for (let frame = 0; frame < 60; frame++) {
        updatePlayer(upJump, upJumpLevel.level);
        phaseTrace.push(upJump.ledge.phase);
    }
    assertEqual(
        [
            phaseTrace.includes('hanging'),
            phaseTrace.includes('climbing'),
            upJump.ledge.phase,
            upJump.jump.phase,
            upJump.jump.requestTime,
            upJump.entity.bounds.top > 64 + 4,
        ],
        [false, false, 'airborne', 'falling', 0, true],
        `${direction < 0 ? 'Left' : 'Right'} upward exit cannot reverse or re-grab the departed ledge`,
    );

    const staggered = createFixture(direction);
    const staggeredLevel = createLevel(direction);
    grab(staggered, staggeredLevel.level);
    staggered.ledge.setVerticalInput(-1, true);
    updatePlayer(staggered, staggeredLevel.level);
    assertEqual(
        staggered.ledge.phase,
        'hanging',
        `${direction < 0 ? 'Left' : 'Right'} Up alone does nothing while hanging`,
    );
    for (let frame = 0; frame < 3; frame++) {
        updatePlayer(staggered, staggeredLevel.level);
    }
    staggered.jump.start();
    updatePlayer(staggered, staggeredLevel.level);
    assertEqual(
        [
            staggered.ledge.phase,
            staggered.jump.phase,
            staggered.jump.requestTime,
            staggered.entity.vel.y,
            staggered.physics.enabled,
        ],
        [
            'airborne',
            'rising',
            0,
            -staggered.jump.launchVelocity,
            true,
        ],
        `${direction < 0 ? 'Left' : 'Right'} Jump shortly after Up performs the upward exit`,
    );

    const staggeredPhaseTrace = [staggered.ledge.phase];
    for (let frame = 0; frame < 60; frame++) {
        updatePlayer(staggered, staggeredLevel.level);
        staggeredPhaseTrace.push(staggered.ledge.phase);
    }
    assertEqual(
        [
            staggeredPhaseTrace.includes('hanging'),
            staggeredPhaseTrace.includes('climbing'),
            staggered.ledge.phase,
            staggered.jump.phase,
        ],
        [false, false, 'airborne', 'falling'],
        `${direction < 0 ? 'Left' : 'Right'} staggered Up-then-Jump cannot reverse or re-grab the departed ledge`,
    );
}

const blockedUpJump = createFixture();
const blockedUpJumpLevel = createLevel();
grab(blockedUpJump, blockedUpJumpLevel.level);
blockedUpJump.ledge.setVerticalInput(-1, true);
blockedUpJump.jump.start();
blockedUpJumpLevel.tiles.set(4, 3, {type: 'ground'});
updatePlayer(blockedUpJump, blockedUpJumpLevel.level);
assertEqual(
    [
        blockedUpJump.ledge.phase,
        blockedUpJump.physics.enabled,
        blockedUpJump.jump.phase,
        blockedUpJump.jump.requestTime,
        blockedUpJump.entity.vel.x,
        blockedUpJump.entity.vel.y,
    ],
    ['airborne', true, 'falling', 0, 0, 0],
    'Up plus Jump with blocked headroom releases safely without a buffered launch',
);
updatePlayer(blockedUpJump, blockedUpJumpLevel.level);
assertEqual(
    [blockedUpJump.ledge.phase, blockedUpJump.jump.phase],
    ['airborne', 'falling'],
    'Held blocked inputs cannot launch or re-grab on the following frame',
);

const upOnly = createFixture();
const upOnlyLevel = createLevel();
grab(upOnly, upOnlyLevel.level);
const upOnlyPosition = [upOnly.entity.pos.x, upOnly.entity.pos.y];
upOnly.ledge.setVerticalInput(-1, true);
for (let frame = 0; frame < 60; frame++) {
    updatePlayer(upOnly, upOnlyLevel.level);
}
assertEqual(
    [
        upOnly.ledge.phase,
        upOnly.entity.pos.x,
        upOnly.entity.pos.y,
        upOnly.physics.enabled,
        upOnly.physics.grounded,
        upOnly.jump.phase,
    ],
    ['hanging', ...upOnlyPosition, false, false, 'falling'],
    'Holding Up cannot start or render a reverse ledge transition',
);

function createReportedCorner(): {fixture: LedgeFixture; level: Level} {
    const fixture = createFixture(1);
    fixture.entity.pos.set(386, 253);
    fixture.entity.vel.set(60, 60);
    fixture.go.dir = 1;
    fixture.go.heading = 1;
    fixture.jump.phase = 'falling';
    fixture.jump.ready = -1;

    const level = new Level();
    const tiles = new Matrix<CollisionTile>();
    // Default-level corner: the hang is on the left face of (25, 16),
    // with the next column rising above it at (26, 15).
    tiles.set(25, 16, {type: 'ground'});
    tiles.set(26, 15, {type: 'ground'});
    level.tileCollider.addGrid(tiles);
    return {fixture, level};
}

for (const upPressFrame of [0, 1]) {
    const {fixture, level} = createReportedCorner();
    const phaseTrace: string[] = [];
    for (let frame = 0; frame < 30; frame++) {
        if (frame === upPressFrame) {
            fixture.ledge.setVerticalInput(-1, true);
        }
        if (frame === upPressFrame + 10) {
            fixture.ledge.setVerticalInput(-1, false);
        }
        fixture.ledge.update(fixture.entity, context, level);
        phaseTrace.push(fixture.ledge.phase);
    }
    assertEqual(
        [
            fixture.entity.bounds.left,
            fixture.entity.bounds.top,
            phaseTrace.every(phase => phase === 'hanging'),
        ],
        [386, 254, true],
        `Up on repro frame ${upPressFrame} leaves the player in the same hang`,
    );
}

const crouchEntry = createReportedCorner();
crouchEntry.fixture.entity.pos.set(386, 247.5);
crouchEntry.fixture.entity.vel.set(60, -30);
crouchEntry.fixture.jump.phase = 'rising';
crouchEntry.fixture.crouch.setDown(true);
crouchEntry.fixture.ledge.setVerticalInput(1, true);
updatePlayer(crouchEntry.fixture, crouchEntry.level);
assertEqual(
    [
        crouchEntry.fixture.entity.bounds.right,
        crouchEntry.fixture.entity.bounds.top,
        crouchEntry.fixture.ledge.phase,
    ],
    [400, 253, 'climbing'],
    'Simulated crouch jump physically contacts the reported ledge before capture',
);
assertEqual(
    [
        crouchEntry.fixture.ledge.phase,
        crouchEntry.fixture.ledge.climbIntoCrawl,
        crouchEntry.fixture.entity.bounds.left,
        crouchEntry.fixture.entity.bounds.top,
    ],
    ['climbing', true, 386, 253],
    'Down-held ledge contact begins a crawl entry without hanging',
);
const crawlEntryTrace = [crouchEntry.fixture.ledge.phase];
let previousCrawlEntryLeft = crouchEntry.fixture.entity.bounds.left;
let previousCrawlEntryTop = crouchEntry.fixture.entity.bounds.top;
while (crouchEntry.fixture.ledge.phase === 'climbing') {
    updatePlayer(crouchEntry.fixture, crouchEntry.level);
    crawlEntryTrace.push(crouchEntry.fixture.ledge.phase);
    if (crouchEntry.fixture.entity.bounds.left < previousCrawlEntryLeft
        || crouchEntry.fixture.entity.bounds.top > previousCrawlEntryTop) {
        throw new Error('Crawl entry must move continuously up, then into the ledge');
    }
    previousCrawlEntryLeft = crouchEntry.fixture.entity.bounds.left;
    previousCrawlEntryTop = crouchEntry.fixture.entity.bounds.top;
}
assertEqual(
    [
        crouchEntry.fixture.ledge.phase,
        crouchEntry.fixture.crouch.phase,
        crouchEntry.fixture.entity.size.y,
        crouchEntry.fixture.entity.bounds.left,
        crouchEntry.fixture.entity.bounds.top,
        crouchEntry.fixture.physics.grounded,
        crouchEntry.fixture.jump.phase,
        crawlEntryTrace.includes('hanging'),
    ],
    [
        'airborne',
        'crouched',
        SPELUNKY_CROUCH_HEIGHT,
        401,
        246,
        true,
        'grounded',
        false,
    ],
    'Continuous assisted entry settles into crawl without a reverse hang',
);

const noCrouchIntent = createReportedCorner();
noCrouchIntent.fixture.physics.update(
    noCrouchIntent.fixture.entity,
    context,
    noCrouchIntent.level,
);
noCrouchIntent.fixture.ledge.update(
    noCrouchIntent.fixture.entity,
    context,
    noCrouchIntent.level,
);
assertEqual(
    [noCrouchIntent.fixture.ledge.phase, noCrouchIntent.fixture.ledge.climbIntoCrawl],
    ['hanging', false],
    'Ordinary ledge contact retains the normal ledge hang',
);

const noContactAssist = createReportedCorner();
noContactAssist.fixture.entity.pos.set(384, 247.5);
noContactAssist.fixture.entity.vel.set(0, -30);
noContactAssist.fixture.jump.phase = 'rising';
noContactAssist.fixture.crouch.setDown(true);
noContactAssist.fixture.ledge.setVerticalInput(1, true);
noContactAssist.fixture.ledge.update(
    noContactAssist.fixture.entity,
    context,
    noContactAssist.level,
);
assertEqual(
    [
        noContactAssist.fixture.ledge.phase,
        noContactAssist.fixture.entity.bounds.left,
        noContactAssist.fixture.entity.bounds.top,
    ],
    ['airborne', 384, 247.5],
    'Crouch intent without physical ledge contact cannot pull across open air',
);

const tooLowForCrouchEntry = createReportedCorner();
tooLowForCrouchEntry.fixture.entity.pos.set(386, 261);
tooLowForCrouchEntry.fixture.entity.vel.set(60, 30);
tooLowForCrouchEntry.fixture.crouch.setDown(true);
tooLowForCrouchEntry.fixture.ledge.setVerticalInput(1, true);
tooLowForCrouchEntry.fixture.physics.update(
    tooLowForCrouchEntry.fixture.entity,
    context,
    tooLowForCrouchEntry.level,
);
tooLowForCrouchEntry.fixture.ledge.update(
    tooLowForCrouchEntry.fixture.entity,
    context,
    tooLowForCrouchEntry.level,
);
assertEqual(
    tooLowForCrouchEntry.fixture.ledge.phase,
    'airborne',
    'Contact below the bounded capture window cannot teleport onto the ledge',
);

const blockedClimb = createFixture();
const blockedClimbLevel = createLevel();
grab(blockedClimb, blockedClimbLevel.level);
blockedClimbLevel.tiles.set(4, 3, {type: 'ground'});
blockedClimb.ledge.setVerticalInput(-1, true);
blockedClimb.ledge.update(blockedClimb.entity, context, blockedClimbLevel.level);
assertEqual(
    blockedClimb.ledge.phase,
    'airborne',
    'A newly occupied corner invalidates the hang instead of embedding the player',
);

const removedSupport = createFixture();
const removedSupportLevel = createLevel();
grab(removedSupport, removedSupportLevel.level);
removedSupportLevel.tiles.delete(4, 4);
removedSupport.ledge.update(removedSupport.entity, context, removedSupportLevel.level);
assertEqual(
    [removedSupport.ledge.phase, removedSupport.physics.enabled],
    ['airborne', true],
    'Destroyed supporting tile releases the hang',
);

const killedWhileHanging = createFixture();
const killedLevel = createLevel();
grab(killedWhileHanging, killedLevel.level);
killedWhileHanging.killable.dead = true;
killedWhileHanging.ledge.update(killedWhileHanging.entity, context, killedLevel.level);
assertEqual(
    [killedWhileHanging.ledge.phase, killedWhileHanging.physics.enabled],
    ['airborne', true],
    'Damage or death interrupts hanging',
);

console.log('Spelunky ledge-hang geometry and transitions passed');
