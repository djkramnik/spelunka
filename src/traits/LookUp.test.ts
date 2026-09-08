import Entity from '../Entity.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Carrier from './Carrier.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LadderClimb from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import LedgeTeeter from './LedgeTeeter.js';
import LookUp, {
    SPELUNKY_LOOK_UP_CAMERA_DELAY,
    SPELUNKY_LOOK_UP_CAMERA_DISTANCE,
    SPELUNKY_LOOK_UP_CAMERA_SPEED,
    SPELUNKY_LOOK_UP_ENTER_TIME,
    SPELUNKY_LOOK_UP_EXIT_TIME,
} from './LookUp.js';
import Physics from './Physics.js';
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

interface LookUpFixture {
    readonly entity: Entity;
    readonly lookUp: LookUp;
    readonly update: (deltaTime: number) => void;
}

function createFixture(): LookUpFixture {
    const entity = new Entity();
    const physics = new Physics();
    physics.grounded = true;
    entity.addTrait(physics);
    entity.addTrait(new Crouch());
    entity.addTrait(new PlayerDeath());
    entity.addTrait(new Go());
    entity.addTrait(new PlayerHit());
    const jump = new Jump();
    jump.phase = 'grounded';
    jump.ready = 1;
    entity.addTrait(jump);
    entity.addTrait(new Killable());
    entity.addTrait(new LadderClimb());
    entity.addTrait(new LedgeHang());
    entity.addTrait(new LedgeTeeter());
    entity.addTrait(new Carrier());
    const lookUp = new LookUp();
    entity.addTrait(lookUp);
    const level = new Level();
    return {
        entity,
        lookUp,
        update(deltaTime: number): void {
            lookUp.update(
                entity,
                {deltaTime} as GameContext,
                level,
            );
        },
    };
}

const timing = createFixture();
timing.lookUp.setUp(true);
timing.update(SPELUNKY_LOOK_UP_ENTER_TIME / 2);
assertEqual(timing.lookUp.phase, 'entering', 'Grounded Up enters the look pose');
timing.update(SPELUNKY_LOOK_UP_ENTER_TIME / 2);
assertEqual(timing.lookUp.phase, 'looking', 'HD entry timing reaches the held pose');
timing.update(
    SPELUNKY_LOOK_UP_CAMERA_DELAY
        - SPELUNKY_LOOK_UP_ENTER_TIME
        - 1 / 60,
);
assertEqual(timing.lookUp.cameraOffset, 0, 'Camera remains still before the hold delay');
timing.update(1 / 60);
assertEqual(
    timing.lookUp.cameraOffset,
    SPELUNKY_LOOK_UP_CAMERA_SPEED / 60,
    'Camera begins its upward pan when the hold delay elapses',
);
timing.update(1);
assertEqual(
    timing.lookUp.cameraOffset,
    SPELUNKY_LOOK_UP_CAMERA_DISTANCE,
    'Sustained look-up reaches its explicit camera distance',
);

timing.lookUp.setUp(false);
timing.update(1 / 60);
assertEqual(
    [timing.lookUp.phase, timing.lookUp.cameraOffset],
    [
        'exiting',
        SPELUNKY_LOOK_UP_CAMERA_DISTANCE
            - SPELUNKY_LOOK_UP_CAMERA_SPEED / 60,
    ],
    'Up release starts the exit and smoothly restores the camera',
);
timing.update(SPELUNKY_LOOK_UP_EXIT_TIME);
assertEqual(timing.lookUp.phase, 'inactive', 'HD exit timing restores the idle pose');
timing.update(1);
assertEqual(timing.lookUp.cameraOffset, 0, 'Camera restoration completes without residue');

const blockers: ReadonlyArray<readonly [string, (fixture: LookUpFixture) => void]> = [
    ['jumping', fixture => {
        fixture.entity.traits.get(Jump).phase = 'rising';
        fixture.entity.traits.get(Physics).grounded = false;
    }],
    ['ladder climbing', fixture => {
        fixture.entity.traits.get(LadderClimb).phase = 'clinging';
    }],
    ['ledge hanging', fixture => {
        fixture.entity.traits.get(LedgeHang).phase = 'hanging';
    }],
    ['carrying', fixture => {
        fixture.entity.traits.get(Carrier).carried = new Entity();
    }],
    ['hit reaction', fixture => {
        fixture.entity.traits.get(PlayerHit).start(1);
    }],
    ['unconsciousness', fixture => {
        fixture.entity.traits.get(PlayerDeath).phase = 'settled';
    }],
    ['death', fixture => {
        fixture.entity.traits.get(Killable).dead = true;
    }],
    ['horizontal input', fixture => {
        fixture.entity.traits.get(Go).dir = 1;
    }],
    ['down input', fixture => {
        fixture.entity.traits.get(Crouch).downHeld = true;
    }],
];

for (const [name, block] of blockers) {
    const fixture = createFixture();
    fixture.lookUp.setUp(true);
    fixture.update(SPELUNKY_LOOK_UP_ENTER_TIME);
    assertEqual(fixture.lookUp.phase, 'looking', `${name} setup reaches look-up`);
    block(fixture);
    fixture.update(1 / 60);
    assertEqual(
        fixture.lookUp.phase,
        'exiting',
        `${name} takes precedence and cancels look-up`,
    );
}

console.log('Grounded look-up timing and precedence regression passed');
