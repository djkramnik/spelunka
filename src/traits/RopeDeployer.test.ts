import AudioBoard from '../AudioBoard.js';
import Entity from '../Entity.js';
import {createRopeFactory} from '../entities/Rope.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import Killable from './Killable.js';
import PlayerDeath from './PlayerDeath.js';
import PlayerHit from './PlayerHit.js';
import RopeDeployer, {SPELUNKY_STARTING_ROPES} from './RopeDeployer.js';
import RopeDeployment from './RopeDeployment.js';
import Whip from './Whip.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const ropeFactory = createRopeFactory({
    drawFrame: (): void => {},
} as unknown as SpriteSheet, new AudioBoard());
const gameContext = {
    deltaTime: 1 / 60,
    entityFactory: {rope: ropeFactory},
} as unknown as GameContext;

function createPlayer(): {
    entity: Entity;
    deployer: RopeDeployer;
    killable: Killable;
    death: PlayerDeath;
    hit: PlayerHit;
    whip: Whip;
} {
    const entity = new Entity();
    const deployer = new RopeDeployer();
    const killable = new Killable();
    const death = new PlayerDeath();
    const hit = new PlayerHit();
    const whip = new Whip();
    entity.pos.set(33, 80);
    entity.size.set(14, 16);
    entity.addTrait(killable);
    entity.addTrait(death);
    entity.addTrait(hit);
    entity.addTrait(whip);
    entity.addTrait(deployer);
    return {entity, deployer, killable, death, hit, whip};
}

const player = createPlayer();
const level = new Level();
assertEqual(
    player.deployer.ropes,
    SPELUNKY_STARTING_ROPES,
    'The player starts with the Classic four-rope inventory',
);
assertEqual(player.deployer.requestDeploy(), true, 'The first S press queues one deployment');
assertEqual(player.deployer.requestDeploy(), false, 'A repeated press cannot queue a second rope');
player.deployer.update(player.entity, gameContext, level);
const deployed = [...level.entities][0];
if (!deployed) {
    throw new Error('Queued deployment did not add a rope to the level');
}
assertEqual(
    [
        player.deployer.ropes,
        level.entities.size,
        deployed.pos.x,
        deployed.pos.y,
        deployed.traits.get(RopeDeployment).phase,
    ],
    [3, 1, 36, 84, 'ascending'],
    'A valid request consumes one rope and launches it from the aligned player column',
);
player.deployer.update(player.entity, gameContext, level);
assertEqual(level.entities.size, 1, 'A consumed request is deterministic on later updates');

const blocked = createPlayer();
const blockedLevel = new Level();
const ceiling = new Matrix<{type: string}>();
ceiling.set(2, 4, {type: 'ground'});
blockedLevel.tileCollider.addGrid(ceiling);
assertEqual(
    blocked.deployer.deploy(blocked.entity, gameContext, blockedLevel),
    null,
    'A solid tile directly overhead rejects deployment',
);
assertEqual(
    [blocked.deployer.ropes, blockedLevel.entities.size],
    [SPELUNKY_STARTING_ROPES, 0],
    'An invalid overhead deployment does not consume inventory',
);

const empty = createPlayer();
empty.deployer.ropes = 0;
assertEqual(empty.deployer.requestDeploy(), false, 'No-ammo input is rejected immediately');
assertEqual(
    empty.deployer.deploy(empty.entity, gameContext, new Level()),
    null,
    'No-ammo direct deployment is also rejected',
);

const whipping = createPlayer();
whipping.whip.time = 0;
assertEqual(
    whipping.deployer.deploy(whipping.entity, gameContext, new Level()),
    null,
    'A whip in progress prevents overlapping rope deployment',
);
assertEqual(
    whipping.deployer.ropes,
    SPELUNKY_STARTING_ROPES,
    'Rejected action overlap preserves rope inventory',
);

const dead = createPlayer();
dead.killable.dead = true;
assertEqual(
    dead.deployer.deploy(dead.entity, gameContext, new Level()),
    null,
    'Dead players cannot deploy ropes',
);

const stunned = createPlayer();
stunned.hit.start(1);
assertEqual(
    stunned.deployer.deploy(stunned.entity, gameContext, new Level()),
    null,
    'A player in the hit-reaction stun cannot deploy ropes',
);

console.log('Rope input, ammo, invalid placement, and repeat handling passed');
